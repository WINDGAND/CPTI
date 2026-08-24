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

/**
 * 把对话消息转成可复制的 Markdown 文本（含类型码、模式与免责声明）
 *
 * @param {Array<{ role?: string, content?: string, createdAt?: string }>} messages 会话消息；无 content 的条目会被跳过
 * @param {{ context?: { code?: string, title?: string, mode?: string }, title?: string }} [options]
 * @param {object} [options.context] 当前测评上下文（类型码 / 标题 / 单双人模式）
 * @param {string} [options.title] 文档一级标题；缺省用产品默认标题
 * @returns {string} Markdown 字符串；无网络副作用
 */
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

/**
 * 把文本写入系统剪贴板
 *
 * @param {string} text 待复制内容
 * @returns {Promise<boolean>} 成功 true；SSR、权限拒绝或降级失败则为 false
 * 副作用：优先 `navigator.clipboard.writeText`；失败则插入隐藏 textarea 走 `execCommand('copy')`
 */
export async function copyTextToClipboard(text) {
  if (typeof window === 'undefined') return false
  const value = String(text || '')
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch {
    /* 非安全上下文 / 权限拒绝：降级到 textarea + execCommand */
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

/**
 * 用 html2canvas 把 DOM 节点渲染成 PNG 并触发浏览器下载
 *
 * @param {HTMLElement} node 要截图的根节点
 * @param {{ fileName?: string, backgroundColor?: string, scale?: number }} [options]
 * @param {string} [options.fileName='cpti-ai-chat.png'] 下载文件名
 * @param {string} [options.backgroundColor='#ffffff'] 画布背景色
 * @param {number} [options.scale=2] 渲染倍率，提高清晰度
 * @returns {Promise<Blob>} 生成的 PNG Blob
 * @throws {Error} 节点缺失或 canvas→blob 失败
 * 副作用：动态 import html2canvas；创建临时 `<a download>` 点击下载；1 秒后 revokeObjectURL
 */
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
