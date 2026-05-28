/**
 * 判定字符串是否以中日韩等表意文字为主（用于决定列表简介的截断阈值）。
 * 取前 80 个字符抽样即可，避免遍历整段长文本。
 */
function isCjkHeavy(text) {
  if (!text) return false
  const sample = text.slice(0, 80)
  let cjk = 0
  for (const ch of sample) {
    const code = ch.codePointAt(0)
    if (!code) continue
    if (
      (code >= 0x3400 && code <= 0x9fff)   // CJK Unified
      || (code >= 0x3040 && code <= 0x30ff) // Hiragana/Katakana
      || (code >= 0xac00 && code <= 0xd7af) // Hangul
    ) {
      cjk += 1
    }
  }
  return cjk / Math.max(sample.length, 1) > 0.35
}

/**
 * 从结果库记录生成「类型列表页」用的一句简介（slogan + 首段提炼）
 *
 * @param {{ slogan?: string, description?: string[] }} result
 * @param {{ emptyFallback?: string, maxLen?: number }} options
 * @returns {string}
 */
export function getTypeListingIntro(result, options = {}) {
  const slogan = (result.slogan ?? '').trim()
  const rawFirst = (result.description?.[0] ?? '').trim().replace(/\s+/g, ' ')

  let body = rawFirst
  // 自适应阈值：中文以字符为单位 120 已经足够；
  // 英文同样 120 字符往往只够一句话的 2/3，因此用更宽的阈值。
  const maxLen = options.maxLen ?? (isCjkHeavy(rawFirst) ? 120 : 220)
  if (body.length > maxLen) {
    const cut = body.slice(0, maxLen)
    const idx = Math.max(
      cut.lastIndexOf('。'),
      cut.lastIndexOf('，'),
      cut.lastIndexOf('；'),
      cut.lastIndexOf('.'),
      cut.lastIndexOf(','),
      cut.lastIndexOf(';'),
    )
    // 英文环境下 minSafe 也按字符 80 算（约一句完整话），中文沿用 40。
    const minSafe = isCjkHeavy(cut) ? 40 : 80
    body = idx > minSafe ? cut.slice(0, idx + 1) : `${cut}…`
  }

  if (slogan && body) {
    return `${slogan} ${body}`.trim()
  }
  return slogan || body || options.emptyFallback || ''
}
