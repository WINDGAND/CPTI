export const QUIZ_DRAFT_KEY = 'cpti:quiz-draft:v1'
export const QUIZ_DRAFT_SCHEMA_VERSION = 'v1'
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

function hashText(input) {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash.toString(36)
}

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

export function readQuizDraft(questions) {
  if (!isStorageReady()) {
    return { status: 'unavailable' }
  }

  const raw = window.localStorage.getItem(QUIZ_DRAFT_KEY)
  if (!raw) return { status: 'empty' }

  try {
    const parsed = JSON.parse(raw)
    const expectedHash = buildQuestionIdsHash(questions)

    if (parsed?.schemaVersion !== QUIZ_DRAFT_SCHEMA_VERSION) {
      window.localStorage.removeItem(QUIZ_DRAFT_KEY)
      return { status: 'incompatible', reason: 'schema-mismatch' }
    }

    if (Number(parsed?.questionCount) !== questions.length) {
      window.localStorage.removeItem(QUIZ_DRAFT_KEY)
      return { status: 'incompatible', reason: 'question-count-mismatch' }
    }

    if (parsed?.questionIdsHash !== expectedHash) {
      window.localStorage.removeItem(QUIZ_DRAFT_KEY)
      return { status: 'incompatible', reason: 'question-ids-mismatch' }
    }

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
        updatedAt: new Date(updatedAt).toISOString(),
      },
    }
  } catch {
    window.localStorage.removeItem(QUIZ_DRAFT_KEY)
    return { status: 'invalid-json' }
  }
}

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
    updatedAt: new Date().toISOString(),
  }

  window.localStorage.setItem(QUIZ_DRAFT_KEY, JSON.stringify(payload))
}

export function clearQuizDraft() {
  if (!isStorageReady()) return
  window.localStorage.removeItem(QUIZ_DRAFT_KEY)
}
