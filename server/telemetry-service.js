/**
 * CPTI 匿名作答埋点服务端逻辑（写入 Supabase，供题库调优与维度分布观察）
 *
 * 职责：
 *   - 校验并归一化单人/双人作答埋点：模式、题量、每题选项、四维原始分
 *   - 按客户端指纹哈希做滑动窗口限流后，记一条提交并累加日聚合
 *
 * 限流：默认与统计提交共用窗口（WINDOW_MINUTES / MAX_SUBMITS_PER_WINDOW）
 * 表：telemetry_submissions；RPC：increment_question_choice_agg、increment_dimension_score_agg
 * 副作用：查询并插入埋点表、调用聚合 RPC；失败时抛带 status / code 的 Error
 * 隐私：只存指纹哈希与聚合计数，不落原始 IP / UA
 */

import { createClient } from '@supabase/supabase-js'
import { WINDOW_MINUTES, MAX_SUBMITS_PER_WINDOW } from './stats-service.js'

/** 允许的测评模式：单人速通 / 双人拼图 */
const VALID_MODES = ['single', 'dual']
/** 四维原始分必须齐全：空间 / 情感 / 节奏 / 冲突（与 PRD 2.1 一致） */
const VALID_DIMENSIONS = ['SI', 'RP', 'OF', 'DA']

/**
 * 构造携带 HTTP 状态码与业务错误码的 Error，供上层直接映射响应
 *
 * @param {number} status  HTTP 状态码
 * @param {string} message 错误描述
 * @param {string} code    业务错误码（供前端分流）
 * @returns {Error} 带 status / code 的错误实例
 */
function createHttpError(status, message, code) {
  const error = new Error(message)
  error.status = status
  error.code = code
  return error
}

/**
 * 创建 Supabase 管理员客户端（service role，绕过 RLS）
 * 服务端不持久化会话、不自动刷新 token
 *
 * @param {Object} opts
 * @param {string} opts.supabaseUrl     Supabase 项目 URL
 * @param {string} opts.serviceRoleKey  service role key
 * @param {Function} [opts.fetchImpl]   自定义 fetch（测试注入）
 * @returns {SupabaseClient}
 * @throws {Error} 环境变量缺失 → env-missing（500）
 */
function getSupabaseAdminClient({ supabaseUrl, serviceRoleKey, fetchImpl }) {
  if (!supabaseUrl || !serviceRoleKey) {
    throw createHttpError(500, 'Supabase environment variables are missing', 'env-missing')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchImpl ?? fetch },
  })
}

/**
 * 归一化埋点请求体：模式、题量、answers 映射、四维整数分
 *
 * @param {{ mode?: unknown, questionCount?: unknown, answers?: unknown, dimensionScores?: unknown }} body 原始 JSON
 * @returns {{ mode: string, questionCount: number, answers: Record<string, number>, dimensionScores: Record<string, number> }}
 * @throws {Error} 字段非法时抛 400，并带对应 code（invalid-mode 等）
 */
function normalizeTelemetryPayload(body) {
  const mode = String(body?.mode || '').toLowerCase()
  const questionCount = Number(body?.questionCount)
  const answers = body?.answers
  const dimensionScores = body?.dimensionScores

  if (!VALID_MODES.includes(mode)) {
    throw createHttpError(400, 'Invalid mode', 'invalid-mode')
  }

  // 题量须为正整数，200 为防刷上限（大于当前 32 题题库）
  if (!Number.isInteger(questionCount) || questionCount <= 0 || questionCount > 200) {
    throw createHttpError(400, 'Invalid questionCount', 'invalid-question-count')
  }

  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    throw createHttpError(400, 'Invalid answers payload', 'invalid-answers')
  }

  const entries = Object.entries(answers)
  // 条目数必须与声明题量一致，避免少答/多塞脏数据进入聚合
  if (entries.length !== questionCount) {
    throw createHttpError(400, 'Question count mismatch', 'question-count-mismatch')
  }

  const normalizedAnswers = {}
  for (const [questionIdRaw, selectedIndexRaw] of entries) {
    const questionId = String(questionIdRaw || '').trim()
    const selectedIndex = Number(selectedIndexRaw)
    if (!questionId) {
      throw createHttpError(400, 'Invalid questionId', 'invalid-question-id')
    }
    // 李克特 7 点：0=完全同意 … 6=完全不同意（与 PRD 2.2 选项序一致）
    if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex > 6) {
      throw createHttpError(400, `Invalid answer: ${questionId}`, 'invalid-answer-value')
    }
    normalizedAnswers[questionId] = selectedIndex
  }

  if (!dimensionScores || typeof dimensionScores !== 'object' || Array.isArray(dimensionScores)) {
    throw createHttpError(400, 'Invalid dimensionScores payload', 'invalid-dimension-scores')
  }

  const normalizedDimensionScores = {}
  for (const dimension of VALID_DIMENSIONS) {
    const value = Number(dimensionScores?.[dimension])
    if (!Number.isInteger(value)) {
      throw createHttpError(400, `Invalid dimension score: ${dimension}`, 'invalid-dimension-score')
    }
    // 宽松夹取：按 200 题 × 每题 ±3 估算，单维绝对值不会到 600
    if (value < -600 || value > 600) {
      throw createHttpError(400, `Out of range dimension score: ${dimension}`, 'dimension-score-out-of-range')
    }
    normalizedDimensionScores[dimension] = value
  }

  return {
    mode,
    questionCount,
    answers: normalizedAnswers,
    dimensionScores: normalizedDimensionScores,
  }
}

