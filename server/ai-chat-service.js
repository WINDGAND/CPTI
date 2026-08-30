/**
 * CPTI AI 关系助手 · 服务端对话编排（DeepSeek + 额度控制）
 *
 * 职责：
 *   - 校验请求体：16 型上下文、最近若干条消息、最后一条必须是用户
 *   - 按客户端指纹做进程内突发限流，再叠加日额度 / 全站日额度
 *   - 调用 DeepSeek Chat Completions，支持一次性 JSON 与 SSE 流式回传
 *
 * 额度：默认见 DEFAULT_AI_CHAT_QUOTA；生产走 reserve/release_ai_chat_quota RPC，测试可注入内存 store
 * 副作用：可能写内存限额 Map、调用 Supabase RPC、对外 POST DeepSeek
 * 失败：抛带 status / code 的 Error；流尚未开始失败时会归还已预占额度
 */

import { createClient } from '@supabase/supabase-js'
import { VALID_CODES } from '../api/_shared/stats-helpers.js'

/** 单条消息正文上限（与前端输入条 / 气泡编辑一致） */
const MAX_MESSAGE_LENGTH = 800
/** 送给模型的历史窗口：只取最近若干条，控制 prompt 体积 */
const MAX_CONTEXT_MESSAGES = 6
const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com'
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-v4-flash'
/** 单次补全 / 流式请求的默认超时（毫秒） */
const DEFAULT_TIMEOUT_MS = 20000

/**
 * 默认额度：突发窗口 + 单指纹日上限 + 全站日上限
 * 可用环境变量或 quotaConfig 覆盖；窗口按上海时区自然日切分
 */
export const DEFAULT_AI_CHAT_QUOTA = {
  burstLimit: 20,
  burstWindowSec: 900,
  dailyLimit: 50,
  globalDailyLimit: 3000,
}

/** 进程内突发计数（无 Supabase 时的兜底；多实例不共享） */
const localBurstState = new Map()

/**
 * 构造携带 HTTP 状态码与业务错误码的 Error，供上层直接映射响应
 *
 * @param {number} status HTTP 状态码
 * @param {string} message 错误描述
 * @param {string} code 业务错误码（供前端分流）
 * @returns {Error} 带 status / code 的错误实例
 */
function createHttpError(status, message, code) {
  const error = new Error(message)
  error.status = status
  error.code = code
  return error
}

/**
 * 压空白并截断，避免超长上下文撑爆 prompt
 *
 * @param {unknown} value
 * @param {number} [maxLength=500]
 * @returns {string}
 */
function compactText(value, maxLength = 500) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

/**
 * 只允许 user / assistant；其它角色一律 400
 *
 * @param {unknown} role
 * @returns {'user'|'assistant'}
 */
function normalizeRole(role) {
  const normalized = String(role || '').toLowerCase()
  if (!['user', 'assistant'].includes(normalized)) {
    throw createHttpError(400, 'Invalid message role', 'invalid-message-role')
  }
  return normalized
}

/**
 * 清洗单条消息：先多截 1 字再判超长，避免 trim 后刚好卡在上限上漏检
 *
 * @param {object} rawMessage
 * @returns {{ role: 'user'|'assistant', content: string }}
 */
function normalizeMessage(rawMessage) {
  const role = normalizeRole(rawMessage?.role)
  const content = compactText(rawMessage?.content, MAX_MESSAGE_LENGTH + 1)
  if (!content) {
    throw createHttpError(400, 'Message content is required', 'message-content-required')
  }
  if (content.length > MAX_MESSAGE_LENGTH) {
    throw createHttpError(400, 'Message too long', 'message-too-long')
  }
  return { role, content }
}

/**
 * 归一化测评上下文：类型码必须是 16 型之一；mode 非 dual 一律当 single
 *
 * @param {object} rawContext
 * @returns {object} 截断后的上下文（优势/挑战/建议各最多 3 条）
 */
