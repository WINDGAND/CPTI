/**
 * AI 关系助手 · 多会话存储
 *
 * 每个 (mode, code) 组合维护一份会话列表（localStorage 持久化）。
 * 单条会话结构：
 *   { id, title, messages: [{id, role, content, createdAt}], createdAt, updatedAt }
 *
 * 设计原则：
 *   - 纯前端实现，不依赖后端（符合 PRD 4.2 部署约束）
 *   - 单会话消息上限 MAX_MESSAGES_PER_SESSION，避免单条爆掉
 *   - 总会话数上限 MAX_SESSIONS_PER_PROFILE，到达后自动淘汰最旧的
 *   - 兼容旧版 cpti_ai_chat_<mode>_<CODE> 的纯消息数组，会自动迁移成一个会话
 */

const STORE_PREFIX = 'cpti_ai_chat_v2'
const LEGACY_PREFIX = 'cpti_ai_chat'

/** 单会话消息条数上限；超出时只保留最近若干条，避免撑爆 localStorage */
export const MAX_MESSAGES_PER_SESSION = 60
/** 同一 (mode, code) 档案下的会话个数上限；超出时淘汰列表尾部旧会话 */
export const MAX_SESSIONS_PER_PROFILE = 20

function nowIso() {
  return new Date().toISOString()
}

/**
 * 生成带前缀的短 id（时间戳 36 进制 + 随机片段），用作会话 / 消息主键
 *
 * @param {string} prefix 如 `'s'` / `'user'` / `'assistant'`
 * @returns {string}
 */
function genId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * 把测评上下文规范成存储键：mode 非 dual 一律当 single；类型码只留 A-Z
 *
 * @param {{ mode?: string, code?: string }} context
 * @returns {{ mode: string, code: string, storeKey: string, legacyKey: string }}
 */
function safeKey(context) {
  const mode = context?.mode === 'dual' ? 'dual' : 'single'
  const code = String(context?.code || 'UNKNOWN').toUpperCase().replace(/[^A-Z]/g, '') || 'UNKNOWN'
  return { mode, code, storeKey: `${STORE_PREFIX}_${mode}_${code}`, legacyKey: `${LEGACY_PREFIX}_${mode}_${code}` }
}

function readJson(key, fallback) {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* 配额满 / 隐私模式失败时静默 */
  }
}

function removeKey(key) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* noop */
  }
}

/**
 * 清洗单条消息：只保留 user / assistant，去掉空白内容
 *
 * @param {object} message
 * @returns {{ id: string, role: 'user'|'assistant', content: string, createdAt: string } | null}
 */
function sanitizeMessage(message) {
  if (!message || typeof message !== 'object') return null
  if (!['user', 'assistant'].includes(message.role)) return null
  const content = String(message.content ?? '').trim()
  if (!content) return null
  return {
    id: typeof message.id === 'string' && message.id ? message.id : genId(message.role),
    role: message.role,
    content,
    createdAt: typeof message.createdAt === 'string' ? message.createdAt : nowIso(),
  }
}

function sanitizeSession(session) {
  if (!session || typeof session !== 'object') return null
  const messages = Array.isArray(session.messages)
    ? session.messages.map(sanitizeMessage).filter(Boolean).slice(-MAX_MESSAGES_PER_SESSION)
    : []
  return {
    id: typeof session.id === 'string' && session.id ? session.id : genId('s'),
    title: typeof session.title === 'string' ? session.title : '',
    messages,
    createdAt: typeof session.createdAt === 'string' ? session.createdAt : nowIso(),
    updatedAt: typeof session.updatedAt === 'string' ? session.updatedAt : nowIso(),
  }
}

/**
 * 把旧版「纯消息数组」迁成一条会话
 *
 * @param {string} legacyKey
 * @returns {object|null} 无可迁移内容时返回 null
 * 副作用：成功时删除 legacyKey，避免下次再迁
 */
