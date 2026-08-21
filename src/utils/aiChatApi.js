/**
 * CPTI AI 关系助手 · 浏览器端 SSE 调用封装
 *
 * 职责：
 *   - POST `/api/ai-chat`，按 text/event-stream 逐段消费模型输出
 *   - 用三道客户端超时兜底，避免代理 / 移动网静默 hang 时 UI「点了没反应」
 *
 * 超时档位：
 *   - FIRST_BYTE_TIMEOUT_MS 20s：fetch 后仍无首字节
 *   - IDLE_TIMEOUT_MS 30s：流中途长时间无新 chunk
 *   - HARD_TIMEOUT_MS 70s：整条流硬上限（Vercel maxDuration 60s 外再留冗余）
 * 副作用：发起网络请求；通过 onDelta 回调驱动界面增量渲染
 */

// 客户端兜底：避免 SSE 在某些代理 / 移动网络环境下静默 hang，导致 UI 「点了但毫无反应」
const FIRST_BYTE_TIMEOUT_MS = 20_000  // fetch 后 20s 还没拿到首字节
const IDLE_TIMEOUT_MS = 30_000        // 流中途 30s 没有新 chunk
const HARD_TIMEOUT_MS = 70_000        // 整条流总耗时上限（Vercel maxDuration 60s 之外再给一点冗余）

/**
 * 把后端错误载荷转成带 `code` / `status` 的 Error，便于 UI 按错误码分流
 *
 * @param {{ error?: string, code?: string, status?: number } | null} payload 解析后的 JSON，可能为空
 * @param {string} fallbackMessage 载荷缺 error 时的兜底文案
 * @param {number} [status=500] HTTP 状态码
 * @param {string} [code] 显式业务错误码；缺省则用载荷 code 或 `ai-chat-error`
 * @returns {Error}
 */
function buildApiError(payload, fallbackMessage, status = 500, code) {
  const error = new Error(payload?.error || fallbackMessage)
  error.code = code || payload?.code || 'ai-chat-error'
  error.status = status
  return error
}

/**
 * 读取 SSE 响应体，拼出完整助手回复；超时或用户停止时带上已生成的 partial
 *
 * @param {Response} response fetch 返回的 Response（期望 text/event-stream）
 * @param {(delta: string, full: string) => void} [onDelta] 每段增量回调
 * @param {AbortSignal} [signal] 用户点「停止」时 abort
 * @returns {Promise<string>} 完整助手文本
 * @throws {Error} aborted / hard-timeout / idle-timeout / empty-response 等；部分场景带 `partial`
 */
async function consumeSseResponse(response, onDelta, signal) {
  if (!response.body) {
    console.warn('[ai-chat] response missing body', { status: response.status })
    throw buildApiError(null, 'AI 关系助手暂时没有回应，请稍后重试。', response.status || 502)
  }

  const contentType = response.headers.get('content-type') || ''
  const isEventStream = contentType.includes('text/event-stream')

  // 非流且 HTTP 失败：按 JSON 错误体抛出；若已是 SSE 则继续读，好让流内 error 事件自己报错
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

/**
 * 向 AI 关系助手发送一轮对话并流式回传
 *
 * @param {Object} opts
 * @param {object} opts.context 当前测评上下文（模式、类型码等），原样转给后端
 * @param {Array<{ role: string, content: string }>} opts.messages 会话消息列表
 * @param {(delta: string, full: string) => void} [opts.onDelta] 增量回调，驱动打字机效果
 * @param {AbortSignal} [opts.signal] 取消生成
 * @returns {Promise<string>} 完整助手回复
 * @throws {Error} 网络失败 → network-error（status 0）；用户停止 → aborted；其余见 consumeSseResponse
 * 副作用：POST `/api/ai-chat`；不读写 localStorage
 */
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
