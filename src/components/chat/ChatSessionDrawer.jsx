import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, MessageCirclePlus, MoreHorizontal, Pencil, Trash2, X } from 'lucide-react'

function formatSessionTime(input) {
  try {
    const d = new Date(input)
    if (Number.isNaN(d.getTime())) return ''
    const diff = Date.now() - d.getTime()
    if (diff < 60_000) return '刚刚'
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
    const pad = (n) => String(n).padStart(2, '0')
    return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  } catch {
    return ''
  }
}

function SessionRow({ session, isCurrent, onSelect, onRename, onDelete }) {
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(session.title || '')
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState(null)
  const menuRef = useRef(null)
  const triggerRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    function handler(e) {
      if (
        menuRef.current && !menuRef.current.contains(e.target)
        && triggerRef.current && !triggerRef.current.contains(e.target)
      ) {
        setMenuOpen(false)
      }
    }
    function onScroll() { setMenuOpen(false) }
    window.addEventListener('mousedown', handler)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('mousedown', handler)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [menuOpen])

  function openMenu() {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) {
      setMenuPos({ top: rect.bottom + 4, left: rect.right - 128 })
    }
    setMenuOpen(true)
  }

  useEffect(() => {
    if (renaming) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [renaming])

  function startRename() {
    setMenuOpen(false)
    setDraft(session.title || '')
    setRenaming(true)
  }

  function commitRename() {
    const next = draft.trim().slice(0, 40)
    setRenaming(false)
    if (next && next !== session.title) {
      onRename?.(session.id, next)
    }
  }

  function cancelRename() {
    setRenaming(false)
    setDraft(session.title || '')
  }

  return (
    <div
      className={[
        'group/row relative flex items-center gap-2 rounded-xl px-2.5 py-2.5 transition-colors',
        isCurrent ? 'bg-brand-cyan/[0.10]' : 'hover:bg-black/[0.045]',
      ].join(' ')}
    >
      {isCurrent && (
        <span
          className="absolute left-0 top-2.5 bottom-2.5 w-[2.5px] rounded-full"
          style={{ background: 'var(--poster-accent, #4298b4)', opacity: 0.85 }}
          aria-hidden
        />
      )}

      <button
        type="button"
        className="min-w-0 flex-1 text-left disabled:cursor-default"
        onClick={() => !renaming && onSelect?.(session.id)}
        disabled={renaming}
      >
        {renaming ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              else if (e.key === 'Escape') cancelRename()
            }}
            onBlur={commitRename}
            maxLength={40}
            className="w-full rounded-md border border-brand-cyan/50 bg-white px-2 py-1 text-[13px] leading-5 text-base-text outline-none focus:border-brand-cyan"
          />
        ) : (
          <p
            className={[
              'truncate text-[13.5px] font-semibold leading-snug',
              isCurrent ? 'text-base-text' : 'text-base-text/90',
            ].join(' ')}
            title={session.title}
          >
            {session.title || '新的对话'}
          </p>
        )}
        <p className="mt-0.5 flex items-center gap-2 text-[11px] leading-none text-base-mute">
          <span>{(session.messages || []).length} 条</span>
          <span>·</span>
          <span>{formatSessionTime(session.updatedAt || session.createdAt)}</span>
        </p>
      </button>

      <div className="shrink-0">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => (menuOpen ? setMenuOpen(false) : openMenu())}
          className={[
            'flex h-7 w-7 items-center justify-center rounded-md text-base-mute transition-all',
            'opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100',
            'hover:bg-black/[0.06] hover:text-base-text',
            isCurrent ? 'opacity-100' : '',
            renaming ? 'pointer-events-none opacity-0' : '',
          ].join(' ')}
          aria-label="会话操作"
        >
          <MoreHorizontal size={14} />
        </button>
        {menuOpen && menuPos && (
          <div
            ref={menuRef}
            className="fixed z-[100] w-32 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-xl"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <button
              type="button"
              onClick={startRename}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] text-base-text hover:bg-black/[0.045]"
            >
              <Pencil size={12} />
              重命名
            </button>
            <button
              type="button"
              onClick={() => { setMenuOpen(false); onDelete?.(session.id) }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] text-rose-600 hover:bg-rose-50"
            >
              <Trash2 size={12} />
              删除
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function SessionList({ sessions, currentSessionId, onSelectSession, onRenameSession, onDeleteSession, onNewSession, footer }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-3 pb-3 pt-1">
        <button
          type="button"
          onClick={onNewSession}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-cyan py-2.5 text-[13px] font-semibold text-white transition-all hover:opacity-95 active:scale-[0.99]"
        >
          <MessageCirclePlus size={15} />
          新建对话
        </button>
      </div>

      <div className="hairline-t shrink-0" />

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {sessions.length === 0 ? (
          <p className="px-3 py-6 text-center text-[12px] leading-6 text-base-mute">
            还没有任何对话。点击上方「新建对话」开始第一段。
          </p>
        ) : (
          <ul className="space-y-1">
            {sessions.map((s) => (
              <li key={s.id}>
                <SessionRow
                  session={s}
                  isCurrent={s.id === currentSessionId}
                  onSelect={onSelectSession}
                  onRename={onRenameSession}
                  onDelete={onDeleteSession}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {footer && <div className="hairline-t shrink-0 px-3 py-3">{footer}</div>}
    </div>
  )
}

export default function ChatSessionDrawer({
  sessions,
  currentSessionId,
  open,
  onClose,
  onSelectSession,
  onNewSession,
  onRenameSession,
  onDeleteSession,
  variant = 'mobile',
  footer,
}) {
  if (variant === 'desktop') {
    return (
      <aside
        className="hidden md:flex h-full w-[260px] shrink-0 flex-col rounded-2xl border border-gray-100 bg-white/85 backdrop-blur-sm"
        aria-label="对话历史"
      >
        <div className="shrink-0 px-4 pt-4">
          <p className="text-eyebrow">Conversations</p>
          <p className="mt-1 text-[12px] leading-5 text-base-mute">
            仅保存在当前浏览器，最多 20 条。
          </p>
        </div>
        <SessionList
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={onSelectSession}
          onRenameSession={onRenameSession}
          onDeleteSession={onDeleteSession}
          onNewSession={onNewSession}
          footer={footer}
        />
      </aside>
    )
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="drawer-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[60] bg-black/35 md:hidden"
            onClick={onClose}
          />
          <motion.aside
            key="drawer-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', ease: [0.22, 0.61, 0.36, 1], duration: 0.28 }}
            className="fixed bottom-0 right-0 top-0 z-[70] flex w-[88vw] max-w-[340px] flex-col bg-white shadow-2xl md:hidden"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
            aria-label="对话历史"
          >
            <div className="flex shrink-0 items-center justify-between px-4 py-4">
              <div>
                <p className="text-eyebrow">Conversations</p>
                <p className="mt-1 text-[12px] leading-5 text-base-mute">仅保存在当前浏览器，最多 20 条。</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full text-base-mute hover:bg-black/[0.06] hover:text-base-text"
                aria-label="关闭"
              >
                <X size={17} />
              </button>
            </div>
            <div className="hairline-t shrink-0" />
            <SessionList
              sessions={sessions}
              currentSessionId={currentSessionId}
              onSelectSession={(id) => { onSelectSession?.(id); onClose?.() }}
              onRenameSession={onRenameSession}
              onDeleteSession={onDeleteSession}
              onNewSession={() => { onNewSession?.(); onClose?.() }}
              footer={footer}
            />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

export { Check }
