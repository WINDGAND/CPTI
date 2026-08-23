/**
 * CPTI 全站测评结果统计服务端逻辑（写入 / 读取 Supabase，供统计页展示）
 *
 * 职责：
 *   - 校验并归一化结果码与测评模式后，按客户端指纹哈希做滑动窗口限流，再记一条提交
 *   - 从 `stats_summary_view` 拉取汇总，交给 `buildStatsPayload` 组装公开统计载荷
 *
 * 限流：默认 15 分钟内同一 fingerprintHash 最多 3 条（WINDOW_MINUTES / MAX_SUBMITS_PER_WINDOW）
 * 表/视图：quiz_submissions、stats_summary_view
 * 副作用：查询并插入 quiz_submissions；失败时抛带 status 的 Error（本模块不挂 error.code）
 * 隐私：只存指纹哈希与类型码，不落原始 IP / UA
 */

import { createClient } from '@supabase/supabase-js'
import { buildStatsPayload, VALID_CODES, VALID_MODES } from '../api/_shared/stats-helpers.js'

/** 滑动窗口长度（分钟）；埋点服务复用同一默认值 */
export const WINDOW_MINUTES = 15
/** 同一指纹在窗口内最多提交条数 */
export const MAX_SUBMITS_PER_WINDOW = 3

/**
 * 构造携带 HTTP 状态码的 Error，供上层直接映射响应
 * 与 invite / feedback 不同，此处不挂 `error.code`
 *
 * @param {number} status  HTTP 状态码
 * @param {string} message 错误描述
 * @returns {Error} 带 status 的错误实例
 */
function createHttpError(status, message) {
  const error = new Error(message)
  error.status = status
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
 * @throws {Error} 环境变量缺失 → 500
 */
function getSupabaseAdminClient({ supabaseUrl, serviceRoleKey, fetchImpl }) {
  if (!supabaseUrl || !serviceRoleKey) {
    throw createHttpError(500, 'Supabase environment variables are missing')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchImpl ?? fetch },
  })
}

/**
 * 把汇总视图的一行转成「类型码 → 计数」映射
 * 视图列名为小写加 `_count`，如 `srod_count`
 *
 * @param {Object} row stats_summary_view 单行
 * @returns {Record<string, number>}
 */
function rowToCodeCountMap(row) {
  return Object.fromEntries(
    VALID_CODES.map((code) => [code, Number(row[`${code.toLowerCase()}_count`] ?? 0)])
  )
}

/**
 * 从 X-Forwarded-For 等可能含多跳的头里取出第一段（最靠近客户端的 IP）
 *
 * @param {string} [ipHeaderValue] 原始头值，可能是 `client, proxy1, proxy2`
 * @returns {string} 去空白后的第一段；缺省则为空串
 */
export function normalizeClientIp(ipHeaderValue) {
  return String(ipHeaderValue ?? '').split(',')[0].trim()
}

/**
 * 归一化统计上报请求体：结果码转大写，模式转小写
 * 合法性由 `submitStatsData` 再对照 VALID_CODES / VALID_MODES 校验
 *
 * @param {{ resultCode?: unknown, mode?: unknown }} body 原始 JSON
 * @returns {{ resultCode: string, mode: string }}
 */
export function normalizeSubmissionPayload(body) {
  const resultCode = String(body?.resultCode || '').toUpperCase()
  const mode = String(body?.mode || '').toLowerCase()
  return { resultCode, mode }
}

/**
 * 对任意文本做 SHA-256，输出小写十六进制，用作客户端指纹
 *
 * @param {string} text 通常是 IP + UA 拼接串
 * @returns {Promise<string>} 64 位十六进制摘要
 * @throws {Error} Web Crypto 不可用 → 500
 */
export async function sha256Hex(text) {
  const content = String(text ?? '')
  if (!globalThis.crypto?.subtle) {
    throw createHttpError(500, 'Web Crypto API is unavailable')
  }

  const bytes = new TextEncoder().encode(content)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * 读取公开统计摘要：汇总视图一行 → 类型计数 → 组装前端载荷
 *
 * @param {Object} opts
 * @param {string} opts.supabaseUrl
 * @param {string} opts.serviceRoleKey
 * @param {Function} [opts.fetchImpl] 自定义 fetch（测试注入）
 * @returns {Promise<object>} `buildStatsPayload` 的返回值
 * @throws {Error} 查询失败或无行 → 500
 * 副作用：只读查询 `stats_summary_view`
 */
export async function fetchStatsSummaryData({ supabaseUrl, serviceRoleKey, fetchImpl }) {
  const supabase = getSupabaseAdminClient({ supabaseUrl, serviceRoleKey, fetchImpl })
  const { data, error } = await supabase
    .from('stats_summary_view')
    .select('*')
    .single()

  if (error || !data) {
    throw createHttpError(500, 'Summary query failed')
  }

  const totalSubmissions = Number(data.total_submissions ?? 0)
  const updatedAt = String(data.updated_at ?? new Date().toISOString()).slice(0, 10)
  const codeToCount = rowToCodeCountMap(data)

  return buildStatsPayload(totalSubmissions, updatedAt, codeToCount)
}

/**
 * 限流通过后向 `quiz_submissions` 插入一条测评结果
 *
 * @param {Object} opts
 * @param {string} opts.supabaseUrl
 * @param {string} opts.serviceRoleKey
 * @param {Function} [opts.fetchImpl] 自定义 fetch（测试注入）
 * @param {string} opts.resultCode 16 型代码，须在 VALID_CODES 内
 * @param {string} opts.mode  single | dual
 * @param {string} opts.fingerprintHash 客户端指纹哈希
 * @param {number} [opts.windowMinutes]
 * @param {number} [opts.maxSubmitsPerWindow]
 * @returns {Promise<void>}
 * @throws {Error} 结果码/模式非法 → 400；超限 → 429；查询或插入失败 → 500
 * 副作用：写入 `quiz_submissions` 一行（source 固定为 `web`）
 */
export async function submitStatsData({
  supabaseUrl,
  serviceRoleKey,
  fetchImpl,
  resultCode,
  mode,
  fingerprintHash,
  windowMinutes = WINDOW_MINUTES,
  maxSubmitsPerWindow = MAX_SUBMITS_PER_WINDOW,
}) {
  if (!VALID_CODES.includes(resultCode)) {
    throw createHttpError(400, 'Invalid resultCode')
  }

  if (!VALID_MODES.includes(mode)) {
    throw createHttpError(400, 'Invalid mode')
  }

  const supabase = getSupabaseAdminClient({ supabaseUrl, serviceRoleKey, fetchImpl })
  const windowStartIso = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString()

  const { count, error: countError } = await supabase
    .from('quiz_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('fingerprint_hash', fingerprintHash)
    .gte('created_at', windowStartIso)

  if (countError) {
    throw createHttpError(500, 'Rate check failed')
  }

  if ((count ?? 0) >= maxSubmitsPerWindow) {
    throw createHttpError(429, 'Too many submissions in a short time')
  }

  const { error: insertError } = await supabase
    .from('quiz_submissions')
    .insert({
      result_code: resultCode,
      mode,
      fingerprint_hash: fingerprintHash,
      source: 'web',
    })

  if (insertError) {
    throw createHttpError(500, 'Insert failed')
  }
}

