import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Quote, RotateCcw, Trash2 } from 'lucide-react'
import AiMessageContent from './AiMessageContent'

function formatRelative(input) {
  try {
    const d = input ? new Date(input) : new Date()
    if (Number.isNaN(d.getTime())) return ''
    const diff = Date.now() - d.getTime()
    if (diff < 60_000) return '刚刚'
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
    const pad = (n) => String(n).padStart(2, '0')
    return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return ''
  }
}

export default function ChatMessage({
  message,
  isStreaming = false,
  isSelected = false,
  selectionMode = false,
  isLastAssistant = false,
  isSending = false,
  onCopy,
  onDelete,
  onRegenerate,
  onQuote,
  onToggleSelect,
}) {
  const isUser = message.role === 'user'
  const [justCopied, setJustCopied] = useState(false)
  const longPressTimer = useRef(null)
  const longPressTriggered = useRef(false)

  useEffect(() => {
    if (!justCopied) return
    const t = setTimeout(() => setJustCopied(false), 1400)
    return () => clearTimeout(t)
  }, [justCopied])

  function handleCopyClick() {
    onCopy?.(message)
    setJustCopied(true)
  }

  function startLongPress() {
    if (selectionMode) return
    longPressTriggered.current = false
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true
      onToggleSelect?.(message)
      if (typeof window !== 'undefined' && navigator?.vibrate) {
        try { navigator.vibrate(15) } catch { /* ignore */ }
      }
    }, 480)
  }
  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }
  function handleClickRow() {
    if (selectionMode) {
      onToggleSelect?.(message)
      return
    }
    if (longPressTriggered.current) {
      longPressTriggered.current = false
    }
  }

  const bubbleColor = isUser
    ? 'bg-brand-cyan text-white shadow-[0_6px_18px_-10px_rgba(66,152,180,0.55)]'
    : 'bg-white text-base-text border border-gray-100 shadow-[0_2px_10px_-6px_rgba(15,23,42,0.10)]'

  return (
    <div
      className={[
        'group/msg relative flex w-full gap-2.5 transition-colors',
        isUser ? 'flex-row-reverse' : 'flex-row',
        selectionMode ? 'cursor-pointer rounded-2xl p-1.5 hover:bg-black/[0.025]' : '',
        isSelected ? 'bg-brand-cyan/[0.07]' : '',
      ].join(' ')}
      onPointerDown={startLongPress}
      onPointerUp={cancelLongPress}
      onPointerLeave={cancelLongPress}
      onPointerCancel={cancelLongPress}
      onClick={handleClickRow}
    >
      {/* 选择圈（仅 selectionMode） */}
      {selectionMode && (
        <div className="self-start pt-2.5">
          <span
            className={[
              'flex h-5 w-5 items-center justify-center rounded-full border transition-all',
              isSelected ? 'border-brand-cyan bg-brand-cyan text-white' : 'border-gray-300 bg-white text-transparent',
            ].join(' ')}
            aria-hidden
          >
            <Check size={12} strokeWidth={3.5} />
          </span>
        </div>
      )}

      {/* AI 侧的"AI"圆点 avatar — 仅在非选择模式下且为助手消息时显示 */}
      {!isUser && !selectionMode && (
        <div className="mt-1 hidden sm:flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-cyan/10 text-brand-cyan">
          <span className="text-[10px] font-bold leading-none">AI</span>
        </div>
      )}

      <div className={['min-w-0 flex-1', isUser ? 'flex flex-col items-end' : ''].join(' ')}>
        <div
          className={[
            'relative max-w-[92%] sm:max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-7',
            bubbleColor,
            isUser ? 'rounded-tr-md' : 'rounded-tl-md',
          ].join(' ')}
        >
          {/* AI 消息左侧主题色锚条 */}
          {!isUser && (
            <span
              className="absolute left-0 top-2.5 bottom-2.5 w-[2.5px] rounded-full"
              style={{ background: 'var(--poster-accent, #4298b4)', opacity: 0.55 }}
              aria-hidden
            />
          )}

          {/* 内容 */}
          <div className={isUser ? '' : 'pl-1.5'}>
            {isUser ? (
              <AiMessageContent content={message.content} isUser />
            ) : (
              <>
                {message.content
                  ? <AiMessageContent content={message.content} />
                  : isStreaming
                    ? <span className="inline-flex items-center gap-1 text-base-mute">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-cyan" />
                        <span className="text-xs">正在思考…</span>
                      </span>
                    : null}
                {isStreaming && message.content && (
                  <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-brand-cyan align-middle" aria-hidden />
                )}
              </>
            )}
          </div>

          {/* 时间戳 — hover 才显示，绝对定位不占行 */}
          {!isStreaming && message.createdAt && (
            <span
              className={[
                'pointer-events-none absolute select-none whitespace-nowrap text-[10.5px] leading-none transition-opacity duration-150',
                isUser ? '-left-2 -translate-x-full bottom-2 text-base-mute' : '-right-2 translate-x-full bottom-2 text-base-mute',
                'opacity-0 group-hover/msg:opacity-100',
              ].join(' ')}
            >
              {formatRelative(message.createdAt)}
            </span>
          )}
        </div>

        {/* 操作工具栏 — 仅非流式 & 非选择模式下，hover/touch 后显示 */}
        {!isStreaming && !selectionMode && (
          <div
            className={[
              'mt-1.5 flex items-center gap-0.5 text-base-mute',
              'opacity-0 transition-opacity duration-150 group-hover/msg:opacity-100 group-focus-within/msg:opacity-100',
              'sm:opacity-0 max-sm:opacity-100',
              isUser ? 'flex-row-reverse' : '',
            ].join(' ')}
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleCopyClick() }}
              className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-[11px] hover:bg-black/[0.045] hover:text-base-text"
              aria-label="复制内容"
            >
              {justCopied ? <Check size={12} className="text-brand-cyan" /> : <Copy size={12} />}
              <span className="leading-none">{justCopied ? '已复制' : '复制'}</span>
            </button>

            {!isUser && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onQuote?.(message) }}
                className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-[11px] hover:bg-black/[0.045] hover:text-base-text"
                aria-label="引用回复"
              >
                <Quote size={12} />
                <span className="leading-none">引用</span>
              </button>
            )}

            {!isUser && isLastAssistant && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRegenerate?.(message) }}
                disabled={isSending}
                className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-[11px] hover:bg-black/[0.045] hover:text-base-text disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="重新生成回复"
              >
                <RotateCcw size={12} />
                <span className="leading-none">重新生成</span>
              </button>
            )}

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete?.(message) }}
              className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-[11px] hover:bg-rose-50 hover:text-rose-600"
              aria-label="删除这条"
            >
              <Trash2 size={12} />
              <span className="leading-none">删除</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