function normalizeContext(rawContext) {
  const code = String(rawContext?.code || '').trim().toUpperCase()
  // 双人拼图才带 alignment / players；其它取值都按单人速通处理
  const mode = rawContext?.mode === 'dual' ? 'dual' : 'single'

  if (!VALID_CODES.includes(code)) {
    throw createHttpError(400, 'Invalid CPTI context code', 'invalid-context-code')
  }

  return {
    mode,
    code,
    title: compactText(rawContext?.title, 80),
    slogan: compactText(rawContext?.slogan, 120),
    percentages: rawContext?.percentages && typeof rawContext.percentages === 'object'
      ? rawContext.percentages
      : {},
    strengths: Array.isArray(rawContext?.strengths) ? rawContext.strengths.slice(0, 3) : [],
    challenges: Array.isArray(rawContext?.challenges) ? rawContext.challenges.slice(0, 3) : [],
    conflictPattern: {
      pattern: compactText(rawContext?.conflictPattern?.pattern, 420),
      resolution: compactText(rawContext?.conflictPattern?.resolution, 420),
    },
    tipsForCouple: Array.isArray(rawContext?.tipsForCouple) ? rawContext.tipsForCouple.slice(0, 3) : [],
    players: normalizePlayers(rawContext?.players),
    alignment: normalizeAlignment(rawContext?.alignment),
  }
}

/**
 * 双人报告里甲乙双方各一条；非数组当空，最多保留 2 人
 *
 * @param {unknown} rawPlayers
 * @returns {Array<{label: string, code: string, title: string}>}
 */
function normalizePlayers(rawPlayers) {
  if (!Array.isArray(rawPlayers)) return []
  return rawPlayers.slice(0, 2).map((player) => {
    const code = String(player?.code || '').trim().toUpperCase()
    if (!VALID_CODES.includes(code)) {
      throw createHttpError(400, 'Invalid CPTI player code', 'invalid-player-code')
    }
    return {
      label: compactText(player?.label, 20),
      code,
      title: compactText(player?.title, 80),
    }
  })
}

/**
 * 对齐度一侧：共识分钳到 0–100 整数；非法对象回落空标题 + 0
 *
 * @param {unknown} rawSide
 * @returns {{ title: string, consensus: number }}
 */
function normalizeAlignmentSide(rawSide) {
  if (!rawSide || typeof rawSide !== 'object') return { title: '', consensus: 0 }
  const consensus = Number(rawSide.consensus ?? 0)
  return {
    title: compactText(rawSide.title, 40),
    consensus: Number.isFinite(consensus) ? Math.max(0, Math.min(100, Math.round(consensus))) : 0,
  }
}

/**
 * 最对齐 / 最错位两个维度；缺对象则整段对齐信息丢弃（单人报告常见）
 *
 * @param {unknown} rawAlignment
 * @returns {{ mostAligned: object, mostMisaligned: object } | null}
 */
function normalizeAlignment(rawAlignment) {
  if (!rawAlignment || typeof rawAlignment !== 'object') return null
  return {
    mostAligned: normalizeAlignmentSide(rawAlignment.mostAligned),
    mostMisaligned: normalizeAlignmentSide(rawAlignment.mostMisaligned),
  }
}

/**
 * 校验并归一化 AI 对话请求体
 *
 * @param {{ context?: object, messages?: unknown }} body 原始 JSON
 * @returns {{ context: object, messages: Array<{role: string, content: string}> }}
 * @throws {Error} 缺消息、末条非用户、类型码非法等 → 400
 */
export function normalizeAiChatPayload(body) {
  const context = normalizeContext(body?.context)
  const messages = Array.isArray(body?.messages)
    ? body.messages.map(normalizeMessage).slice(-MAX_CONTEXT_MESSAGES)
    : []

  if (messages.length === 0) {
    throw createHttpError(400, 'At least one message is required', 'messages-required')
  }

  // 模型补全必须以用户句收尾，避免空转或续写助手自己
  if (messages[messages.length - 1].role !== 'user') {
    throw createHttpError(400, 'Last message must be from user', 'last-message-not-user')
  }

  return { context, messages }
}

function formatContextForPrompt(context) {
  return JSON.stringify({
    mode: context.mode,
    code: context.code,
    title: context.title,
    slogan: context.slogan,
    percentages: context.percentages,
    strengths: context.strengths,
    challenges: context.challenges,
    conflictPattern: context.conflictPattern,
    tipsForCouple: context.tipsForCouple,
    players: context.players,
    alignment: context.alignment,
  }, null, 2)
}