function migrateLegacy(legacyKey) {
  const legacy = readJson(legacyKey, null)
  if (!Array.isArray(legacy) || legacy.length === 0) return null
  const messages = legacy.map(sanitizeMessage).filter(Boolean)
  if (messages.length === 0) return null
  const session = sanitizeSession({
    id: genId('s'),
    title: deriveTitle(messages),
    messages,
    createdAt: messages[0]?.createdAt || nowIso(),
    updatedAt: messages[messages.length - 1]?.createdAt || nowIso(),
  })
  removeKey(legacyKey)
  return session
}

function readStore(context) {
  const { storeKey, legacyKey } = safeKey(context)
  const raw = readJson(storeKey, null)
  // 已有 v2 结构（哪怕 sessions 为空）就不再碰旧 key，避免重复迁移
  if (raw && Array.isArray(raw.sessions)) {
    return {
      sessions: raw.sessions.map(sanitizeSession).filter(Boolean),
      currentSessionId: typeof raw.currentSessionId === 'string' ? raw.currentSessionId : null,
    }
  }
  const migrated = migrateLegacy(legacyKey)
  if (migrated) {
    const store = { sessions: [migrated], currentSessionId: migrated.id }
    writeJson(storeKey, store)
    return store
  }
  return { sessions: [], currentSessionId: null }
}

function writeStore(context, store) {
  const { storeKey } = safeKey(context)
  const safe = {
    sessions: store.sessions
      .map(sanitizeSession)
      .filter(Boolean)
      // 与 createSession 的 slice(0, N) 不同：这里按数组尾部截断，保留末尾最多 N 条
      .slice(-MAX_SESSIONS_PER_PROFILE),
    currentSessionId: typeof store.currentSessionId === 'string' ? store.currentSessionId : null,
  }
  writeJson(storeKey, safe)
  return safe
}

/** 各语言下的默认会话标题（持久化里可能混存，展示时需统一映射） */
export const DEFAULT_SESSION_TITLES = new Set(['新的对话', 'New chat', 'New Chat'])

/**
 * 判断标题是否为各语言下的「新对话」占位名（或空串）
 *
 * @param {string} title
 * @returns {boolean} true 时展示层应改用首条用户消息派生标题
 */
export function isDefaultSessionTitle(title) {
  const clean = String(title || '').trim()
  return !clean || DEFAULT_SESSION_TITLES.has(clean)
}

/**
 * 用首条用户消息生成会话标题
 *
 * @param {Array<{ role?: string, content?: string }>} messages
 * @param {string} [defaultTitle=''] 没有用户消息时的回退标题
 * @returns {string} 超过 18 字时截断并加省略号
 */
export function deriveTitle(messages, defaultTitle = '') {
  const firstUser = (Array.isArray(messages) ? messages : []).find((m) => m?.role === 'user')
  const text = String(firstUser?.content || '').replace(/\s+/g, ' ').trim()
  if (!text) return defaultTitle
  return text.length > 18 ? `${text.slice(0, 18)}…` : text
}

/**
 * 解析展示用标题：自定义名原样返回；占位名则按消息派生
 *
 * @param {string} storedTitle
 * @param {Array} messages
 * @param {string} defaultTitle
 * @returns {string}
 */
export function resolveSessionTitle(storedTitle, messages, defaultTitle) {
  if (!isDefaultSessionTitle(storedTitle)) return storedTitle
  return deriveTitle(messages, defaultTitle)
}

/* ─── public API ────────────────────────────────────────── */

/**
 * 列出某测评档案下的全部会话（按 updatedAt 降序）
 *
 * @param {{ mode?: string, code?: string }} context
 * @returns {{ sessions: object[], currentSessionId: string|null }}
 * 副作用：若仍是旧版纯数组存储，会迁移写入 v2 key 并删除 legacy key
 */
export function listSessions(context) {
  const store = readStore(context)
  const sorted = [...store.sessions].sort((a, b) => {
    const at = new Date(a.updatedAt).getTime()
    const bt = new Date(b.updatedAt).getTime()
    return bt - at
  })
  return { sessions: sorted, currentSessionId: store.currentSessionId }
}

