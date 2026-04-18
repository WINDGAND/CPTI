import { createClient } from '@supabase/supabase-js'

const FEEDBACK_WINDOW_MINUTES = 60
const MAX_FEEDBACK_PER_WINDOW = 5
const MAX_BODY_LENGTH = 2000

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

export function normalizeFeedbackPayload(body) {
  const rawBody = String(body?.body ?? '').trim()
  if (!rawBody) {
    throw createHttpError(400, 'Feedback body is required', 'body-required')
  }
  if (rawBody.length > MAX_BODY_LENGTH) {
    throw createHttpError(400, `Feedback body too long (max ${MAX_BODY_LENGTH} characters)`, 'body-too-long')
  }

  const pagePath = body?.pagePath ? String(body.pagePath).slice(0, 500) : null

  return { body: rawBody, pagePath }
}

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