/**
 * 拼 DeepSeek messages：系统提示（含结构化 CPTI 上下文）+ 用户历史
 *
 * @param {{ context: object, messages: Array<{role: string, content: string}> }} args
 * @returns {Array<{role: string, content: string}>}
 */
export function buildDeepSeekMessages({ context, messages }) {
  const systemPrompt = [
    '你是 CPTI 亲密光谱测试产品内的 AI 关系助手。',
    '你的任务是基于用户当前 CPTI 测试结果，帮助情侣把相处问题说清楚，给出温暖、具体、低压力、可执行的沟通建议。',
    '回答必须结合 CPTI 类型、维度倾向、优势、挑战或冲突模式，避免泛泛而谈。',
    '不要做心理诊断，不要给医疗、法律、危机干预建议，不要武断建议分手，不要教用户操控伴侣。',
    '如果用户描述人身安全、自伤、自杀、暴力威胁等危机场景，先建议立刻联系现实中的可信赖人士、当地紧急服务或专业机构。',
    '表达风格：简体中文，像温柔但清醒的关系教练。',
    '输出结构（必须遵守）：',
    '1. 先用 1-2 句话总述核心观点。',
    '2. 中间用 2-4 条编号要点展开，每条单独一行，格式为「1. 小标题：具体说明」。',
    '3. 最后用 1 句话给出今晚就能试的小建议。',
    '4. 段落之间必须空一行；禁止把多个要点挤在同一段里；不要输出 # 标题语法。',
    '',
    '当前 CPTI 关系上下文如下：',
    formatContextForPrompt(context),
  ].join('\n')

  return [
    { role: 'system', content: systemPrompt },
    ...messages,
  ]
}

/**
 * 清洗助手正文：统一换行、压掉连续空行、截断
 *
 * @param {unknown} content 模型原文
 * @param {number} [maxLength=4000]
 * @returns {string}
 * @throws {Error} 清洗后为空 → ai-empty-response（502）
 */
export function normalizeAssistantText(content, maxLength = 4000) {
  const text = String(content ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength)

  if (!text) {
    throw createHttpError(502, 'AI response is empty', 'ai-empty-response')
  }

  return text
}

/**
 * 从非流式 Chat Completions JSON 取出第一条助手正文
 *
 * @param {{ choices?: Array<{ message?: { content?: string } }> }} payload
 * @returns {string}
 */
export function parseDeepSeekResponse(payload) {
  return normalizeAssistantText(payload?.choices?.[0]?.message?.content)
}

/**
 * 解析 DeepSeek SSE：按行拆 `data:` JSON，yield delta.content
 *
 * @param {Response} response fetch 流式响应
 * @yields {string} 增量文本
 * @throws {Error} 响应无 body → deepseek-stream-missing（502）
 */
export async function* iterateDeepSeekStream(response) {
  if (!response?.body) {
    throw createHttpError(502, 'DeepSeek stream body is missing', 'deepseek-stream-missing')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue

      const data = trimmed.slice(5).trim()
      if (!data || data === '[DONE]') continue

      try {
        const parsed = JSON.parse(data)
        const delta = parsed?.choices?.[0]?.delta?.content
        if (delta) yield delta
      } catch {
        // 半包或非 JSON 的 data 行直接跳过，等后续完整块
      }
    }
  }
}

/**
 * 解析正整数配置；非有限或 ≤0 时用 fallback（环境变量常为空串）
 *
 * @param {unknown} value
 * @param {number} fallback
 * @returns {number}
 */
function parsePositiveInt(value, fallback) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.floor(parsed)
}

/**
 * 从环境变量读额度覆盖项
 *
 * @param {Record<string, string|undefined>} [env]
 * @returns {{ burstLimit: number, burstWindowSec: number, dailyLimit: number, globalDailyLimit: number }}
 */
