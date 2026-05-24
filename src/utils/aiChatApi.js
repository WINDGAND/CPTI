function buildApiError(payload, fallbackMessage, status = 500) {
  const error = new Error(payload?.error || fallbackMessage)
  error.code = payload?.code || 'ai-chat-error'
  error.status = status
  return error
}

async function consumeSseResponse(response, onDelta) {
  if (!response.ok || !response.body) {
    let payload = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }
    throw buildApiError(payload, 'AI 关系助手暂时没有回应，请稍后重试。', response.status)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finalMessage = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const chunks = buffer.split('\n\n')
    buffer = chunks.pop() || ''

    for (const chunk of chunks) {
      const line = chunk
        .split('\n')
        .map((entry) => entry.trim())
        .find((entry) => entry.startsWith('data:'))

      if (!line) continue

      let payload = null
      try {
        payload = JSON.parse(line.slice(5).trim())
      } catch {
        continue
      }

      if (payload?.error) {
        throw buildApiError(payload, payload.error, payload.status || 500)
      }

      if (payload?.delta) {
        finalMessage = payload.message || `${finalMessage}${payload.delta}`
        onDelta?.(payload.delta, finalMessage)
      }

      if (payload?.done && payload?.message) {
        finalMessage = payload.message
      }
    }
  }

  if (!finalMessage.trim()) {
    throw buildApiError(null, 'AI 关系助手暂时没有回应，请稍后重试。', 502)
  }

  return finalMessage
}

export async function sendAiChatMessage({ context, messages, onDelta }) {
  const response = await fetch('/api/ai-chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ context, messages }),
  })

  return consumeSseResponse(response, onDelta)
}
