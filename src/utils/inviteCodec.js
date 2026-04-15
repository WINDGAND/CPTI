export const INVITE_PARAM_KEY = 'dualToken'
export const LEGACY_INVITE_PARAM_KEY = 'dualInvite'
export const INVITE_SCHEMA_VERSION = 'v1'
const TOKEN_PATTERN = /^[a-f0-9]{32}$/

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