export function parseAiChatQuotaConfig(env = {}) {
  return {
    burstLimit: parsePositiveInt(env.AI_CHAT_BURST_LIMIT, DEFAULT_AI_CHAT_QUOTA.burstLimit),
    burstWindowSec: parsePositiveInt(env.AI_CHAT_BURST_WINDOW_SEC, DEFAULT_AI_CHAT_QUOTA.burstWindowSec),
    dailyLimit: parsePositiveInt(env.AI_CHAT_DAILY_LIMIT, DEFAULT_AI_CHAT_QUOTA.dailyLimit),
    globalDailyLimit: parsePositiveInt(env.AI_CHAT_GLOBAL_DAILY_LIMIT, DEFAULT_AI_CHAT_QUOTA.globalDailyLimit),
  }
}

/**
 * 上海时区的自然日键（YYYY-MM-DD），用于日额度切分，避免 UTC 午夜错位
 *
 * @param {number} [nowMs=Date.now()]
 * @returns {string}
 */
export function shanghaiDayKey(nowMs = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(nowMs))
}

/**
 * 距下一上海 0 点的秒数，作为 429 的 Retry-After
 *
 * @param {number} [nowMs=Date.now()]
 * @returns {number} 至少 1 秒
 */
export function secondsUntilNextShanghaiMidnight(nowMs = Date.now()) {
  const [year, month, day] = shanghaiDayKey(nowMs).split('-').map(Number)
  // Date.UTC 按 UTC 解释日历日，再减 8 小时得到上海次日 0 点的 UTC 毫秒
  const nextMidnightUtcMs = Date.UTC(year, month - 1, day + 1, 0, 0, 0) - 8 * 60 * 60 * 1000
  return Math.max(1, Math.ceil((nextMidnightUtcMs - nowMs) / 1000))
}

function mergeQuotaConfig(quotaConfig = {}) {
  return {
    burstLimit: parsePositiveInt(quotaConfig.burstLimit, DEFAULT_AI_CHAT_QUOTA.burstLimit),
    burstWindowSec: parsePositiveInt(quotaConfig.burstWindowSec, DEFAULT_AI_CHAT_QUOTA.burstWindowSec),
    dailyLimit: parsePositiveInt(quotaConfig.dailyLimit, DEFAULT_AI_CHAT_QUOTA.dailyLimit),
    globalDailyLimit: parsePositiveInt(quotaConfig.globalDailyLimit, DEFAULT_AI_CHAT_QUOTA.globalDailyLimit),
  }
}

/**
 * 进程内额度账本（测试或无 RPC 时用）：按上海日切分全站计数 + 单指纹日/突发计数
 *
 * @returns {{ reserve: Function, release: Function, inspect: Function }}
 * 副作用：读写闭包内 Map；reserve 成功会先占额度，失败路径须调用 release
 */
