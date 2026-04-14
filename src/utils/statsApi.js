async function parseJsonSafely(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
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
