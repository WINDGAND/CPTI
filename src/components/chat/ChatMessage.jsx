import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Pencil, Quote, RotateCcw, Trash2 } from 'lucide-react'
import AiMessageContent from './AiMessageContent'
import { useLanguage } from '../../i18n/LanguageContext'

const EDIT_MAX_LENGTH = 800

function formatRelative(input, t) {
  try {
    const d = input ? new Date(input) : new Date()
    if (Number.isNaN(d.getTime())) return ''
    const diff = Date.now() - d.getTime()
    if (diff < 60_000) return t('chat.just_now')
    if (diff < 3_600_000) return t('chat.minutes_ago', { n: Math.floor(diff / 60_000) })
    if (diff < 86_400_000) return t('chat.hours_ago', { n: Math.floor(diff / 3_600_000) })
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
  isLastUser = false,
  isSending = false,
  onCopy,
  onDelete,
  onRegenerate,
  onQuote,
  onEditSave,
  onToggleSelect,
}) {
  const { t } = useLanguage()
  const isUser = message.role === 'user'
  const [justCopied, setJustCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const editTextareaRef = useRef(null)
  const longPressTimer = useRef(null)
  const longPressTriggered = useRef(false)

  useEffect(() => {
    if (!justCopied) return
    const t = setTimeout(() => setJustCopied(false), 1400)
    return () => clearTimeout(t)
  }, [justCopied])

  // 进入编辑模式时聚焦末尾并按内容自适应高度
  useEffect(() => {
    if (!editing) return
    const ta = editTextareaRef.current
    if (!ta) return
    ta.focus()
    try { ta.setSelectionRange(ta.value.length, ta.value.length) } catch { /* ignore */ }
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 240)}px`
  }, [editing])

  // 上游消息内容变化时（例如重新生成路径），同步退出编辑态，避免脏 draft 残留
  useEffect(() => {
    if (!editing) return
    setEditing(false)
    setDraft('')
  }, [message.id])

  function handleCopyClick() {
    onCopy?.(message)
    setJustCopied(true)
  }

  function startEdit() {
    setDraft(message.content || '')
    setEditing(true)
  }
  function cancelEdit() {
    setEditing(false)
    setDraft('')
  }
  function commitEdit() {
    const trimmed = draft.trim()
    if (!trimmed) return
    const original = String(message.content || '').trim()
    setEditing(false)
    setDraft('')
    if (trimmed === original) return // 没变就不重发
    onEditSave?.(message, trimmed)
  }
  function handleEditKeyDown(event) {
    if (event.nativeEvent?.isComposing) return
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      commitEdit()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      cancelEdit()
    }
  }
  function handleEditChange(event) {
    setDraft(event.target.value)
    const ta = event.target
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 240)}px`
  }

  function startLongPress() {
    if (selectionMode || editing) return
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
    if (editing) return
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
            {editing && isUser ? (
              <div className="min-w-[240px]" onClick={(e) => e.stopPropagation()}>
                <textarea
                  ref={editTextareaRef}
                  value={draft}
                  onChange={handleEditChange}
                  onKeyDown={handleEditKeyDown}
                  maxLength={EDIT_MAX_LENGTH}
                  rows={1}
                  className="w-full resize-none rounded-md border border-white/40 bg-white/15 px-2 py-1.5 text-[14px] leading-7 text-white outline-none placeholder:text-white/60 focus:border-white/70"
                  placeholder={t('chat.edit_placeholder')}
                />
                <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-white/65">
                    {t('chat.edit_hint')}
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); cancelEdit() }}
                      className="rounded-md px-2 py-0.5 text-[11.5px] font-semibold text-white/85 hover:bg-white/15"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); commitEdit() }}
                      disabled={!draft.trim()}
                      className="rounded-md bg-white px-2 py-0.5 text-[11.5px] font-semibold text-brand-cyan transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {t('chat.save_resend')}
                    </button>
                  </div>
                </div>
              </div>
            ) : isUser ? (
              <AiMessageContent content={message.content} isUser />
            ) : (
              <>
                {message.content
                  ? <AiMessageContent content={message.content} />
                  : isStreaming
                    ? <span className="inline-flex items-center gap-1 text-base-mute">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-cyan" />
                        <span className="text-xs">{t('chat.typing')}</span>
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
              {formatRelative(message.createdAt, t)}
            </span>
          )}
        </div>

        {/* 操作工具栏 — 仅非流式 & 非选择模式 & 非编辑态时显示 */}
        {!isStreaming && !selectionMode && !editing && (
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
              aria-label={t('chat.copy')}
            >
              {justCopied ? <Check size={12} className="text-brand-cyan" /> : <Copy size={12} />}
              <span className="leading-none">{justCopied ? t('chat.copied') : t('chat.copy')}</span>
            </button>

            {!isUser && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onQuote?.(message) }}
                className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-[11px] hover:bg-black/[0.045] hover:text-base-text"
                aria-label={t('chat.quote_aria')}
              >
                <Quote size={12} />
                <span className="leading-none">{t('chat.quote')}</span>
              </button>
            )}

            {!isUser && isLastAssistant && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRegenerate?.(message) }}
                aria-disabled={isSending ? 'true' : undefined}
                className={[
                  'inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-[11px] hover:bg-black/[0.045] hover:text-base-text',
                  isSending ? 'opacity-60' : '',
                ].join(' ')}
                aria-label={t('chat.regen_aria')}
              >
                <RotateCcw size={12} />
                <span className="leading-none">{t('chat.regen')}</span>
              </button>
            )}

            {isUser && isLastUser && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); startEdit() }}
                className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-[11px] hover:bg-black/[0.045] hover:text-base-text"
                aria-label={t('chat.edit')}
                title={t('chat.edit_title')}
              >
                <Pencil size={12} />
                <span className="leading-none">{t('chat.edit')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete?.(message) }}
              className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-[11px] hover:bg-rose-50 hover:text-rose-600"
              aria-label={t('chat.delete_aria')}
            >
              <Trash2 size={12} />
              <span className="leading-none">{t('chat.delete')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