export function createMemoryQuotaStore() {
  const dailyMap = new Map()
  const globalMap = new Map()

  function dailyKey(fingerprintHash, day) {
    return `${fingerprintHash}|${day}`
  }

  return {
    reserve({ fingerprintHash, limits, nowMs }) {
      const day = shanghaiDayKey(nowMs)
      const globalCount = globalMap.get(day) || 0
      if (globalCount >= limits.globalDailyLimit) {
        return {
          ok: false,
          code: 'ai-chat-global-limited',
          retry_after_sec: secondsUntilNextShanghaiMidnight(nowMs),
        }
      }

      const key = dailyKey(fingerprintHash, day)
      const row = dailyMap.get(key) || { count: 0, burstWindowStartMs: nowMs, burstCount: 0 }
      if (row.count >= limits.dailyLimit) {
        return {
          ok: false,
          code: 'ai-chat-daily-limited',
          retry_after_sec: secondsUntilNextShanghaiMidnight(nowMs),
        }
      }

      let burstCount = row.burstCount
      let burstWindowStartMs = row.burstWindowStartMs
      // 突发窗口过期后清零，避免旧窗口计数一直占额度
      if (burstWindowStartMs == null || nowMs - burstWindowStartMs >= limits.burstWindowSec * 1000) {
        burstCount = 0
        burstWindowStartMs = nowMs
      }

      if (burstCount >= limits.burstLimit) {
        return {
          ok: false,
          code: 'ai-chat-rate-limited',
          retry_after_sec: Math.max(
            1,
            Math.ceil((limits.burstWindowSec * 1000 - (nowMs - burstWindowStartMs)) / 1000),
          ),
        }
      }

      globalMap.set(day, globalCount + 1)
      dailyMap.set(key, {
        count: row.count + 1,
        burstWindowStartMs,
        burstCount: burstCount + 1,
      })
      return { ok: true, code: null, retry_after_sec: 0 }
    },
    release({ fingerprintHash, nowMs }) {
      const day = shanghaiDayKey(nowMs)
      const globalCount = globalMap.get(day) || 0
      if (globalCount > 0) globalMap.set(day, globalCount - 1)

      const key = dailyKey(fingerprintHash, day)
      const row = dailyMap.get(key)
      if (!row) return { ok: true }

      dailyMap.set(key, {
        count: Math.max(0, row.count - 1),
        burstWindowStartMs: row.burstWindowStartMs,
        burstCount: Math.max(0, row.burstCount - 1),
      })
      return { ok: true }
    },
    inspect({ fingerprintHash, nowMs }) {
      const day = shanghaiDayKey(nowMs)
      const key = dailyKey(fingerprintHash, day)
      return {
        global: globalMap.get(day) || 0,
        daily: dailyMap.get(key) || { count: 0, burstWindowStartMs: 0, burstCount: 0 },
      }
    },
  }
}

/**
 * 创建 Supabase 管理员客户端（service role，绕过 RLS）
 *
 * @param {Object} opts
 * @param {string} opts.supabaseUrl
 * @param {string} opts.serviceRoleKey
 * @param {Function} [opts.fetchImpl] 测试注入
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
 * 把额度拒绝结果转成带 retryAfterSec 的 HTTP Error
 *
 * @param {{ code?: string, retry_after_sec?: number }} result
 * @returns {Error}
 */
function createQuotaError(result) {
  const code = result?.code || 'ai-chat-rate-limited'
  const messages = {
    'ai-chat-rate-limited': 'Too many AI chat requests in a short time',
    'ai-chat-daily-limited': 'Daily AI chat quota exceeded',
    'ai-chat-global-limited': 'Global AI chat quota exceeded',
    'fingerprint-required': 'Request fingerprint is required',
  }
  const status = code === 'fingerprint-required' ? 400 : 429
  const error = createHttpError(status, messages[code] || messages['ai-chat-rate-limited'], code)
  error.retryAfterSec = Number(result?.retry_after_sec) || 0
  return error
}

/**
 * 进程内突发窗口限流：过期条目先清掉，超限抛 429
 *
 * @param {object} args
 * @param {string} args.fingerprintHash 客户端指纹哈希
 * @param {Map} [args.state=localBurstState]
 * @param {number} [args.nowMs]
 * @param {number} [args.windowMs]
 * @param {number} [args.maxRequests]
 * @returns {void}
 * @throws {Error} 缺指纹 → 400；超限 → 429 ai-chat-rate-limited
 * 副作用：读写传入的 state Map
 */
export function assertAiChatRateLimit({
  fingerprintHash,
  state = localBurstState,
  nowMs = Date.now(),
  windowMs = DEFAULT_AI_CHAT_QUOTA.burstWindowSec * 1000,
  maxRequests = DEFAULT_AI_CHAT_QUOTA.burstLimit,
}) {
  const key = String(fingerprintHash || '').trim()
  if (!key) {
    throw createHttpError(400, 'Request fingerprint is required', 'fingerprint-required')
  }

  for (const [storedKey, record] of state.entries()) {
    if (nowMs - record.windowStartMs >= windowMs) {
      state.delete(storedKey)
    }
  }

  const current = state.get(key)
  if (!current || nowMs - current.windowStartMs >= windowMs) {
    state.set(key, { windowStartMs: nowMs, count: 1 })
    return
  }

  if (current.count >= maxRequests) {
    throw createHttpError(429, 'Too many AI chat requests in a short time', 'ai-chat-rate-limited')
  }

  current.count += 1
  state.set(key, current)
}

