async function parseJsonSafely(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function buildApiError(payload, fallbackMessage, status = 500) {
  const error = new Error(payload?.error || fallbackMessage)
  error.code = payload?.code || 'api-error'
  error.status = status
  return error
}

export async function fetchStatsSummary() {
  const response = await fetch('/api/stats-summary', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })

  const payload = await parseJsonSafely(response)
  if (!response.ok || !payload?.ok || !payload?.data) {
    throw new Error(payload?.error || 'Failed to fetch stats summary')
  }

  return payload.data
}

export async function submitStats(resultCode, mode) {
  if (!resultCode || !mode) return

  const response = await fetch('/api/stats-submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resultCode, mode }),
    keepalive: true,
  })

  const payload = await parseJsonSafely(response)
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || 'Failed to submit stats')
  }
}

export async function submitTelemetry({ mode, questionCount, answers, dimensionScores }) {
  if (!mode || !questionCount || !answers || !dimensionScores) return

  const response = await fetch('/api/telemetry-submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode,
      questionCount,
      answers,
      dimensionScores,
    }),
    keepalive: true,
  })

  const payload = await parseJsonSafely(response)
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || 'Failed to submit telemetry')
  }
}

export async function createDualInvite({ answersA, questionCount, schemaVersion, ttlHours = 24 }) {
  const response = await fetch('/api/dual-invite-create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      answersA,
      questionCount,
      schemaVersion,
      ttlHours,
    }),
  })

  const payload = await parseJsonSafely(response)
  if (!response.ok || !payload?.ok || !payload?.data?.token) {
    throw buildApiError(payload, 'Failed to create dual invite', response.status)
  }

  return payload.data
}

export async function probeDualInvite(token) {
  const response = await fetch('/api/dual-invite-consume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, mode: 'probe' }),
  })

  const payload = await parseJsonSafely(response)
  if (!response.ok || !payload?.ok || !payload?.data?.status) {
    throw buildApiError(payload, 'Failed to probe dual invite', response.status)
  }

  return payload.data
}

export async function consumeDualInvite(token) {
  const response = await fetch('/api/dual-invite-consume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, mode: 'consume' }),
  })

  const payload = await parseJsonSafely(response)
  if (!response.ok || !payload?.ok || !payload?.data?.answersA) {
    throw buildApiError(payload, 'Failed to consume dual invite', response.status)
  }

  return payload.data
}
