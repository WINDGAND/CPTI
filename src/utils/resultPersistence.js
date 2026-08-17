/**
 * CPTI 最近一次测评结果本地持久化（浏览器 localStorage）
 *
 * 职责：
 *   - 把刚算出的单人/双人结果写入本地，刷新页面后仍可回到结果页与 AI 助手
 *   - 校验 schema 版本、TTL、以及结果对象是否具备可用的类型码
 *   - 过期、损坏或不完整时主动清除，避免首页/结果页读到半截数据
 *
 * 副作用：save / read / clear 会读写并可能删除 LATEST_RESULT_KEY
 * 服务端 / SSR：无 window.localStorage 时读写均为空操作，不抛错
 */

/** localStorage 键名；升级存储结构时请改 schema 版本或换键 */
export const LATEST_RESULT_KEY = 'cpti:latest-result:v1'
/** 结果载荷 schema 版本；与磁盘上的 schemaVersion 不一致则整份丢弃 */
export const LATEST_RESULT_SCHEMA_VERSION = 'v1'
/** 结果有效期：30 天未更新即过期 */
export const LATEST_RESULT_TTL_MS = 30 * 24 * 60 * 60 * 1000

function isStorageReady() {
  return typeof window !== 'undefined' && !!window.localStorage
}

/** 双人结果看 relationship.code，单人结果看 perception.code；缺一则不可恢复 */
function isResultLike(resultData) {
  const mode = resultData?.mode
  if (mode === 'dual') return !!resultData?.relationship?.code
  return mode === 'single' && !!resultData?.perception?.code
}

/**
 * 把最新测评结果写入 localStorage（覆盖整份载荷）
 *
 * @param {object} resultData 计分后的结果对象（需通过 isResultLike）
 * @param {{now?: function(): number}} [options] 可注入 now()，便于测试 TTL
 * @returns {void}
 * @sideeffect setItem(LATEST_RESULT_KEY)；无 storage 或结果不完整时直接返回
 */
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

/**
 * 读取本地最近结果，并在不兼容 / 过期 / 损坏时清掉对应键
 *
 * @param {{now?: function(): number}} [options] 可注入 now()，便于测试 TTL
 * @returns {{status: string, resultData?: object, updatedAt?: string}}
 *   status:
 *     - unavailable     无 localStorage
 *     - empty           尚无结果
 *     - ready           结果可用
 *     - incompatible    schema 版本不匹配
 *     - expired         超过 30 天 TTL
 *     - invalid-result  缺类型码或 mode 非法
 *     - invalid-json    载荷无法 JSON.parse
 * @sideeffect 不兼容、过期、结果不完整或损坏时会 removeItem(LATEST_RESULT_KEY)
 */
export function readStoredResult(options = {}) {
  if (!isStorageReady()) return { status: 'unavailable' }

  const raw = window.localStorage.getItem(LATEST_RESULT_KEY)
  if (!raw) return { status: 'empty' }

  try {
    const parsed = JSON.parse(raw)

    // schema 对不上：存储结构已升级，旧结果不可用
    if (parsed?.schemaVersion !== LATEST_RESULT_SCHEMA_VERSION) {
      window.localStorage.removeItem(LATEST_RESULT_KEY)
      return { status: 'incompatible' }
    }

    // 超过 30 天未更新则过期，避免把过时结果当成当前关系画像
    const updatedAt = Date.parse(String(parsed?.updatedAt || ''))
    const now = typeof options.now === 'function' ? options.now() : Date.now()
    if (!Number.isFinite(updatedAt) || now - updatedAt > LATEST_RESULT_TTL_MS) {
      window.localStorage.removeItem(LATEST_RESULT_KEY)
      return { status: 'expired' }
    }

    // 缺类型码的半截对象无法驱动结果页 / AI 助手，直接丢弃
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
    // JSON 损坏：清掉坏键，让调用方按无结果处理
    window.localStorage.removeItem(LATEST_RESULT_KEY)
    return { status: 'invalid-json' }
  }
}

/**
 * 清除本地最近结果（重新测评或主动丢弃旧报告时调用）
 *
 * @returns {void}
 * @sideeffect removeItem(LATEST_RESULT_KEY)
 */
export function clearStoredResult() {
  if (!isStorageReady()) return
  window.localStorage.removeItem(LATEST_RESULT_KEY)
}