/**
 * 归还一次进程内突发计数（持久额度未占上时回滚）
 *
 * @param {{ fingerprintHash?: string, state?: Map }} args
 * @returns {void}
 * 副作用：可能递减 state 中的 count
 */
export function releaseLocalAiChatBurst({ fingerprintHash, state = localBurstState }) {
  const key = String(fingerprintHash || '').trim()
  if (!key) return
  const current = state.get(key)
  if (!current || current.count <= 0) return
  current.count -= 1
  state.set(key, current)
}

async function rpcReserveQuota(options, fingerprintHash, limits) {
  const supabase = options.supabase || getSupabaseAdminClient(options)
  const { data, error } = await supabase.rpc('reserve_ai_chat_quota', {
    p_fingerprint: fingerprintHash,
    p_burst_limit: limits.burstLimit,
    p_burst_window_sec: limits.burstWindowSec,
    p_daily_limit: limits.dailyLimit,
    p_global_daily_limit: limits.globalDailyLimit,
  })
  if (error) {
    throw createHttpError(503, error.message || 'Quota RPC failed', 'ai-chat-quota-unavailable')
  }
  return data
}

async function rpcReleaseQuota(options, fingerprintHash) {
  const supabase = options.supabase || getSupabaseAdminClient(options)
  const { error } = await supabase.rpc('release_ai_chat_quota', {
    p_fingerprint: fingerprintHash,
  })
  if (error) {
    throw createHttpError(503, error.message || 'Quota release RPC failed', 'ai-chat-quota-unavailable')
  }
}

/**
 * 先占本地突发额度，再占持久额度（内存 store 或 Supabase RPC）
 *
 * @param {object} options
 * @param {string} options.fingerprintHash
 * @param {object} [options.quotaConfig]
 * @param {object} [options.quotaStore] 注入则不走 RPC
 * @param {object} [options.supabase]
 * @param {Map} [options.localState]
 * @param {number} [options.nowMs]
 * @returns {Promise<void>}
 * @throws {Error} 429 / 400 / 503；持久层失败时回滚本地突发计数
 * 副作用：reserve RPC 或内存 store 预占；失败路径 release 本地突发
 */
export async function reserveAiChatQuota(options) {
  const fingerprintHash = String(options?.fingerprintHash || '').trim()
  if (!fingerprintHash) {
    throw createHttpError(400, 'Request fingerprint is required', 'fingerprint-required')
  }

  const limits = mergeQuotaConfig(options.quotaConfig)
  const nowMs = options.nowMs ?? Date.now()
  const localState = options.localState ?? localBurstState

  assertAiChatRateLimit({
    fingerprintHash,
    state: localState,
    nowMs,
    windowMs: limits.burstWindowSec * 1000,
    maxRequests: limits.burstLimit,
  })

  let persistentOk = false
  try {
    const result = options.quotaStore
      ? options.quotaStore.reserve({ fingerprintHash, limits, nowMs })
      : await rpcReserveQuota(options, fingerprintHash, limits)

    if (!result?.ok) {
      throw createQuotaError(result)
    }
    persistentOk = true
  } catch (error) {
    // 业务拒绝原样抛出；未知错误统一成额度服务不可用，避免泄露内部细节
    if (error?.status === 429 || error?.code === 'fingerprint-required') throw error
    if (error?.code === 'env-missing' || error?.code === 'ai-chat-quota-unavailable') throw error
    throw createHttpError(503, 'AI chat quota service is unavailable', 'ai-chat-quota-unavailable')
  } finally {
    if (!persistentOk) {
      releaseLocalAiChatBurst({ fingerprintHash, state: localState })
    }
  }
}

/**
 * 归还本地突发 + 持久额度；持久层失败只打日志，不阻断主流程
 *
 * @param {object} options 与 reserveAiChatQuota 相同的连接/store 字段
 * @returns {Promise<void>}
 * 副作用：release RPC 或内存 store；缺指纹时直接返回
 */
