/**
 * 情侣类型页/结果页配图：
 * - 既支持 public/images/cpti/{CODE}.png
 * - 也支持根目录 images/ 下的增量补图（当前用于 IP 家族）
 */

import IPOD_IMAGE from '../../images/IPOD.png'
import IPOA_IMAGE from '../../images/IPOA.png'
import IPFD_IMAGE from '../../images/IPFD.png'
import IPFA_IMAGE from '../../images/IPFA.png'

const IP_FAMILY_IMAGE_MAP = {
  IPOD: IPOD_IMAGE,
  IPOA: IPOA_IMAGE,
  IPFD: IPFD_IMAGE,
  IPFA: IPFA_IMAGE,
}

/**
 * @param {string} code  如 'SROD'
 * @returns {string}     可直接用于 <img src> 的资源地址
 */
export function getTypeImageSrc(code) {
  const normalized = String(code ?? '').toUpperCase()
  return IP_FAMILY_IMAGE_MAP[normalized] ?? `/images/cpti/${normalized}.png`
}
