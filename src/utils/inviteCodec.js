/**
 * CPTI 邀请/分享链接编解码模块（纯函数，无副作用，浏览器端执行）
 *
 * 职责：
 *   - 将单测答案序列编码为紧凑的 URL 参数，生成可分享的单人结果链接
 *   - 生成 / 解析双人邀请链接（dualToken），处理 URL 查询参数的增删
 *   - 兼容旧的 dualInvite 参数名（仅识别并提示不支持，不再解析）
 *
 * 编码格式（单人分享）：`v1.{题数}.{逐题答案数字串}`
 *   例：`v1.28.3210123...`，每题答案取值 0–6，对应"完全同意 → 完全不同意"
 *
 * 双人邀请令牌格式：32 位小写十六进制（TOKEN_PATTERN）
 */

export const INVITE_PARAM_KEY = 'dualToken'
export const LEGACY_INVITE_PARAM_KEY = 'dualInvite'
export const INVITE_SCHEMA_VERSION = 'v1'
export const SINGLE_SHARE_PARAM_KEY = 'singleShare'
// 合法令牌为 32 位小写十六进制字符串（16 字节随机数的 hex 表示）
const TOKEN_PATTERN = /^[a-f0-9]{32}$/

/**
 * 校验 selectedIndex 是否为合法的 0–6 整数
 * @param {*} value 待校验值
 * @returns {boolean}
 */
function isValidSelectedIndex(value) {
  return Number.isInteger(value) && value >= 0 && value <= 6
}

/**
 * 将题库 + 答案映射拼接为紧凑答案串（逐题答案直接拼接为单行数字串）
 *
 * @param {Array} questions  题库数组（提供顺序，决定拼接顺序）
 * @param {Object} answers   { [questionId]: 0-6 } 答案映射
 * @returns {string} 紧凑答案串，如 '3210123...'
 * @throws {Error} 任一题目缺失答案或答案非法时抛出 missing-answer:{id}
 */
function buildCompactAnswerString(questions, answers) {
  return questions.map((question) => {
    const value = answers?.[question.id]
    if (!isValidSelectedIndex(value)) {
      throw new Error(`missing-answer:${question.id}`)
    }
    return String(value)
  }).join('')
}

/**
 * 将紧凑答案串解析回 { [questionId]: selectedIndex } 映射
 *
 * @param {Array}  questions 题库数组（提供顺序与 id）
 * @param {string} compact   紧凑答案串
 * @returns {Object} { [questionId]: number }
 * @throws {Error} 长度不匹配 → answer-length-mismatch；非法答案 → invalid-answer:{id}
 */
function parseCompactAnswerString(questions, compact) {
  if (compact.length !== questions.length) {
    throw new Error('answer-length-mismatch')
  }

  return Object.fromEntries(
    questions.map((question, index) => {
      const value = Number(compact[index])
      if (!isValidSelectedIndex(value)) {
        throw new Error(`invalid-answer:${question.id}`)
      }
      return [question.id, value]
    })
  )
}

/**
 * 编码单人分享载荷：`v1.{题数}.{答案串}`
 * 用于拼接到 URL 查询参数中，生成无服务端参与的纯前端分享链接
 *
 * @param {Array}  questions 题库数组
 * @param {Object} answers   答案映射
 * @returns {string} 载荷字符串
 */
export function encodeSingleSharePayload(questions, answers) {
  const answerString = buildCompactAnswerString(questions, answers)
  return [
    INVITE_SCHEMA_VERSION,
    questions.length,
    answerString,
  ].join('.')
}

/**
 * 解码单人分享载荷，校验版本与题数后还原答案映射
 *
 * @param {Array}  questions 题库数组（用于校验题数一致性与回填 id）
 * @param {string} payload   载荷字符串
 * @returns {Object} { [questionId]: number } 答案映射
 * @throws {Error} 版本不符 / 题数不符 / 答案非法
 */
export function decodeSingleSharePayload(questions, payload) {
  const [version, questionCountText, compactAnswers] = String(payload ?? '').split('.')
  const questionCount = Number(questionCountText)

  if (version !== INVITE_SCHEMA_VERSION) {
    throw new Error('version-mismatch')
  }

  if (questionCount !== questions.length) {
    throw new Error('question-count-mismatch')
  }

  return parseCompactAnswerString(questions, compactAnswers ?? '')
}

/**
 * 基于令牌生成双人邀请链接：把 dualToken 写入当前页面 URL 的查询参数
 *
 * @param {string} token   32 位小写十六进制邀请令牌
 * @param {string} [baseUrl] 基础 URL，默认当前页面地址
 * @returns {string} 携带 dualToken 的完整邀请链接
 * @throws {Error} 令牌格式非法 → invalid-token
 */