/**
 * 按指纹哈希查询窗口内埋点条数，超限则 429
 *
 * @param {SupabaseClient} supabase
 * @param {string} fingerprintHash  IP+UA 的 SHA-256 十六进制
 * @param {number} windowMinutes    滑动窗口（分钟）
 * @param {number} maxSubmitsPerWindow 窗口内上限
 * @returns {Promise<void>}
 * @throws {Error} 查询失败 500；超限 telemetry-rate-limited（429）
 */
async function enforceTelemetryRateLimit(supabase, fingerprintHash, windowMinutes, maxSubmitsPerWindow) {
  const windowStartIso = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString()
  const { count, error } = await supabase
    .from('telemetry_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('fingerprint_hash', fingerprintHash)
    .gte('created_at', windowStartIso)

  if (error) {
    throw createHttpError(500, 'Rate check failed', 'telemetry-rate-check-failed')
  }

  if ((count ?? 0) >= maxSubmitsPerWindow) {
    throw createHttpError(429, 'Too many telemetry submissions in a short time', 'telemetry-rate-limited')
  }
}

/** @returns {string} 当天 UTC 日期 YYYY-MM-DD，用作日聚合分区键 */
function todayUtcDateString() {
  // YYYY-MM-DD (UTC)
  return new Date().toISOString().slice(0, 10)
}

/**
 * 对外导出的请求体归一化入口（与内部 normalizeTelemetryPayload 等价）
 *
 * @param {unknown} body 原始 JSON
 * @returns {{ mode: string, questionCount: number, answers: Record<string, number>, dimensionScores: Record<string, number> }}
 * @throws {Error} 同 normalizeTelemetryPayload
 */
export function normalizeTelemetrySubmissionPayload(body) {
  return normalizeTelemetryPayload(body)
}

/**
 * 校验通过后写入一条埋点，并按题/按维累加当日聚合计数
 *
 * @param {Object} opts
 * @param {string} opts.supabaseUrl
 * @param {string} opts.serviceRoleKey
 * @param {Function} [opts.fetchImpl] 自定义 fetch（测试注入）
 * @param {string} opts.fingerprintHash 客户端指纹哈希
 * @param {string} opts.mode  single | dual
 * @param {number} opts.questionCount 已校验题量（签名保留；聚合循环用 answers 长度）
 * @param {Record<string, number>} opts.answers 题目 id → 选项下标 0–6
 * @param {Record<string, number>} opts.dimensionScores 四维原始分
 * @param {number} [opts.windowMinutes]
 * @param {number} [opts.maxSubmitsPerWindow]
 * @returns {Promise<void>}
 * @throws {Error} 限流 429；插入/RPC 失败 500
 *
 * 副作用：写入 telemetry_submissions，并调用两条 increment_* RPC
 */
export async function submitTelemetryData({
  supabaseUrl,
  serviceRoleKey,
  fetchImpl,
  fingerprintHash,
  mode,
  questionCount,
  answers,
  dimensionScores,
  windowMinutes = WINDOW_MINUTES,
  maxSubmitsPerWindow = MAX_SUBMITS_PER_WINDOW,
}) {
  const supabase = getSupabaseAdminClient({ supabaseUrl, serviceRoleKey, fetchImpl })

  await enforceTelemetryRateLimit(supabase, fingerprintHash, windowMinutes, maxSubmitsPerWindow)

  const { error: insertError } = await supabase
    .from('telemetry_submissions')
    .insert({
      mode,
      fingerprint_hash: fingerprintHash,
    })

  if (insertError) {
    throw createHttpError(500, 'Failed to record telemetry submission', 'telemetry-insert-failed')
  }

  const day = todayUtcDateString()

  // 按题累加选项分布（日 × 模式 × 题号 × 选项）
  for (const [questionId, selectedIndex] of Object.entries(answers)) {
    const { error } = await supabase.rpc('increment_question_choice_agg', {
      p_day: day,
      p_mode: mode,
      p_question_id: questionId,
      p_selected_index: selectedIndex,
      p_delta: 1,
    })
    if (error) {
      throw createHttpError(500, 'Failed to update question choice aggregate', 'telemetry-agg-question-failed')
    }
  }

  // 按维累加原始分分布（日 × 模式 × 维度 × 分值）
  for (const [dimension, score] of Object.entries(dimensionScores)) {
    const { error } = await supabase.rpc('increment_dimension_score_agg', {
      p_day: day,
      p_mode: mode,
      p_dimension: dimension,
      p_score: score,
      p_delta: 1,
    })
    if (error) {
      throw createHttpError(500, 'Failed to update dimension score aggregate', 'telemetry-agg-dimension-failed')
    }
  }

  // questionCount 已在归一化阶段校验；此处引用以免签名演进时被 eslint 标为未使用
  void questionCount
}