export async function releaseAiChatQuota(options) {
  const fingerprintHash = String(options?.fingerprintHash || '').trim()
  if (!fingerprintHash) return

  const nowMs = options.nowMs ?? Date.now()
  const localState = options.localState ?? localBurstState
  releaseLocalAiChatBurst({ fingerprintHash, state: localState })

  try {
    if (options.quotaStore) {
      options.quotaStore.release({ fingerprintHash, nowMs })
      return
    }
    await rpcReleaseQuota(options, fingerprintHash)
  } catch (error) {
    console.warn('[ai-chat] failed to release quota', error)
  }
}

function buildEndpoint(baseUrl) {
  return `${String(baseUrl || DEFAULT_DEEPSEEK_BASE_URL).replace(/\/+$/, '')}/chat/completions`
}

function buildDeepSeekRequestBody(normalized, model, stream = false) {
  return {
    model: model || DEFAULT_DEEPSEEK_MODEL,
    messages: buildDeepSeekMessages(normalized),
    temperature: 0.7,
    max_tokens: 900,
    stream,
  }
}

async function postDeepSeek({
  apiKey,
  baseUrl,
  model,
  fetchImpl,
  normalized,
  stream = false,
  signal,
}) {
  return (fetchImpl ?? fetch)(buildEndpoint(baseUrl), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildDeepSeekRequestBody(normalized, model, stream)),
    signal,
  })
}

function quotaCallOptions(args) {
  return {
    fingerprintHash: args.fingerprintHash,
    supabaseUrl: args.supabaseUrl,
    serviceRoleKey: args.serviceRoleKey,
    supabase: args.supabase,
    quotaStore: args.quotaStore,
    quotaConfig: args.quotaConfig,
    localState: args.localState,
    nowMs: args.nowMs,
    fetchImpl: args.fetchImpl,
  }
}

/**
 * 一次性（非流式）补全：占额度 → POST DeepSeek → 解析完整助手回复
 *
 * @param {object} args
 * @param {string} args.apiKey DeepSeek API Key
 * @param {string} [args.baseUrl]
 * @param {string} [args.model]
 * @param {Function} [args.fetchImpl]
 * @param {object} args.body 原始请求体（context + messages）
 * @param {string} args.fingerprintHash
 * @param {number} [args.timeoutMs]
 * @returns {Promise<{ message: string }>}
 * @throws {Error} 缺 key / 超时 / DeepSeek 失败 / 空回复；未开始成功解析前会归还额度
 * 副作用：reserve 额度、对外 POST；成功后额度不在此释放（计一次消耗）
 */
