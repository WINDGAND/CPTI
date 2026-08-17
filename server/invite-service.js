/**
 * CPTI 双人邀请服务端逻辑（运行于服务端，使用 Supabase 作为存储后端）
 *
 * 职责：
 *   - 生成 32 位十六进制随机邀请令牌并写入 dual_invites 表
 *   - 探测 / 消费邀请令牌，处理令牌的有效期与一次性消费语义
 *   - 校验并归一化外部传入的请求体，统一构造 HTTP 错误（含 status 与 code）
 *
 * 令牌格式：32 位小写十六进制（16 随机字节的 hex）
 * 消费语义：一次性使用，消费后 used_at 被填充，不可重复消费
 * 有效期：默认 24 小时（DEFAULT_INVITE_TTL_HOURS），可通过 ttlHours 参数自定义
 */

import { createClient } from '@supabase/supabase-js'

// 邀请令牌默认有效期（小时）
export const DEFAULT_INVITE_TTL_HOURS = 24
// 令牌随机字节数，16 字节 → 32 位十六进制
const TOKEN_BYTES = 16
const TOKEN_PATTERN = /^[a-f0-9]{32}$/

/**
 * 构造一个携带 HTTP 状态码与业务错误码的 Error 对象
 * 上层捕获后可直接读取 error.status 与 error.code 进行响应
 *
 * @param {number} status  HTTP 状态码
 * @param {string} message 错误描述
 * @param {string} code    业务错误码（供前端判断处理分支）
 * @returns {Error} 带 status / code 的错误实例
 */
function createHttpError(status, message, code) {
  const error = new Error(message)
  error.status = status
  error.code = code
  return error
}

/**
 * 创建 Supabase 管理员客户端（使用 service role key，绕过 RLS）
 * 服务端场景下不持久化会话、不自动刷新 token
 *
 * @param {Object} opts
 * @param {string} opts.supabaseUrl      Supabase 项目 URL
 * @param {string} opts.serviceRoleKey   Supabase service role key
 * @param {Function} [opts.fetchImpl]    自定义 fetch 实现（测试注入用）
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
 * 使用 Web Crypto API 生成 16 字节密码学安全随机数，并转为 32 位十六进制令牌
 *
 * @returns {string} 32 位小写十六进制令牌
 * @throws {Error} crypto API 不可用 → crypto-unavailable（500）
 */
function randomHexToken() {
  if (!globalThis.crypto?.getRandomValues) {
    throw createHttpError(500, 'Web Crypto API is unavailable', 'crypto-unavailable')
  }

  const bytes = new Uint8Array(TOKEN_BYTES)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * 归一化并校验答案映射：必须是对象、条目数与题数一致、每题取值 0–6 整数
 *
 * @param {Object} rawAnswers     原始答案映射 { [questionId]: number }
 * @param {number} questionCount  题目数量
 * @returns {Object} 校验通过的归一化答案映射
 * @throws {Error} 非法类型 / 题数不匹配 / 答案越界
 */
function normalizeAnswersMap(rawAnswers, questionCount) {
  if (!rawAnswers || typeof rawAnswers !== 'object' || Array.isArray(rawAnswers)) {
    throw createHttpError(400, 'Invalid answers payload', 'invalid-answers')
  }

  const entries = Object.entries(rawAnswers)
  if (entries.length !== questionCount) {
    throw createHttpError(400, 'Question count mismatch', 'question-count-mismatch')
  }

  const normalized = {}
  for (const [questionId, selectedIndex] of entries) {
    if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex > 6) {
      throw createHttpError(400, `Invalid answer: ${questionId}`, 'invalid-answer-value')
    }
    normalized[questionId] = selectedIndex
  }
  return normalized
}

/**
 * 校验并归一化"创建邀请"请求体，返回可直接入库的数据
 *
 * @param {Object} body  请求体
 * @returns {{ questionCount, ttlHours, schemaVersion, answersA }}
 * @throws {Error} 题数非法 / ttl 非法 / schema 缺失 / 答案非法
 */
export function normalizeCreateInvitePayload(body) {
  const questionCount = Number(body?.questionCount)
  const ttlHoursRaw = Number(body?.ttlHours ?? DEFAULT_INVITE_TTL_HOURS)
  const schemaVersion = String(body?.schemaVersion || 'v1')

  if (!Number.isInteger(questionCount) || questionCount <= 0 || questionCount > 200) {
    throw createHttpError(400, 'Invalid questionCount', 'invalid-question-count')
  }

  if (!Number.isFinite(ttlHoursRaw) || ttlHoursRaw <= 0 || ttlHoursRaw > 168) {
    throw createHttpError(400, 'Invalid ttlHours', 'invalid-ttl')
  }

  if (!schemaVersion) {
    throw createHttpError(400, 'Invalid schemaVersion', 'invalid-schema-version')
  }

  return {
    questionCount,
    ttlHours: ttlHoursRaw,
    schemaVersion,
    answersA: normalizeAnswersMap(body?.answersA, questionCount),
  }
}

/**
 * 校验并归一化"消费邀请"请求体，提取令牌与操作模式
 *
 * @param {Object} body 请求体
 * @returns {{ token: string, mode: 'consume' | 'probe' }}
 * @throws {Error} 令牌格式非法 / 模式取值非法
 */
