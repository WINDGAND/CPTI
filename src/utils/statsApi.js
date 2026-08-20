/**
 * CPTI 统计 / 匿名遥测 / 双人邀请 · 浏览器端 API 封装
 *
 * 职责：
 *   - 拉取公开统计摘要，上报测评结果码与匿名作答遥测
 *   - 创建、探测、核销双人拼图邀请令牌
 *
 * 约定：
 *   - 成功响应形如 `{ ok: true, data? }`；失败抛 Error（邀请接口还会带 code / status）
 *   - 上报类请求使用 `keepalive`，结果页跳走或关闭标签后仍尽量送出
 * 副作用：均发起 `/api/*` 网络请求；不读写 localStorage
 */

async function parseJsonSafely(response) {
  try {
    return await response.json()
  } catch {
    // 空 body 或非 JSON 不当成致命错误，交给调用方用 ok 字段判断
    return null
  }
}

/**
 * 把后端错误载荷转成带 `code` / `status` 的 Error，便于 UI 按错误码分流
 *
 * @param {{ error?: string, code?: string } | null} payload 解析后的 JSON，可能为空
 * @param {string} fallbackMessage 载荷缺 error 时的兜底文案
 * @param {number} [status=500] HTTP 状态码
 * @returns {Error}
 */
function buildApiError(payload, fallbackMessage, status = 500) {
  const error = new Error(payload?.error || fallbackMessage)
  error.code = payload?.code || 'api-error'
  error.status = status
  return error
}

/**
 * 拉取公开统计摘要（各类型占比等），供统计页展示
 *
 * @returns {Promise<object>} `payload.data` 统计载荷
 * @throws {Error} HTTP 失败、ok 不为真或缺少 data
 */
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

/**
 * 上报一次测评结果（类型码 + 单人/双人模式），供全站统计聚合
 *
 * @param {string} resultCode 16 型代码，如 `SROD`
 * @param {'single' | 'dual'} mode 测评模式
 * @returns {Promise<void>}
 * @throws {Error} 服务端拒绝或网络失败
 * 副作用：POST `/api/stats-submit`（keepalive）
 */
export async function submitStats(resultCode, mode) {
  // 缺参直接跳过：统计上报是尽力而为，不能阻断结果页渲染
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

/**
 * 上报匿名作答遥测（题量、选项、四维原始分），用于题库调优，不含身份信息
 *
 * @param {{ mode: string, questionCount: number, answers: object, dimensionScores: object }} payload
 * @returns {Promise<void>}
 * @throws {Error} 服务端拒绝或网络失败
 * 副作用：POST `/api/telemetry-submit`（keepalive）
 */
export async function submitTelemetry({ mode, questionCount, answers, dimensionScores }) {
  // 与 submitStats 相同：字段不全时静默跳过，避免草稿态误报
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

/**
 * 用甲方作答创建双人拼图邀请，返回可分享的令牌
 *
 * @param {{ answersA: object, questionCount: number, schemaVersion: string, ttlHours?: number }} payload
 * @param {object} payload.answersA 甲方各题选项
 * @param {number} payload.questionCount 题量，须与当前题库一致
 * @param {string} payload.schemaVersion 题库 schema，乙方核销时校验
 * @param {number} [payload.ttlHours=24] 令牌有效小时数
 * @returns {Promise<{ token: string }>} 含 token 的 data
 * @throws {Error} 缺 token 或 HTTP 失败（带 code / status）
 * 副作用：POST `/api/dual-invite-create`，服务端写入邀请记录
 */
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

/**
 * 探测邀请令牌状态（是否有效、是否已核销），不消耗令牌本身
 *
 * @param {string} token 32 位十六进制邀请令牌
 * @returns {Promise<{ status: string }>} 含 status 的 data
 * @throws {Error} 令牌无效或 HTTP 失败（带 code / status）
 * 副作用：POST `/api/dual-invite-consume` 且 `mode: 'probe'`，只读查询
 */
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

/**
 * 核销邀请令牌并取回甲方作答，供乙方续填双人拼图；同一令牌只能成功消耗一次
 *
 * @param {string} token 32 位十六进制邀请令牌
 * @returns {Promise<{ answersA: object }>} 含甲方 answersA 的 data
 * @throws {Error} 已核销、过期或 HTTP 失败（带 code / status）
 * 副作用：POST `/api/dual-invite-consume` 且 `mode: 'consume'`，服务端标记已用
 */
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
