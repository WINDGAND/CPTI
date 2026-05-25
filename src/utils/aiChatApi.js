// 客户端兜底：避免 SSE 在某些代理 / 移动网络环境下静默 hang，导致 UI 「点了但毫无反应」
const FIRST_BYTE_TIMEOUT_MS = 20_000  // fetch 后 20s 还没拿到首字节
const IDLE_TIMEOUT_MS = 30_000        // 流中途 30s 没有新 chunk
const HARD_TIMEOUT_MS = 70_000        // 整条流总耗时上限（Vercel maxDuration 60s 之外再给一点冗余）

function buildApiError(payload, fallbackMessage, status = 500, code) {
  const error = new Error(payload?.error || fallbackMessage)
  error.code = code || payload?.code || 'ai-chat-error'
  error.status = status
  return error
}

async function consumeSseResponse(response, onDelta, signal) {
  if (!response.body) {
    console.warn('[ai-chat] response missing body', { status: response.status })
    throw buildApiError(null, 'AI 关系助手暂时没有回应，请稍后重试。', response.status || 502)
  }

  const contentType = response.headers.get('content-type') || ''
  const isEventStream = contentType.includes('text/event-stream')

  if (!response.ok && !isEventStream) {
    let payload = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }
    console.warn('[ai-chat] non-stream error response', { status: response.status, payload })
    throw buildApiError(payload, 'AI 关系助手暂时没有回应，请稍后重试。', response.status)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finalMessage = ''
  let abortHandler = null

  // —— 三道客户端超时 —————————————————————————————————————————
  let idleAborted = false
  let hardAborted = false
  let receivedAnyChunk = false
  let idleTimer = null
  let hardTimer = null

  const stopTimers = () => {
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = null }
    if (hardTimer) { clearTimeout(hardTimer); hardTimer = null }
  }
  const forceCancel = () => { reader.cancel().catch(() => {}) }
  const scheduleIdle = (ms) => {
    if (idleTimer) clearTimeout(idleTimer)
    idleTimer = setTimeout(() => {
      console.warn('[ai-chat] idle timeout, aborting stream', { ms, receivedAnyChunk })
      idleAborted = true
      forceCancel()
    }, ms)
  }
  hardTimer = setTimeout(() => {
    console.warn('[ai-chat] hard timeout, aborting stream')
    hardAborted = true
    forceCancel()
  }, HARD_TIMEOUT_MS)
  // 首字节超时（更短一点，能更快地反馈给用户"对方根本没回应"）
  scheduleIdle(FIRST_BYTE_TIMEOUT_MS)

  if (signal) {
    abortHandler = () => { forceCancel() }
    if (signal.aborted) {
      forceCancel()
    } else {
      signal.addEventListener('abort', abortHandler, { once: true })
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      receivedAnyChunk = true
      // 收到 chunk 之后切到「常规 idle 超时」
      scheduleIdle(IDLE_TIMEOUT_MS)

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
          console.warn('[ai-chat] server SSE error', payload)
          throw buildApiError(payload, payload.error, payload.status || 500)
        }

        // 服务端心跳（type: 'open'）：仅用于尽早占住首字节，让 idle timer 进入"流中"档位。
        // 不携带 delta，不写入 finalMessage。
        if (payload?.type === 'open') {
          continue
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
  } finally {
    stopTimers()
    if (signal && abortHandler) {
      signal.removeEventListener('abort', abortHandler)
    }
  }

  // 用户主动停止 > 客户端超时 > 空回复
  if (signal?.aborted) {
    const stopError = new Error('生成已停止')
    stopError.code = 'aborted'
    stopError.partial = finalMessage
    throw stopError
  }

  if (hardAborted) {
    throw buildApiError(null, 'AI 这次思考超时了，稍后再试一次。', 504, 'hard-timeout')
  }

  if (idleAborted) {
    if (finalMessage.trim()) {
      // 部分内容已经出来了，按"已停止"的形式保留
      const partialError = new Error('AI 这次只回复了一半，可以再试一次。')
      partialError.code = 'idle-timeout'
      partialError.partial = finalMessage
      throw partialError
    }
    throw buildApiError(null, 'AI 这次连接好像断了，请再试一次。', 504, 'idle-timeout')
  }

  if (!finalMessage.trim()) {
    console.warn('[ai-chat] empty final message', { contentType, status: response.status })
    throw buildApiError(null, 'AI 关系助手暂时没有回应，请稍后重试。', 502, 'empty-response')
  }

  return finalMessage
}

export async function sendAiChatMessage({ context, messages, onDelta, signal }) {
  let response
  try {
    response = await fetch('/api/ai-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({ context, messages }),
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') {
      const stopError = new Error('生成已停止')
      stopError.code = 'aborted'
      throw stopError
    }
    console.warn('[ai-chat] fetch failed', err)
    const networkError = new Error('网络异常，无法连接到 AI，请检查网络后再试。')
    networkError.code = 'network-error'
    networkError.status = 0
    throw networkError
  }

  return consumeSseResponse(response, onDelta, signal)
}
