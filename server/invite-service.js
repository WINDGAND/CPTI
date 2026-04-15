import { createClient } from '@supabase/supabase-js'

export const DEFAULT_INVITE_TTL_HOURS = 24
const TOKEN_BYTES = 16
const TOKEN_PATTERN = /^[a-f0-9]{32}$/

function createHttpError(status, message, code) {
  const error = new Error(message)
  error.status = status
  error.code = code
  return error
}

function getSupabaseAdminClient({ supabaseUrl, serviceRoleKey, fetchImpl }) {
  if (!supabaseUrl || !serviceRoleKey) {
    throw createHttpError(500, 'Supabase environment variables are missing', 'env-missing')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchImpl ?? fetch },
  })
}

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

function toInviteStatusRecord(record, nowIso) {
  if (!record) return { status: 'invalid' }
  if (record.used_at) return { status: 'used' }
  if (String(record.expires_at || '') <= nowIso) return { status: 'expired' }
  return { status: 'ready' }
}

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

export async function consumeDualInvite({
  supabaseUrl,
  serviceRoleKey,
  fetchImpl,
  token,
}) {
  const supabase = getSupabaseAdminClient({ supabaseUrl, serviceRoleKey, fetchImpl })
  const nowIso = new Date().toISOString()

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
