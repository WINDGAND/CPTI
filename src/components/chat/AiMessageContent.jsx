/**
 * AI 聊天气泡正文渲染
 *
 * 用户消息：按换行拆成段落，不做 Markdown，避免把输入当标记语言解析。
 * 助手消息：按空行分段；整段均为「1. / 1、」编号行时渲染有序列表，
 * 否则按行输出，行内 **加粗** 转成 <strong>。不引入 Markdown 库。
 */

/**
 * 把行内 **text** 转成加粗节点，其余原样返回（不处理嵌套或未闭合标记）
 *
 * @param {string} text
 * @returns {Array<string|JSX.Element>}
 */
function renderInline(text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-semibold text-base-text">{part.slice(2, -2)}</strong>
    }
    return part
  })
}

/** 是否为「数字 + . 或 、 + 空白」开头的编号行（中英编号都认） */
function isNumberedLine(line) {
  return /^\d+[.、]\s/.test(line.trim())
}

/**
 * 渲染一条聊天消息的正文
 *
 * @param {{ content?: string, isUser?: boolean }} props
 * @param {string} [props.content] 消息文本；空值返回 null
 * @param {boolean} [props.isUser=false] true 时不做列表 / 加粗解析
 * @returns {JSX.Element|JSX.Element[]|null}
 */
export default function AiMessageContent({ content, isUser = false }) {
  if (!content) return null

  if (isUser) {
    return content.split('\n').map((line, index) => (
      <p key={index} className={index > 0 ? 'mt-2' : ''}>
        {line}
      </p>
    ))
  }

  const paragraphs = String(content).split(/\n{2,}/)

  return (
    <div className="space-y-3">
      {paragraphs.map((paragraph, paragraphIndex) => {
        const lines = paragraph.split('\n').map((line) => line.trim()).filter(Boolean)
        const numberedLines = lines.filter(isNumberedLine)

        // 该段每一行都是编号且至少两行：当成有序列表，去掉行首数字以免和 <ol> 标记重复
        if (numberedLines.length >= 2 && numberedLines.length === lines.length) {
          return (
            <ol key={paragraphIndex} className="list-decimal space-y-2 pl-5 marker:font-semibold marker:text-brand-cyan">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex} className="pl-1 leading-7">
                  {renderInline(line.replace(/^\d+[.、]\s*/, ''))}
                </li>
              ))}
            </ol>
          )
        }

        return (
          <div key={paragraphIndex} className="space-y-2">
            {lines.map((line, lineIndex) => {
              const numbered = isNumberedLine(line)
              if (numbered) {
                // 散落的编号行：保留数字强调样式，但不升级成 <ol>
                return (
                  <p key={lineIndex} className="leading-7">
                    <span className="mr-1 font-semibold text-brand-cyan">
                      {line.match(/^\d+[.、]/)?.[0]}
                    </span>
                    {renderInline(line.replace(/^\d+[.、]\s*/, ''))}
                  </p>
                )
              }
              return (
                <p key={lineIndex} className="leading-7">
                  {renderInline(line)}
                </p>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