export function createDualInviteLink(token, baseUrl = window.location.href) {
  const normalizedToken = String(token || '').trim().toLowerCase()
  if (!TOKEN_PATTERN.test(normalizedToken)) {
    throw new Error('invalid-token')
  }

  const url = new URL(baseUrl)
  url.searchParams.set(INVITE_PARAM_KEY, normalizedToken)
  // 同时清除旧版参数名，避免链接同时携带新旧两种参数造成歧义
  url.searchParams.delete(LEGACY_INVITE_PARAM_KEY)
  return url.toString()
}

/**
 * 从 URL 查询串中读取双人邀请状态
 *
 * @param {string} [search] URL 查询串，默认取当前页面
 * @returns {{ status: string, token?: string, reason?: string }}
 *   status 取值：
 *     'idle'    —— 无任何邀请参数
 *     'ready'   —— 令牌合法，可进入双人流程（附带 token）
 *     'invalid' —— 参数存在但非法（附带 reason，如 legacy-link-unsupported / invalid-token）
 */
export function readDualInviteFromSearch(search = window.location.search) {
  const params = new URLSearchParams(search)
  const legacyPayload = params.get(LEGACY_INVITE_PARAM_KEY)
  const token = String(params.get(INVITE_PARAM_KEY) || '').trim().toLowerCase()

  if (!token && !legacyPayload) {
    return { status: 'idle' }
  }

  // 仅存在旧版参数 → 标记为不支持，引导用户重新获取链接
  if (!token && legacyPayload) {
    return { status: 'invalid', reason: 'legacy-link-unsupported' }
  }

  if (!TOKEN_PATTERN.test(token)) {
    return { status: 'invalid', reason: 'invalid-token' }
  }

  return { status: 'ready', token }
}

/**
 * 从 URL 中移除双人邀请相关参数，返回清理后的相对路径
 * 用于进入流程后从地址栏"抹除"令牌，避免误分享
 *
 * @param {string} [currentHref] 当前完整 URL
 * @returns {string} 不含邀请参数的相对地址（pathname + search + hash）
 */
export function stripDualInviteFromUrl(currentHref = window.location.href) {
  const url = new URL(currentHref)
  url.searchParams.delete(INVITE_PARAM_KEY)
  url.searchParams.delete(LEGACY_INVITE_PARAM_KEY)
  return `${url.pathname}${url.search}${url.hash}`
}

/**
 * 生成单人分享链接：把编码后的载荷写入 singleShare 参数
 * 同时移除可能残留的双人邀请参数，保证链接语义单一
 *
 * @param {Array}  questions 题库数组
 * @param {Object} answers    答案映射
 * @param {string} [baseUrl]  基础 URL
 * @returns {string} 可分享的完整链接
 */
export function createSingleShareLink(questions, answers, baseUrl = window.location.href) {
  const url = new URL(baseUrl)
  url.searchParams.set(SINGLE_SHARE_PARAM_KEY, encodeSingleSharePayload(questions, answers))
  url.searchParams.delete(INVITE_PARAM_KEY)
  url.searchParams.delete(LEGACY_INVITE_PARAM_KEY)
  return url.toString()
}

/**
 * 从 URL 查询串中读取单人分享载荷并解码为答案映射
 *
 * @param {Array}  questions 题库数组
 * @param {string} [search]  URL 查询串
 * @returns {{ status: string, answers?: Object, reason?: string }}
 *   status 取值：'idle' / 'ready'（附带 answers）/ 'invalid'（附带 reason）
 */
export function readSingleShareFromSearch(questions, search = window.location.search) {
  const params = new URLSearchParams(search)
  const payload = params.get(SINGLE_SHARE_PARAM_KEY)
  if (!payload) return { status: 'idle' }

  try {
    return { status: 'ready', answers: decodeSingleSharePayload(questions, payload) }
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown-single-share-error'
    return { status: 'invalid', reason }
  }
}

/**
 * 从 URL 中移除单人分享参数，返回清理后的相对路径
 * 用于加载分享结果后从地址栏抹除载荷
 *
 * @param {string} [currentHref] 当前完整 URL
 * @returns {string} 不含 singleShare 参数的相对地址
 */
export function stripSingleShareFromUrl(currentHref = window.location.href) {
  const url = new URL(currentHref)
  url.searchParams.delete(SINGLE_SHARE_PARAM_KEY)
  return `${url.pathname}${url.search}${url.hash}`
}
