/**
 * AI 关系助手 · 导出工具
 *
 * 两种导出形态：
 *   1. toMarkdown(messages, context)   — 转 Markdown 字符串
 *   2. copyTextToClipboard(text)       — 写入剪贴板（带降级方案）
 *   3. exportElementAsImage(node, ...) — 用 html2canvas 把指定 DOM 渲染成 PNG，触发下载
 */

function formatTimestamp(input) {
  try {
    const d = input ? new Date(input) : new Date()
    if (Number.isNaN(d.getTime())) return ''
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return ''
  }
}

export function toMarkdown(messages, { context, title } = {}) {
  const header = []
  const heading = title || 'CPTI · AI 关系助手对话'
  header.push(`# ${heading}`)
  header.push('')
  if (context?.code) {
    const meta = []
    meta.push(`类型：**${context.code}**${context.title ? ` · ${context.title}` : ''}`)
    meta.push(`导出时间：${formatTimestamp(new Date())}`)
    meta.push(`模式：${context.mode === 'dual' ? '双人拼图' : '单人感知'}`)
    header.push(meta.join('  \n'))
    header.push('')
  }
  header.push('---')
  header.push('')

  const body = (Array.isArray(messages) ? messages : [])
    .filter((m) => m?.content)
    .map((m) => {
      const who = m.role === 'user' ? '🧑 我' : '🤖 AI 关系助手'
      const time = m.createdAt ? ` _${formatTimestamp(m.createdAt)}_` : ''
      return `**${who}**${time}\n\n${String(m.content).trim()}`
    })
    .join('\n\n---\n\n')

  const footer = '\n\n---\n\n> 提醒：AI 仅提供沟通参考，不能替代心理咨询、医疗建议或现实安全求助。'
  return `${header.join('\n')}${body}${footer}`
}

export async function copyTextToClipboard(text) {
  if (typeof window === 'undefined') return false
  const value = String(text || '')
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch {
    /* 降级到 textarea + execCommand */
  }
  try {
    const textarea = document.createElement('textarea')
    textarea.value = value
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    textarea.style.pointerEvents = 'none'
    textarea.setAttribute('readonly', 'readonly')
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}

export async function exportElementAsImage(node, { fileName = 'cpti-ai-chat.png', backgroundColor = '#ffffff', scale = 2 } = {}) {
  if (!node) throw new Error('export target missing')
  const { default: html2canvas } = await import('html2canvas')
  const canvas = await html2canvas(node, {
    backgroundColor,
    scale,
    useCORS: true,
    logging: false,
    windowWidth: node.scrollWidth,
    windowHeight: node.scrollHeight,
  })
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('export blob failed'))
        return
      }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      resolve(blob)
    }, 'image/png', 0.95)
  })
}
