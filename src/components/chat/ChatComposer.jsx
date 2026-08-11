import { useEffect, useRef } from 'react'
import { Send, Square, X } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext'

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
  placeholder,
}) {
  const { t } = useLanguage()
  const ph = placeholder ?? t('chat.composer_placeholder')
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
        <div
          className="mx-auto mb-2 flex w-full max-w-3xl items-start gap-2 rounded-xl px-3 py-2 text-[12.5px] leading-6 text-base-text shadow-[0_2px_8px_-6px_rgba(15,23,42,0.12)]"
          style={{
            border: '1px solid color-mix(in srgb, var(--poster-accent, #4298b4) 22%, transparent)',
            backgroundColor: 'color-mix(in srgb, var(--poster-accent, #4298b4) 7%, white)',
          }}
        >
          <span
            className="mt-1 inline-block h-3.5 w-[3px] shrink-0 rounded-full"
            style={{ backgroundColor: 'color-mix(in srgb, var(--poster-accent, #4298b4) 65%, transparent)' }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p
              className="mb-0.5 text-[10.5px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: 'color-mix(in srgb, var(--poster-accent, #4298b4) 85%, black)' }}
            >
              {t('chat.quote_label')}
            </p>
            <p className="line-clamp-2 text-base-mute">{quoteText}</p>
          </div>
          <button
            type="button"
            onClick={onClearQuote}
            className="shrink-0 rounded-full p-1 text-base-mute hover:bg-black/[0.06] hover:text-base-text"
            aria-label={t('chat.clear_quote')}
          >
            <X size={13} />
          </button>
        </div>
      )}

      <div
        className={[
          'mx-auto flex w-full max-w-3xl items-end gap-2 rounded-[20px] bg-white px-3 py-2',
          'ring-1 ring-black/[0.06] transition-shadow duration-200',
          'focus-within:shadow-[0_8px_28px_-14px_var(--poster-accent,rgba(66,152,180,0.5))]',
        ].join(' ')}
        style={{ '--tw-ring-color': 'transparent' }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={ph}
          rows={1}
          maxLength={MAX_LENGTH}
          disabled={disabled}
          className="min-h-[40px] max-h-[168px] flex-1 resize-none bg-transparent px-1 py-2 text-[14px] leading-7 text-base-text outline-none placeholder:text-gray-400 disabled:opacity-60"
        />

        {isSending && canStop ? (
          <button
            type="submit"
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-rose-50 px-3 text-[12.5px] font-semibold text-rose-600 transition-colors hover:bg-rose-100"
            aria-label={t('chat.stop_aria')}
          >
            <Square size={12} fill="currentColor" />
            {t('chat.stop')}
          </button>
        ) : (
          <button
            type="submit"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white transition-all hover:opacity-95 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
            style={canSend ? {
              backgroundColor: 'var(--poster-accent, #4298b4)',
              boxShadow: '0 6px 16px -8px color-mix(in srgb, var(--poster-accent, #4298b4) 60%, transparent)',
            } : undefined}
            disabled={!canSend}
            aria-label={t('chat.send_aria')}
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
