/**
 * CPTI 问题反馈 · 浏览器端 API 封装
 *
 * 职责：把用户在反馈弹窗写下的正文，连同当前页面路径，POST 到 `/api/feedback-submit`。
 *
 * 约定：
 *   - 成功响应形如 `{ ok: true }`；本函数 resolve 为 undefined
 *   - 失败（HTTP 非 2xx 或载荷 ok 不为真）抛 Error，message 优先用服务端 error 字段
 * 副作用：发起 keepalive POST，结果页跳走或关闭标签后仍尽量送出；不读写 localStorage
 */

async function parseJsonSafely(response) {
  try {
    return await response.json()
  } catch {
    // 空 body 或非 JSON 不当成致命错误，交给后面用 HTTP 状态 / ok 字段判断
    return null
  }
}

/**
 * 提交一条用户反馈
 *
 * @param {{ body: string, pagePath?: string }} payload
 * @param {string} payload.body 反馈正文
 * @param {string} [payload.pagePath] 提交时所在路由/页面路径，便于服务端归类
 * @returns {Promise<void>}
 * @throws {Error} 服务端拒绝或网络失败
 * 副作用：POST `/api/feedback-submit`（keepalive）
 */
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
