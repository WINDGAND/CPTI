/**
 * 情侣类型页/结果页配图统一入口：
 * - 所有 16 型资产统一放在 public/images/cpti/
 * - 优先加载 webp，失败回退 png
 */

export const TYPE_CODES = [
  'SROD', 'SROA', 'SRFD', 'SRFA',
  'SPOD', 'SPOA', 'SPFD', 'SPFA',
  'IROD', 'IROA', 'IRFD', 'IRFA',
  'IPOD', 'IPOA', 'IPFD', 'IPFA',
]

function normalizeTypeCode(code) {
  return String(code ?? '').toUpperCase()
}

/**
 * @param {string} code
 * @returns {{ webp: string, png: string }}
 */
export function getTypeImageSources(code) {
  const normalized = normalizeTypeCode(code)
  return {
    webp: `/images/cpti/${normalized}.webp`,
    png: `/images/cpti/${normalized}.png`,
  }
}

/**
 * @param {string} code
 * @returns {string} 优先资源（webp）
 */
export function getTypeImageSrc(code) {
  return getTypeImageSources(code).webp
}

export function getTypeImageFallbackSrc(code) {
  return getTypeImageSources(code).png
}

/**
 * 预热指定类型图片（优先 webp，失败回退 png）
 * @param {string} code
 * @returns {Promise<string>}
 */
export function preloadTypeImage(code) {
  if (typeof window === 'undefined') {
    return Promise.resolve(getTypeImageSrc(code))
  }

  const { webp, png } = getTypeImageSources(code)

  return new Promise((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(webp)
    img.onerror = () => {
      const fallback = new Image()
      fallback.decoding = 'async'
      fallback.onload = () => resolve(png)
      fallback.onerror = () => resolve(png)
      fallback.src = png
    }
    img.src = webp
  })
}
