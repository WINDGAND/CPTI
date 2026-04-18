async function parseJsonSafely(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function submitFeedback({ body, pagePath }) {
  const response = await fetch('/api/feedback-submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body, pagePath }),
    keepalive: true,
  })

  const payload = await parseJsonSafely(response)
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || 'Failed to submit feedback')
  }
}
