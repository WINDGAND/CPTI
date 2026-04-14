const METRIC_STORE_KEY = '__CPTI_IMAGE_METRICS__'

function getStore() {
  if (typeof window === 'undefined') return null
  if (!window[METRIC_STORE_KEY]) {
    window[METRIC_STORE_KEY] = []
  }
  return window[METRIC_STORE_KEY]
}

/**
 * 记录图片加载表现，便于后续灰度验收与问题追踪
 */
export function recordImageMetric({ page, code, status, durationMs, src }) {
  const store = getStore()
  if (!store) return

  const entry = {
    ts: Date.now(),
    page,
    code,
    status,
    durationMs: Number(durationMs ?? 0),
    src: String(src ?? ''),
  }

  store.push(entry)
  if (store.length > 300) {
    store.splice(0, store.length - 300)
  }

  if (import.meta.env.DEV) {
    // 仅开发环境输出，线上避免控制台噪音
    console.debug('[CPTI:image-metric]', entry)
  }
}

