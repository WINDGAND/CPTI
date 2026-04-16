import { createClient } from '@supabase/supabase-js'
import { WINDOW_MINUTES, MAX_SUBMITS_PER_WINDOW } from './stats-service.js'

const VALID_MODES = ['single', 'dual']
const VALID_DIMENSIONS = ['SI', 'RP', 'OF', 'DA']

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

function normalizeTelemetryPayload(body) {
  const mode = String(body?.mode || '').toLowerCase()
  const questionCount = Number(body?.questionCount)
  const answers = body?.answers
  const dimensionScores = body?.dimensionScores

  if (!VALID_MODES.includes(mode)) {
    throw createHttpError(400, 'Invalid mode', 'invalid-mode')
  }

  if (!Number.isInteger(questionCount) || questionCount <= 0 || questionCount > 200) {
    throw createHttpError(400, 'Invalid questionCount', 'invalid-question-count')
  }

  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    throw createHttpError(400, 'Invalid answers payload', 'invalid-answers')
  }

  const entries = Object.entries(answers)
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
    // generous clamp range: 200 questions * 3 max per dimension < 600
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

function todayUtcDateString() {
  // YYYY-MM-DD (UTC)
  return new Date().toISOString().slice(0, 10)
}

export function normalizeTelemetrySubmissionPayload(body) {
  return normalizeTelemetryPayload(body)
}

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

  // Per-question choice distribution
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

  // Per-dimension raw score distribution
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

  // Extra sanity check (keeps eslint happy about unused vars if we evolve signature)
  void questionCount
}

