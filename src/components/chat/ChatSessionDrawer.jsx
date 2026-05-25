import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
    function onResize() { setMenuOpen(false) }
    window.addEventListener('mousedown', handler)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('mousedown', handler)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [menuOpen])

  function openMenu() {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    // 用视口宽高夹一下，避免菜单在屏幕右侧/底部溢出
    const MENU_W = 128
    const MENU_H = 80
    const left = Math.min(Math.max(rect.right - MENU_W, 8), window.innerWidth - MENU_W - 8)
    const top = Math.min(rect.bottom + 4, window.innerHeight - MENU_H - 8)
    setMenuPos({ top, left })
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
        {/* Portal 到 body：避免被祖先的 backdrop-filter / transform / overflow 影响 fixed 定位 */}
        {menuOpen && menuPos && typeof document !== 'undefined' && createPortal(
          (
            <div
              ref={menuRef}
              className="fixed z-[200] w-32 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-xl"
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
          ),
          document.body,
        )}
      </div>
    </div>
  )
}

function SessionList({ sessions, currentSessionId, onSelectSession, onRenameSession, onDeleteSession, onNewSession, footer }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-3 pb-3 pt-3">
        <button
          type="button"
          onClick={onNewSession}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-cyan py-2.5 text-[13px] font-semibold text-white transition-all hover:opacity-95 active:scale-[0.99]"
        >
          <MessageCirclePlus size={15} />
          新建对话
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 pt-1">
        {sessions.length === 0 ? (
          <p className="px-3 pt-8 text-center text-[12px] leading-6 text-base-mute/80">
            还没有任何对话
          </p>
        ) : (
          <ul className="space-y-0.5">
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

      {footer && <div className="shrink-0 px-3 pb-3 pt-1">{footer}</div>}
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
  collapsed = false,
  footer,
}) {
  if (variant === 'desktop') {
    return (
      <aside
        className={[
          'relative hidden md:flex h-full shrink-0 flex-col overflow-hidden transition-[width] duration-300 ease-out',
          collapsed ? 'w-0' : 'w-[260px]',
        ].join(' ')}
        aria-label="对话历史"
        aria-hidden={collapsed}
      >
        {/* 用一个固定宽度的内层包裹，配合外层 w-0/w-[260px] 切换实现平滑收起 */}
        <div
          className={[
            'flex h-full w-[260px] flex-col transition-opacity duration-200',
            collapsed ? 'pointer-events-none opacity-0' : 'opacity-100',
          ].join(' ')}
        >
          <SessionList
            sessions={sessions}
            currentSessionId={currentSessionId}
            onSelectSession={onSelectSession}
            onRenameSession={onRenameSession}
            onDeleteSession={onDeleteSession}
            onNewSession={onNewSession}
            footer={footer}
          />
        </div>
        {/* 右侧 hairline 列分隔，比 border + bg 更原生 */}
        {!collapsed && (
          <span
            className="pointer-events-none absolute right-0 top-3 bottom-3 w-px bg-gray-100/80"
            aria-hidden
          />
        )}
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
            <div className="flex shrink-0 items-center justify-between px-4 py-3">
              <p className="text-[14px] font-bold text-base-text">对话历史</p>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full text-base-mute hover:bg-black/[0.06] hover:text-base-text"
                aria-label="关闭"
              >
                <X size={17} />
              </button>
            </div>
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
