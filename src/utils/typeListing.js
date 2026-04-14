/**
 * 从结果库记录生成「类型列表页」用的一句简介（slogan + 首段提炼）
 *
 * @param {{ slogan?: string, description?: string[] }} result
 * @returns {string}
 */
export function getTypeListingIntro(result) {
  const slogan = (result.slogan ?? '').trim()
  const rawFirst = (result.description?.[0] ?? '').trim().replace(/\s+/g, ' ')

  let body = rawFirst
  const maxLen = 120
  if (body.length > maxLen) {
    const cut = body.slice(0, maxLen)
    const idx = Math.max(
      cut.lastIndexOf('。'),
      cut.lastIndexOf('，'),
      cut.lastIndexOf('；'),
    )
    body = idx > 40 ? cut.slice(0, idx + 1) : `${cut}…`
  }

  if (slogan && body) {
    return `${slogan} ${body}`.trim()
  }
  return slogan || body || '暂无简介'
}
