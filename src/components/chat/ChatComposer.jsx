import { useEffect, useRef } from 'react'
import { Send, Square, X } from 'lucide-react'

const MAX_LENGTH = 800

export default function ChatComposer({
  value,
  onChange,
  onSubmit,
  onStop,
  isSending = false,
  canStop = false,
  quoteText = '',
  onClearQuote,
  disabled = false,
  placeholder = '比如：我们总因为计划变化吵架，我该怎么开口？',
}) {
  const textareaRef = useRef(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const maxHeight = 168
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
  }, [value])

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent?.isComposing) {
      event.preventDefault()
      if (!isSending) onSubmit?.()
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (isSending) {
      if (canStop) onStop?.()
      return
    }
    onSubmit?.()
  }

  const trimmedLen = value.length
  const canSend = !!value.trim() && !isSending && !disabled

  return (
    <form
      onSubmit={handleSubmit}
      className="relative w-full"
    >
      {quoteText && (
        <div className="mx-auto mb-2 flex w-full max-w-3xl items-start gap-2 rounded-xl border border-brand-cyan/20 bg-brand-cyan/[0.06] px-3 py-2 text-[12.5px] leading-6 text-base-text shadow-[0_2px_8px_-6px_rgba(15,23,42,0.12)]">
          <span
            className="mt-1 inline-block h-3.5 w-[3px] shrink-0 rounded-full bg-brand-cyan/60"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="mb-0.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-brand-cyan/80">
              引用 AI · Re：
            </p>
            <p className="line-clamp-2 text-base-mute">{quoteText}</p>
          </div>
          <button
            type="button"
            onClick={onClearQuote}
            className="shrink-0 rounded-full p-1 text-base-mute hover:bg-black/[0.06] hover:text-base-text"
            aria-label="清除引用"
          >
            <X size={13} />
          </button>
        </div>
      )}

      <div
        className={[
          'mx-auto flex w-full max-w-3xl items-end gap-2 rounded-[20px] bg-white px-3 py-2 transition-colors',
        ].join(' ')}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          maxLength={MAX_LENGTH}
          disabled={disabled}
          className="min-h-[40px] max-h-[168px] flex-1 resize-none bg-transparent px-1 py-2 text-[14px] leading-7 text-base-text outline-none placeholder:text-gray-400 disabled:opacity-60"
        />

        {isSending && canStop ? (
          <button
            type="submit"
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-rose-50 px-3 text-[12.5px] font-semibold text-rose-600 transition-colors hover:bg-rose-100"
            aria-label="停止生成"
          >
            <Square size={12} fill="currentColor" />
            停止
          </button>
        ) : (
          <button
            type="submit"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-cyan text-white transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
            disabled={!canSend}
            aria-label="发送给 AI 关系助手"
          >
            <Send size={15} />
          </button>
        )}
      </div>

      {/* 字数提示：仅在接近上限时显示，避免常态干扰 */}
      {trimmedLen > MAX_LENGTH - 100 && (
        <div className="mx-auto mt-1 flex w-full max-w-3xl justify-end px-2">
          <span className={['text-[10.5px]', trimmedLen > MAX_LENGTH - 60 ? 'text-rose-500' : 'text-base-mute'].join(' ')}>
            {trimmedLen}/{MAX_LENGTH}
          </span>
        </div>
      )}
    </form>
  )
}
