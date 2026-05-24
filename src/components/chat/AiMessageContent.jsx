function renderInline(text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-semibold text-base-text">{part.slice(2, -2)}</strong>
    }
    return part
  })
}

function isNumberedLine(line) {
  return /^\d+[.、]\s/.test(line.trim())
}

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
