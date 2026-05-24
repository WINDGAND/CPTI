export const LATEST_RESULT_KEY = 'cpti:latest-result:v1'
export const LATEST_RESULT_SCHEMA_VERSION = 'v1'
export const LATEST_RESULT_TTL_MS = 30 * 24 * 60 * 60 * 1000

function isStorageReady() {
  return typeof window !== 'undefined' && !!window.localStorage
}

function isResultLike(resultData) {
  const mode = resultData?.mode
  if (mode === 'dual') return !!resultData?.relationship?.code
  return mode === 'single' && !!resultData?.perception?.code
}

export function saveStoredResult(resultData, options = {}) {
  if (!isStorageReady() || !isResultLike(resultData)) return

  const now = typeof options.now === 'function' ? options.now() : Date.now()
  const payload = {
    schemaVersion: LATEST_RESULT_SCHEMA_VERSION,
    resultData,
    updatedAt: new Date(now).toISOString(),
  }

  window.localStorage.setItem(LATEST_RESULT_KEY, JSON.stringify(payload))
}

export function readStoredResult(options = {}) {
  if (!isStorageReady()) return { status: 'unavailable' }

  const raw = window.localStorage.getItem(LATEST_RESULT_KEY)
  if (!raw) return { status: 'empty' }

  try {
    const parsed = JSON.parse(raw)

    if (parsed?.schemaVersion !== LATEST_RESULT_SCHEMA_VERSION) {
      window.localStorage.removeItem(LATEST_RESULT_KEY)
      return { status: 'incompatible' }
    }

    const updatedAt = Date.parse(String(parsed?.updatedAt || ''))
    const now = typeof options.now === 'function' ? options.now() : Date.now()
    if (!Number.isFinite(updatedAt) || now - updatedAt > LATEST_RESULT_TTL_MS) {
      window.localStorage.removeItem(LATEST_RESULT_KEY)
      return { status: 'expired' }
    }

    if (!isResultLike(parsed?.resultData)) {
      window.localStorage.removeItem(LATEST_RESULT_KEY)
      return { status: 'invalid-result' }
    }

    return {
      status: 'ready',
      resultData: parsed.resultData,
      updatedAt: new Date(updatedAt).toISOString(),
    }
  } catch {
    window.localStorage.removeItem(LATEST_RESULT_KEY)
    return { status: 'invalid-json' }
  }
}

export function clearStoredResult() {
  if (!isStorageReady()) return
  window.localStorage.removeItem(LATEST_RESULT_KEY)
}