export async function requestAiChatCompletion({
  apiKey,
  baseUrl = DEFAULT_DEEPSEEK_BASE_URL,
  model = DEFAULT_DEEPSEEK_MODEL,
  fetchImpl,
  body,
  fingerprintHash,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  supabaseUrl,
  serviceRoleKey,
  supabase,
  quotaStore,
  quotaConfig,
  localState,
  nowMs,
}) {
  if (!apiKey) {
    throw createHttpError(500, 'DeepSeek API key is missing', 'deepseek-key-missing')
  }

  const normalized = normalizeAiChatPayload(body)
  const quotaArgs = quotaCallOptions({
    fingerprintHash,
    supabaseUrl,
    serviceRoleKey,
    supabase,
    quotaStore,
    quotaConfig,
    localState,
    nowMs,
    fetchImpl,
  })
  await reserveAiChatQuota(quotaArgs)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let streamStarted = false

  try {
    const response = await postDeepSeek({
      apiKey,
      baseUrl,
      model,
      fetchImpl,
      normalized,
      stream: false,
      signal: controller.signal,
    })

    let payload = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }

    if (!response.ok) {
      throw createHttpError(
        response.status,
        payload?.error?.message || 'DeepSeek request failed',
        'deepseek-request-failed'
      )
    }

    // 与流式路径共用 streamStarted：已拿到合法响应体后不再退额度
    streamStarted = true
    return { message: parseDeepSeekResponse(payload) }
  } catch (error) {
    if (!streamStarted) {
      await releaseAiChatQuota(quotaArgs)
    }
    if (error?.name === 'AbortError') {
      throw createHttpError(504, 'DeepSeek request timed out', 'deepseek-timeout')
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 流式补全的便捷封装：把 onEvent 收成 onDelta(delta, accumulated)
 *
 * @param {object} args 同 streamAiChatCompletionEvents，另加 onDelta
 * @param {function} [args.onDelta]
 * @returns {Promise<{ message: string }>}
 */
export async function requestAiChatCompletionStream({
  apiKey,
  baseUrl = DEFAULT_DEEPSEEK_BASE_URL,
  model = DEFAULT_DEEPSEEK_MODEL,
  fetchImpl,
  body,
  fingerprintHash,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  onDelta,
  supabaseUrl,
  serviceRoleKey,
  supabase,
  quotaStore,
  quotaConfig,
  localState,
  nowMs,
}) {
  return streamAiChatCompletionEvents({
    apiKey,
    baseUrl,
    model,
    fetchImpl,
    body,
    fingerprintHash,
    timeoutMs,
    supabaseUrl,
    serviceRoleKey,
    supabase,
    quotaStore,
    quotaConfig,
    localState,
    nowMs,
    onEvent: (event) => {
      if (event.delta) {
        onDelta?.(event.delta, event.message)
      }
    },
  })
}

/**
 * 编码一条 SSE data 帧（含结尾空行），供 API 路由原样写出
 *
 * @param {object} payload 将 JSON.stringify 的事件对象
 * @returns {string}
 */
export function encodeSseEvent(payload) {
  return `data: ${JSON.stringify(payload)}\n\n`
}

/**
 * 流式补全：占额度 → DeepSeek SSE → 逐段 onEvent，结束再规范化全文
 *
 * @param {object} args
 * @param {string} args.apiKey
 * @param {object} args.body
 * @param {string} args.fingerprintHash
 * @param {function} [args.onEvent] 收到 `{ delta, message }` 或 `{ done: true, message }`
 * @param {number} [args.timeoutMs]
 * @returns {Promise<{ message: string }>} 清洗后的完整助手正文
 * @throws {Error} 缺 key / HTTP 失败 / 超时 / 空回复；HTTP 未 2xx 前会归还额度
 * 副作用：reserve 额度、对外 POST 流式；已开始吐 token 后失败不退额度
 */
export async function streamAiChatCompletionEvents({
  apiKey,
  baseUrl = DEFAULT_DEEPSEEK_BASE_URL,
  model = DEFAULT_DEEPSEEK_MODEL,
  fetchImpl,
  body,
  fingerprintHash,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  onEvent,
  supabaseUrl,
  serviceRoleKey,
  supabase,
  quotaStore,
  quotaConfig,
  localState,
  nowMs,
}) {
  if (!apiKey) {
    throw createHttpError(500, 'DeepSeek API key is missing', 'deepseek-key-missing')
  }

  const normalized = normalizeAiChatPayload(body)
  const quotaArgs = quotaCallOptions({
    fingerprintHash,
    supabaseUrl,
    serviceRoleKey,
    supabase,
    quotaStore,
    quotaConfig,
    localState,
    nowMs,
    fetchImpl,
  })
  await reserveAiChatQuota(quotaArgs)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let streamStarted = false

  try {
    const response = await postDeepSeek({
      apiKey,
      baseUrl,
      model,
      fetchImpl,
      normalized,
      stream: true,
      signal: controller.signal,
    })

    if (!response.ok) {
      let payload = null
      try {
        payload = await response.json()
      } catch {
        payload = null
      }
      throw createHttpError(
        response.status,
        payload?.error?.message || 'DeepSeek request failed',
        'deepseek-request-failed'
      )
    }

    // 响应头已成功：后续读流失败不再退额度，避免半段回复白嫖
    streamStarted = true
    let message = ''
    for await (const delta of iterateDeepSeekStream(response)) {
      message += delta
      onEvent?.({ delta, message })
    }

    const finalMessage = normalizeAssistantText(message)
    onEvent?.({ done: true, message: finalMessage })
    return { message: finalMessage }
  } catch (error) {
    if (!streamStarted) {
      await releaseAiChatQuota(quotaArgs)
    }
    if (error?.name === 'AbortError') {
      throw createHttpError(504, 'DeepSeek request timed out', 'deepseek-timeout')
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}