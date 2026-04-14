export const INVITE_PARAM_KEY = 'dualInvite'
export const INVITE_SCHEMA_VERSION = 'v1'

function isValidSelectedIndex(value) {
  return Number.isInteger(value) && value >= 0 && value <= 6
}

function buildCompactAnswerString(questions, answers) {
  const compact = questions.map((question) => {
    const value = answers[question.id]
    if (!isValidSelectedIndex(value)) {
      throw new Error(`missing-answer:${question.id}`)
    }
    return String(value)
  }).join('')

  return compact
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

export function encodeDualInvitePayload(questions, answers) {
  const answerString = buildCompactAnswerString(questions, answers)
  return [
    INVITE_SCHEMA_VERSION,
    questions.length,
    answerString,
  ].join('.')
}

export function decodeDualInvitePayload(questions, payload) {
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

export function createDualInviteLink(questions, answers, baseUrl = window.location.href) {
  const url = new URL(baseUrl)
  url.searchParams.set(INVITE_PARAM_KEY, encodeDualInvitePayload(questions, answers))
  return url.toString()
}

export function readDualInviteFromSearch(questions, search = window.location.search) {
  const params = new URLSearchParams(search)
  const payload = params.get(INVITE_PARAM_KEY)

  if (!payload) {
    return { status: 'idle' }
  }

  try {
    return {
      status: 'ready',
      answers: decodeDualInvitePayload(questions, payload),
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown-invite-error'
    return {
      status: 'invalid',
      reason,
    }
  }
}

export function stripDualInviteFromUrl(currentHref = window.location.href) {
  const url = new URL(currentHref)
  url.searchParams.delete(INVITE_PARAM_KEY)
  return `${url.pathname}${url.search}${url.hash}`
}
