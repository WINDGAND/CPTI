/**
 * CPTI 问卷草稿本地持久化（浏览器 localStorage）
 *
 * 职责：
 *   - 把未完成的单人/双人作答进度写入本地，刷新或误关页面后可继续填
 *   - 用 schema 版本、题量、题目 id 哈希校验草稿是否仍匹配当前题库
 *   - 超过 TTL、JSON 损坏或不兼容时主动清除，避免脏数据把用户卡在旧进度
 *
 * 副作用：read / save / clear 会读写并可能删除 QUIZ_DRAFT_KEY
 * 服务端 / SSR：无 window.localStorage 时读写均为空操作，不抛错
 */

/** localStorage 键名；升级存储结构时请改 schema 版本或换键 */
export const QUIZ_DRAFT_KEY = 'cpti:quiz-draft:v1'
/** 草稿载荷 schema 版本；与磁盘上的 schemaVersion 不一致则整份丢弃 */
export const QUIZ_DRAFT_SCHEMA_VERSION = 'v1'
/** 草稿有效期：7 天未更新即过期 */
export const QUIZ_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000

function isStorageReady() {
  return typeof window !== 'undefined' && !!window.localStorage
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isValidAnswer(value) {
  return Number.isInteger(value) && value >= 0 && value <= 6
}

/** 轻量字符串哈希（非加密），给题目 id 序列做指纹，检测题库是否被改过 */
function hashText(input) {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash.toString(36)
}

/**
 * 按当前题库顺序拼接题目 id，再哈希，作为草稿与题库是否对齐的指纹
 *
 * @param {Array<{id: string}>} questions 当前题库
 * @returns {string} 36 进制哈希串
 */
export function buildQuestionIdsHash(questions) {
  const ids = questions.map((question) => question.id).join('|')
  return hashText(ids)
}

function normalizeAnswers(questions, rawAnswers) {
  const normalized = {}
  const allowedIds = new Set(questions.map((question) => question.id))
  if (!isPlainObject(rawAnswers)) return normalized

  Object.entries(rawAnswers).forEach(([questionId, selectedIndex]) => {
    if (!allowedIds.has(questionId)) return
    if (!isValidAnswer(selectedIndex)) return
    normalized[questionId] = selectedIndex
  })

  return normalized
}

function normalizeDualAnswerSets(questions, rawSets) {
  if (!Array.isArray(rawSets) || rawSets.length !== 2) {
    return [{}, {}]
  }

  return [
    normalizeAnswers(questions, rawSets[0]),
    normalizeAnswers(questions, rawSets[1]),
  ]
}

/**
 * 读取本地问卷草稿，并在不兼容 / 过期 / 损坏时清掉对应键
 *
 * @param {Array<{id: string}>} questions 当前题库，用于校验题量与 id 指纹
 * @returns {{status: string, reason?: string, draft?: object}}
 *   status:
 *     - unavailable      无 localStorage（SSR / 隐私模式等）
 *     - empty            尚无草稿
 *     - ready            草稿可用，见 draft 字段
 *     - incompatible     题库或 schema 已变，reason 说明具体原因
 *     - expired          超过 TTL
 *     - invalid-json     载荷无法 JSON.parse
 * @sideeffect 不兼容、过期或损坏时会 removeItem(QUIZ_DRAFT_KEY)
 */
export function readQuizDraft(questions) {
  if (!isStorageReady()) {
    return { status: 'unavailable' }
  }

  const raw = window.localStorage.getItem(QUIZ_DRAFT_KEY)
  if (!raw) return { status: 'empty' }

  try {
    const parsed = JSON.parse(raw)
    const expectedHash = buildQuestionIdsHash(questions)

    // schema 对不上：存储结构已升级，旧草稿不可用
    if (parsed?.schemaVersion !== QUIZ_DRAFT_SCHEMA_VERSION) {
      window.localStorage.removeItem(QUIZ_DRAFT_KEY)
      return { status: 'incompatible', reason: 'schema-mismatch' }
    }

    // 题量变化同样视为不兼容（即使哈希碰巧相同）
    if (Number(parsed?.questionCount) !== questions.length) {
      window.localStorage.removeItem(QUIZ_DRAFT_KEY)
      return { status: 'incompatible', reason: 'question-count-mismatch' }
    }

    // 题目 id 序列变化（增删改题）会使指纹失配
    if (parsed?.questionIdsHash !== expectedHash) {
      window.localStorage.removeItem(QUIZ_DRAFT_KEY)
      return { status: 'incompatible', reason: 'question-ids-mismatch' }
    }

    // 超过 7 天未更新则过期，避免很久之后恢复到过时答案
    const updatedAt = Date.parse(String(parsed?.updatedAt || ''))
    if (!Number.isFinite(updatedAt) || Date.now() - updatedAt > QUIZ_DRAFT_TTL_MS) {
      window.localStorage.removeItem(QUIZ_DRAFT_KEY)
      return { status: 'expired' }
    }

    const selectedMode = ['single', 'dual'].includes(parsed?.selectedMode)
      ? parsed.selectedMode
      : null

    const answers = normalizeAnswers(questions, parsed?.answers)
    const dualAnswerSets = normalizeDualAnswerSets(questions, parsed?.dualAnswerSets)

    return {
      status: 'ready',
      draft: {
        selectedMode,
        answers,
        dualAnswerSets,
        activePlayerIdx: parsed?.activePlayerIdx === 1 ? 1 : 0,
        inviteToken: typeof parsed?.inviteToken === 'string' ? parsed.inviteToken : '',
        inviteLink: typeof parsed?.inviteLink === 'string' ? parsed.inviteLink : '',
        enteredFromInvite: Boolean(parsed?.enteredFromInvite),
        dualPlayer1Preview: isPlainObject(parsed?.dualPlayer1Preview) ? parsed.dualPlayer1Preview : null,
        updatedAt: new Date(updatedAt).toISOString(),
      },
    }
  } catch {
    // JSON 损坏：清掉坏键，让调用方按无草稿处理
    window.localStorage.removeItem(QUIZ_DRAFT_KEY)
    return { status: 'invalid-json' }
  }
}

/**
 * 把当前问卷进度写入 localStorage（覆盖整份草稿）
 *
 * @param {Array<{id: string}>} questions 当前题库，用于写入题量与 id 指纹
 * @param {object} draftState 问卷组件中的草稿字段（模式、答案、邀请信息等）
 * @returns {void}
 * @sideeffect setItem(QUIZ_DRAFT_KEY)；无 storage 时直接返回
 */
export function saveQuizDraft(questions, draftState) {
  if (!isStorageReady()) return

  const payload = {
    schemaVersion: QUIZ_DRAFT_SCHEMA_VERSION,
    questionCount: questions.length,
    questionIdsHash: buildQuestionIdsHash(questions),
    selectedMode: draftState.selectedMode ?? null,
    activePlayerIdx: draftState.activePlayerIdx === 1 ? 1 : 0,
    answers: normalizeAnswers(questions, draftState.answers),
    dualAnswerSets: normalizeDualAnswerSets(questions, draftState.dualAnswerSets),
    inviteToken: String(draftState.inviteToken || ''),
    inviteLink: String(draftState.inviteLink || ''),
    enteredFromInvite: Boolean(draftState.enteredFromInvite),
    dualPlayer1Preview: isPlainObject(draftState.dualPlayer1Preview) ? draftState.dualPlayer1Preview : null,
    updatedAt: new Date().toISOString(),
  }

  window.localStorage.setItem(QUIZ_DRAFT_KEY, JSON.stringify(payload))
}

/**
 * 清除本地问卷草稿（提交完成、放弃作答或主动重测时调用）
 *
 * @returns {void}
 * @sideeffect removeItem(QUIZ_DRAFT_KEY)
 */
export function clearQuizDraft() {
  if (!isStorageReady()) return
  window.localStorage.removeItem(QUIZ_DRAFT_KEY)
}
