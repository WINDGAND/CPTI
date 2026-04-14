import { createClient } from '@supabase/supabase-js'
import { buildStatsPayload, VALID_CODES, VALID_MODES } from '../api/_shared/stats-helpers.js'

export const WINDOW_MINUTES = 15
export const MAX_SUBMITS_PER_WINDOW = 3

function createHttpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

function getSupabaseAdminClient({ supabaseUrl, serviceRoleKey, fetchImpl }) {
  if (!supabaseUrl || !serviceRoleKey) {
    throw createHttpError(500, 'Supabase environment variables are missing')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchImpl ?? fetch },
  })
}

function rowToCodeCountMap(row) {
  return Object.fromEntries(
    VALID_CODES.map((code) => [code, Number(row[`${code.toLowerCase()}_count`] ?? 0)])
  )
}

export function normalizeClientIp(ipHeaderValue) {
  return String(ipHeaderValue ?? '').split(',')[0].trim()
}

export function normalizeSubmissionPayload(body) {
  const resultCode = String(body?.resultCode || '').toUpperCase()
  const mode = String(body?.mode || '').toLowerCase()
  return { resultCode, mode }
}

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

