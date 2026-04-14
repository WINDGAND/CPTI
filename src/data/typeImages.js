/**
 * 情侣类型页配图：运行时从站点根路径加载 public/images/cpti/{CODE}.png
 * 仓库内原图可放在项目根目录 images/，构建前复制到 public/images/cpti/（与四字母码同名）。
 * 例：SROD.png、IPFA.png
 *
 * @param {string} code  如 'SROD'
 * @returns {string}     站点根路径下的 URL
 */
export function getTypeImageSrc(code) {
  return `/images/cpti/${code}.png`
}