export function normalizeConsumeInvitePayload(body) {
  const token = String(body?.token || '').trim().toLowerCase()
  if (!TOKEN_PATTERN.test(token)) {
    throw createHttpError(400, 'Invalid token', 'invalid-token')
  }
  const mode = String(body?.mode || 'consume').toLowerCase()
  if (!['consume', 'probe'].includes(mode)) {
    throw createHttpError(400, 'Invalid consume mode', 'invalid-consume-mode')
  }
  return { token, mode }
}

/**
 * 将数据库记录转换为邀请状态描述（用于 probe 探测）
 * 判定优先级：不存在 → invalid；已使用 → used；已过期 → expired；否则 → ready
 *
 * @param {Object|null} record dual_invites 行记录
 * @param {string} nowIso      当前 ISO 时间字符串，用于比较过期时间
 * @returns {{ status: string }}
 */
function toInviteStatusRecord(record, nowIso) {
  if (!record) return { status: 'invalid' }
  if (record.used_at) return { status: 'used' }
  if (String(record.expires_at || '') <= nowIso) return { status: 'expired' }
  return { status: 'ready' }
}

/**
 * 探测邀请令牌状态（只读，不改变令牌的已用/未用状态）
 *
 * @param {Object} opts
 * @param {string} opts.token 待探测的令牌
 * @returns {Promise<{ status: string }>} 邀请状态
 * @throws {Error} 查询失败 → invite-check-failed（500）
 */
export async function probeDualInviteStatus({
  supabaseUrl,
  serviceRoleKey,
  fetchImpl,
  token,
}) {
  const supabase = getSupabaseAdminClient({ supabaseUrl, serviceRoleKey, fetchImpl })
  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from('dual_invites')
    .select('expires_at, used_at')
    .eq('token', token)
    .maybeSingle()

  if (error) {
    throw createHttpError(500, 'Failed to check invite token', 'invite-check-failed')
  }

  return toInviteStatusRecord(data, nowIso)
}

/**
 * 创建双人邀请：生成随机令牌 + 计算过期时间，写入 dual_invites 表
 *
 * @param {Object} opts
 * @param {number} [opts.ttlHours] 有效期（小时），默认 24
 * @returns {Promise<{ token, expiresAt, ttlHours }>}
 * @throws {Error} 写入失败 → invite-create-failed（500）
 */
export async function createDualInvite({
  supabaseUrl,
  serviceRoleKey,
  fetchImpl,
  answersA,
  questionCount,
  schemaVersion = 'v1',
  ttlHours = DEFAULT_INVITE_TTL_HOURS,
}) {
  const supabase = getSupabaseAdminClient({ supabaseUrl, serviceRoleKey, fetchImpl })
  const token = randomHexToken()
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString()

  const { error } = await supabase
    .from('dual_invites')
    .insert({
      token,
      answers_a: answersA,
      question_count: questionCount,
      schema_version: schemaVersion,
      expires_at: expiresAt,
    })

  if (error) {
    throw createHttpError(500, 'Failed to create invite token', 'invite-create-failed')
  }

  return { token, expiresAt, ttlHours }
}

/**
 * 消费双人邀请令牌（一次性语义）
 *
 * 采用"乐观更新 + 兜底诊断"两步策略：
 *   1. 原子更新：仅当 used_at 为空且未过期时，才写入 used_at 并取回邀请数据；
 *      成功即代表令牌首次被合法消费，直接返回答案载荷。
 *   2. 若原子更新未命中（consumed 为空），再查询原始记录以判定失败原因：
 *      不存在 → 404；已使用 → 409；已过期 → 410；其余 → 400。
 *      这样能向前端返回精确的业务错误码，而非笼统的失败。
 *
 * @param {Object} opts
 * @param {string} opts.token 待消费令牌
 * @returns {Promise<{ answersA, questionCount, schemaVersion }>}
 * @throws {Error} 消费失败 / 令牌无效 / 已使用 / 已过期
 */
export async function consumeDualInvite({
  supabaseUrl,
  serviceRoleKey,
  fetchImpl,
  token,
}) {
  const supabase = getSupabaseAdminClient({ supabaseUrl, serviceRoleKey, fetchImpl })
  const nowIso = new Date().toISOString()

  // 第一步：尝试原子性消费（仅未使用且未过期时命中）
  const { data: consumed, error: consumeError } = await supabase
    .from('dual_invites')
    .update({ used_at: nowIso })
    .eq('token', token)
    .is('used_at', null)
    .gt('expires_at', nowIso)
    .select('answers_a, question_count, schema_version')
    .maybeSingle()

  if (consumeError) {
    throw createHttpError(500, 'Failed to consume invite token', 'invite-consume-failed')
  }

  if (consumed) {
    return {
      answersA: consumed.answers_a || {},
      questionCount: Number(consumed.question_count || 0),
      schemaVersion: String(consumed.schema_version || 'v1'),
    }
  }

  // 第二步：原子更新未命中，查询原始记录以诊断具体失败原因
  const { data: existing, error: readError } = await supabase
    .from('dual_invites')
    .select('expires_at, used_at')
    .eq('token', token)
    .maybeSingle()

  if (readError) {
    throw createHttpError(500, 'Failed to verify invite token', 'invite-check-failed')
  }

  if (!existing) {
    throw createHttpError(404, 'Invite token not found', 'invite-invalid')
  }

  if (existing.used_at) {
    throw createHttpError(409, 'Invite token already used', 'invite-used')
  }

  if (String(existing.expires_at || '') <= nowIso) {
    throw createHttpError(410, 'Invite token expired', 'invite-expired')
  }

  throw createHttpError(400, 'Invite token unavailable', 'invite-unavailable')
}
