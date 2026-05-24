async function parseJsonSafely(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function buildApiError(payload, fallbackMessage, status = 500) {
  const error = new Error(payload?.error || fallbackMessage)
  error.code = payload?.code || 'ai-chat-error'
  error.status = status
  return error
}

export async function sendAiChatMessage({ context, messages }) {
  const response = await fetch('/api/ai-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context, messages }),
  })

  const payload = await parseJsonSafely(response)
  if (!response.ok || !payload?.ok || !payload?.data?.message) {
    throw buildApiError(payload, 'AI 关系助手暂时没有回应，请稍后重试。', response.status)
  }

  return payload.data.message
}