/**
 * 按 id 读取单条会话
 *
 * @param {{ mode?: string, code?: string }} context
 * @param {string} sessionId
 * @returns {object|null} 找不到或未传 id 时返回 null
 */
export function getSession(context, sessionId) {
  if (!sessionId) return null
  const store = readStore(context)
  return store.sessions.find((s) => s.id === sessionId) || null
}

/**
 * 新建会话并设为当前会话
 *
 * @param {{ mode?: string, code?: string }} context
 * @param {{ title?: string, messages?: object[] }} [init]
 * @returns {object} 规范化后的会话
 * 副作用：写入 localStorage；超出上限时丢掉列表尾部旧会话
 */
export function createSession(context, { title = '', messages = [] } = {}) {
  const store = readStore(context)
  const session = sanitizeSession({
    id: genId('s'),
    title,
    messages,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  })
  const nextSessions = [session, ...store.sessions].slice(0, MAX_SESSIONS_PER_PROFILE)
  writeStore(context, { sessions: nextSessions, currentSessionId: session.id })
  return session
}

/**
 * 保存 / 覆盖一条会话（不存在则插入到列表头部）
 *
 * @param {{ mode?: string, code?: string }} context
 * @param {object} session
 * @returns {object} 规范化后的会话（updatedAt 刷新为当前时间）
 * 副作用：写入 localStorage
 */
export function saveSession(context, session) {
  const store = readStore(context)
  const safe = sanitizeSession({ ...session, updatedAt: nowIso() })
  const exists = store.sessions.some((s) => s.id === safe.id)
  const nextSessions = exists
    ? store.sessions.map((s) => (s.id === safe.id ? safe : s))
    : [safe, ...store.sessions].slice(0, MAX_SESSIONS_PER_PROFILE)
  writeStore(context, { sessions: nextSessions, currentSessionId: store.currentSessionId || safe.id })
  return safe
}

/**
 * 重命名会话；空标题回退为「未命名对话」，最长 40 字
 *
 * @param {{ mode?: string, code?: string }} context
 * @param {string} sessionId
 * @param {string} nextTitle
 * @returns {void}
 * 副作用：写入 localStorage
 */
export function renameSession(context, sessionId, nextTitle) {
  const store = readStore(context)
  const cleanTitle = String(nextTitle || '').trim().slice(0, 40) || '未命名对话'
  const nextSessions = store.sessions.map((s) => (
    s.id === sessionId ? { ...s, title: cleanTitle, updatedAt: nowIso() } : s
  ))
  writeStore(context, { sessions: nextSessions, currentSessionId: store.currentSessionId })
}

/**
 * 删除会话；若删的是当前会话则改指剩下列表的第一条
 *
 * @param {{ mode?: string, code?: string }} context
 * @param {string} sessionId
 * @returns {string|null} 删除后的 currentSessionId
 * 副作用：写入 localStorage
 */
export function deleteSession(context, sessionId) {
  const store = readStore(context)
  const nextSessions = store.sessions.filter((s) => s.id !== sessionId)
  const nextCurrent = store.currentSessionId === sessionId
    ? (nextSessions[0]?.id || null)
    : store.currentSessionId
  writeStore(context, { sessions: nextSessions, currentSessionId: nextCurrent })
  return nextCurrent
}

/**
 * 切换当前会话；id 不在列表中时静默忽略
 *
 * @param {{ mode?: string, code?: string }} context
 * @param {string|null} sessionId
 * @returns {void}
 * 副作用：写入 localStorage
 */
export function setCurrentSession(context, sessionId) {
  const store = readStore(context)
  if (sessionId && !store.sessions.some((s) => s.id === sessionId)) return
  writeStore(context, { sessions: store.sessions, currentSessionId: sessionId || null })
}

/**
 * 清空该档案下全部会话
 *
 * @param {{ mode?: string, code?: string }} context
 * @returns {void}
 * 副作用：写入 localStorage
 */
export function clearAllSessions(context) {
  writeStore(context, { sessions: [], currentSessionId: null })
}

export { sanitizeMessage, genId }
