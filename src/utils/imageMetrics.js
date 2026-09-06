/**
 * CPTI 图片加载埋点（浏览器内存环形缓冲）
 *
 * 职责：把类型配图 / 缩略图的加载结果记到 `window.__CPTI_IMAGE_METRICS__`，
 * 方便灰度验收时对照 page + code + status + 耗时，不落盘、不发网络。
 *
 * 约定：
 *   - 仅浏览器有 `window` 时生效；SSR / Node 直接空操作
 *   - 缓冲上限 300 条，超出丢掉最旧记录，避免长会话撑爆内存
 *   - 开发环境额外 `console.debug`，生产构建不打控制台
 */

const METRIC_STORE_KEY = '__CPTI_IMAGE_METRICS__'

/** 取（或惰性创建）挂在 window 上的环形数组；无 window 返回 null */
function getStore() {
  if (typeof window === 'undefined') return null
  if (!window[METRIC_STORE_KEY]) {
    window[METRIC_STORE_KEY] = []
  }
  return window[METRIC_STORE_KEY]
}

/**
 * 追加一条图片加载记录
 *
 * @param {object} payload
 * @param {string} payload.page 页面标识，如 types / home / result
 * @param {string} payload.code 情侣类型码，如 SROD
 * @param {string} payload.status 加载结果：ok / fallback / error 等调用方约定值
 * @param {number} [payload.durationMs] 耗时毫秒；缺省按 0
 * @param {string} [payload.src] 实际请求的资源 URL
 * @returns {void}
 * 副作用：写入 `window.__CPTI_IMAGE_METRICS__`；DEV 下打 debug 日志。无 localStorage、无网络
 */
export function recordImageMetric({ page, code, status, durationMs, src }) {
  const store = getStore()
  // SSR / 无 window：埋点无接收端，直接跳过
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
    // 只保留最近 300 条，从头部丢掉溢出部分
    store.splice(0, store.length - 300)
  }

  if (import.meta.env.DEV) {
    // 仅开发环境输出，线上避免控制台噪音
    console.debug('[CPTI:image-metric]', entry)
  }
}

