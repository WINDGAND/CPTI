/**
 * CPTI 用户反馈服务端逻辑（运行于服务端，写入 Supabase `user_feedback` 表）
 *
 * 职责：
 *   - 归一化并校验反馈正文、可选来源路径
 *   - 按客户端指纹哈希做滑动窗口限流，再插入一条反馈记录
 *
 * 限流：默认 60 分钟内同一 fingerprintHash 最多 5 条（FEEDBACK_WINDOW_MINUTES / MAX_FEEDBACK_PER_WINDOW）
 * 正文上限：2000 字符；pagePath 最长截取 500 字符，缺省则存 null
 * 副作用：查询并插入 `user_feedback`；失败时抛带 status / code 的 Error
 */

import { createClient } from '@supabase/supabase-js'

/** 限流窗口长度（分钟） */
const FEEDBACK_WINDOW_MINUTES = 60
/** 同一指纹在窗口内最多提交条数 */
const MAX_FEEDBACK_PER_WINDOW = 5
/** 反馈正文字符上限，超出则 400 */
const MAX_BODY_LENGTH = 2000

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
 * 归一化反馈请求体：去空白、校验长度，并截断可选页面路径
 *
 * @param {{ body?: unknown, pagePath?: unknown }} body 原始 JSON
 * @returns {{ body: string, pagePath: string | null }}
 * @throws {Error} 空正文 → body-required（400）；超长 → body-too-long（400）
 */
export function normalizeFeedbackPayload(body) {
  const rawBody = String(body?.body ?? '').trim()
  if (!rawBody) {
    throw createHttpError(400, 'Feedback body is required', 'body-required')
  }
  if (rawBody.length > MAX_BODY_LENGTH) {
    throw createHttpError(400, `Feedback body too long (max ${MAX_BODY_LENGTH} characters)`, 'body-too-long')
  }

  // 有路径才入库；截断到 500 防止超长 URL / 伪造路径撑爆字段
  const pagePath = body?.pagePath ? String(body.pagePath).slice(0, 500) : null

  return { body: rawBody, pagePath }
}

/**
 * 按指纹哈希统计窗口内已提交条数，达到上限则拒绝
 *
 * @param {SupabaseClient} supabase
 * @param {string} fingerprintHash 客户端指纹哈希
 * @param {number} windowMinutes   窗口长度（分钟）
 * @param {number} maxPerWindow    窗口内允许的最大条数
 * @returns {Promise<void>}
 * @throws {Error} 查询失败 → 500；超限 → feedback-rate-limited（429）
 * 副作用：对 `user_feedback` 做 count 查询（head:true，不拉行）
 */
async function enforceFeedbackRateLimit(supabase, fingerprintHash, windowMinutes, maxPerWindow) {
  const windowStartIso = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString()
  const { count, error } = await supabase
    .from('user_feedback')
    .select('id', { count: 'exact', head: true })
    .eq('fingerprint_hash', fingerprintHash)
    .gte('created_at', windowStartIso)

  if (error) {
    throw createHttpError(500, 'Rate check failed', 'feedback-rate-check-failed')
  }

  if ((count ?? 0) >= maxPerWindow) {
    throw createHttpError(429, 'Too many feedback submissions in a short time', 'feedback-rate-limited')
  }
}

/**
 * 限流通过后向 `user_feedback` 插入一条记录
 *
 * @param {Object} opts
 * @param {string} opts.supabaseUrl
 * @param {string} opts.serviceRoleKey
 * @param {Function} [opts.fetchImpl]
 * @param {string} opts.fingerprintHash  已哈希的客户端指纹，用于限流归并
 * @param {string} opts.body             已归一化的正文
 * @param {string | null} [opts.pagePath] 来源路径，缺省写 null
 * @param {number} [opts.windowMinutes]
 * @param {number} [opts.maxPerWindow]
 * @returns {Promise<void>}
 * @throws {Error} 限流失败见 enforceFeedbackRateLimit；插入失败 → feedback-insert-failed（500）
 * 副作用：写入 `user_feedback` 一行
 */
export async function submitFeedbackData({
  supabaseUrl,
  serviceRoleKey,
  fetchImpl,
  fingerprintHash,
  body,
  pagePath,
  windowMinutes = FEEDBACK_WINDOW_MINUTES,
  maxPerWindow = MAX_FEEDBACK_PER_WINDOW,
}) {
  const supabase = getSupabaseAdminClient({ supabaseUrl, serviceRoleKey, fetchImpl })

  await enforceFeedbackRateLimit(supabase, fingerprintHash, windowMinutes, maxPerWindow)

  const { error: insertError } = await supabase
    .from('user_feedback')
    .insert({
      body,
      page_path: pagePath ?? null,
      fingerprint_hash: fingerprintHash,
    })

  if (insertError) {
    throw createHttpError(500, 'Failed to record feedback', 'feedback-insert-failed')
  }
}
