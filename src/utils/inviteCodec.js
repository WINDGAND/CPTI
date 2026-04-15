export const INVITE_PARAM_KEY = 'dualToken'
export const LEGACY_INVITE_PARAM_KEY = 'dualInvite'
export const INVITE_SCHEMA_VERSION = 'v1'
export const SINGLE_SHARE_PARAM_KEY = 'singleShare'
const TOKEN_PATTERN = /^[a-f0-9]{32}$/

function isValidSelectedIndex(value) {
  return Number.isInteger(value) && value >= 0 && value <= 6
}

function buildCompactAnswerString(questions, answers) {
  return questions.map((question) => {
    const value = answers?.[question.id]
    if (!isValidSelectedIndex(value)) {
      throw new Error(`missing-answer:${question.id}`)
    }
    return String(value)
  }).join('')
}

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

export function encodeSingleSharePayload(questions, answers) {
  const answerString = buildCompactAnswerString(questions, answers)
  return [
    INVITE_SCHEMA_VERSION,
    questions.length,
    answerString,
  ].join('.')
}

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

export function createDualInviteLink(token, baseUrl = window.location.href) {
  const normalizedToken = String(token || '').trim().toLowerCase()
  if (!TOKEN_PATTERN.test(normalizedToken)) {
    throw new Error('invalid-token')
  }

  const url = new URL(baseUrl)
  url.searchParams.set(INVITE_PARAM_KEY, normalizedToken)
  url.searchParams.delete(LEGACY_INVITE_PARAM_KEY)
  return url.toString()
}

export function readDualInviteFromSearch(search = window.location.search) {
  const params = new URLSearchParams(search)
  const legacyPayload = params.get(LEGACY_INVITE_PARAM_KEY)
  const token = String(params.get(INVITE_PARAM_KEY) || '').trim().toLowerCase()

  if (!token && !legacyPayload) {
    return { status: 'idle' }
  }

  if (!token && legacyPayload) {
    return { status: 'invalid', reason: 'legacy-link-unsupported' }
  }

  if (!TOKEN_PATTERN.test(token)) {
    return { status: 'invalid', reason: 'invalid-token' }
  }

  return { status: 'ready', token }
}

export function stripDualInviteFromUrl(currentHref = window.location.href) {
  const url = new URL(currentHref)
  url.searchParams.delete(INVITE_PARAM_KEY)
  url.searchParams.delete(LEGACY_INVITE_PARAM_KEY)
  return `${url.pathname}${url.search}${url.hash}`
}

export function createSingleShareLink(questions, answers, baseUrl = window.location.href) {
  const url = new URL(baseUrl)
  url.searchParams.set(SINGLE_SHARE_PARAM_KEY, encodeSingleSharePayload(questions, answers))
  url.searchParams.delete(INVITE_PARAM_KEY)
  url.searchParams.delete(LEGACY_INVITE_PARAM_KEY)
  return url.toString()
}

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

export function stripSingleShareFromUrl(currentHref = window.location.href) {
  const url = new URL(currentHref)
  url.searchParams.delete(SINGLE_SHARE_PARAM_KEY)
  return `${url.pathname}${url.search}${url.hash}`
}
