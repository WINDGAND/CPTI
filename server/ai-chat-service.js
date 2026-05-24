import { VALID_CODES } from '../api/_shared/stats-helpers.js'

const MAX_MESSAGE_LENGTH = 800
const MAX_CONTEXT_MESSAGES = 6
const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com'
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-v4-flash'
const DEFAULT_TIMEOUT_MS = 20000
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const MAX_REQUESTS_PER_WINDOW = 10
const rateLimitState = new Map()

function createHttpError(status, message, code) {
  const error = new Error(message)
  error.status = status
  error.code = code
  return error
}

function compactText(value, maxLength = 500) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

function normalizeRole(role) {
  const normalized = String(role || '').toLowerCase()
  if (!['user', 'assistant'].includes(normalized)) {
    throw createHttpError(400, 'Invalid message role', 'invalid-message-role')
  }
  return normalized
}

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

function normalizeContext(rawContext) {
  const code = String(rawContext?.code || '').trim().toUpperCase()
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

function normalizeAlignmentSide(rawSide) {
  if (!rawSide || typeof rawSide !== 'object') return { title: '', consensus: 0 }
  const consensus = Number(rawSide.consensus ?? 0)
  return {
    title: compactText(rawSide.title, 40),
    consensus: Number.isFinite(consensus) ? Math.max(0, Math.min(100, Math.round(consensus))) : 0,
  }
}

function normalizeAlignment(rawAlignment) {
  if (!rawAlignment || typeof rawAlignment !== 'object') return null
  return {
    mostAligned: normalizeAlignmentSide(rawAlignment.mostAligned),
    mostMisaligned: normalizeAlignmentSide(rawAlignment.mostMisaligned),
  }
}

export function normalizeAiChatPayload(body) {
  const context = normalizeContext(body?.context)
  const messages = Array.isArray(body?.messages)
    ? body.messages.map(normalizeMessage).slice(-MAX_CONTEXT_MESSAGES)
    : []

  if (messages.length === 0) {
    throw createHttpError(400, 'At least one message is required', 'messages-required')
  }

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

export function buildDeepSeekMessages({ context, messages }) {
  const systemPrompt = [
    '你是 CPTI 亲密光谱测试产品内的 AI 关系助手。',
    '你的任务是基于用户当前 CPTI 测试结果，帮助情侣把相处问题说清楚，给出温暖、具体、低压力、可执行的沟通建议。',
    '回答必须结合 CPTI 类型、维度倾向、优势、挑战或冲突模式，避免泛泛而谈。',
    '不要做心理诊断，不要给医疗、法律、危机干预建议，不要武断建议分手，不要教用户操控伴侣。',
    '如果用户描述人身安全、自伤、自杀、暴力威胁等危机场景，先建议立刻联系现实中的可信赖人士、当地紧急服务或专业机构。',
    '表达风格：简体中文，像温柔但清醒的关系教练；每次回答控制在 3-5 小段，必要时给 2-3 个可直接照着说的句子。',
    '',
    '当前 CPTI 关系上下文如下：',
    formatContextForPrompt(context),
  ].join('\n')

  return [
    { role: 'system', content: systemPrompt },
    ...messages,
  ]
}

export function parseDeepSeekResponse(payload) {
  const content = payload?.choices?.[0]?.message?.content
  const text = compactText(content, 4000)
  if (!text) {
    throw createHttpError(502, 'AI response is empty', 'ai-empty-response')
  }
  return text
}

export function assertAiChatRateLimit({
  fingerprintHash,
  state = rateLimitState,
  nowMs = Date.now(),
  windowMs = RATE_LIMIT_WINDOW_MS,
  maxRequests = MAX_REQUESTS_PER_WINDOW,
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

function buildEndpoint(baseUrl) {
  return `${String(baseUrl || DEFAULT_DEEPSEEK_BASE_URL).replace(/\/+$/, '')}/chat/completions`
}

export async function requestAiChatCompletion({
  apiKey,
  baseUrl = DEFAULT_DEEPSEEK_BASE_URL,
  model = DEFAULT_DEEPSEEK_MODEL,
  fetchImpl,
  body,
  fingerprintHash,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  if (!apiKey) {
    throw createHttpError(500, 'DeepSeek API key is missing', 'deepseek-key-missing')
  }

  const normalized = normalizeAiChatPayload(body)
  assertAiChatRateLimit({ fingerprintHash })
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await (fetchImpl ?? fetch)(buildEndpoint(baseUrl), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || DEFAULT_DEEPSEEK_MODEL,
        messages: buildDeepSeekMessages(normalized),
        temperature: 0.7,
        max_tokens: 900,
      }),
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

    return { message: parseDeepSeekResponse(payload) }
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw createHttpError(504, 'DeepSeek request timed out', 'deepseek-timeout')
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}
