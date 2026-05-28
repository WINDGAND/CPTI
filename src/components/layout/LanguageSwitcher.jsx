import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Globe } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext'

const OPTIONS = [
  { code: 'zh', label: '中文', sub: '简体', flag: '中' },
  { code: 'en', label: 'English', sub: 'EN', flag: 'EN' },
]

/**
 * LanguageSwitcher — 右上角语言切换器
 *
 * 视觉：圆角药丸 + 半透明白底 + 微弱描边 + 柔和投影，
 * 与 Header 内现有 PILL_BASE 视觉语言对齐；展开下拉时使用
 * portal 渲染到 body，避免被祖先 backdrop-filter 影响。
 */
export default function LanguageSwitcher({ compact = false }) {
  const { lang, setLang, t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const triggerRef = useRef(null)
  const popoverRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    function onDocClick(e) {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target)
        && triggerRef.current && !triggerRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }
    function onEsc(e) { if (e.key === 'Escape') setOpen(false) }
    function onScroll() { setOpen(false) }
    function onResize() { setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  function openMenu() {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const MENU_W = 168
    const MENU_H = 132
    const GAP = 8
    let left = rect.right - MENU_W
    if (left < GAP) left = GAP
    if (left + MENU_W > window.innerWidth - GAP) {
      left = window.innerWidth - MENU_W - GAP
    }
    let top = rect.bottom + GAP
    if (top + MENU_H > window.innerHeight - GAP) {
      top = Math.max(GAP, rect.top - MENU_H - GAP)
    }
    setPos({ top, left })
    setOpen(true)
  }

  const current = OPTIONS.find((o) => o.code === lang) || OPTIONS[0]

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        className={[
          'group inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full',
          // 与隔壁"反馈"按钮一致：无背景、无描边、无阴影；hover 时浅灰底
          'text-base-mute transition-colors hover:text-brand-cyan hover:bg-black/[0.035]',
          compact
            ? 'h-9 w-9 sm:w-auto sm:px-3'
            : 'h-11 sm:h-12 w-11 sm:w-auto sm:px-3',
        ].join(' ')}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('language.label')}
        title={t('language.label')}
      >
        <Globe size={17} aria-hidden />
        <span className="hidden sm:inline text-[14px] font-medium leading-none">{current.label}</span>
        <ChevronDown
          size={12}
          className={['hidden sm:inline shrink-0 transition-transform duration-150 opacity-70', open ? 'rotate-180' : ''].join(' ')}
          aria-hidden
        />
      </button>

      {typeof document !== 'undefined' && pos && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              key="lang-popover"
              ref={popoverRef}
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.16, ease: [0.16, 0.84, 0.34, 1] }}
              role="listbox"
              aria-label={t('language.label')}
              className="fixed z-[300] w-[168px] overflow-hidden rounded-2xl border border-gray-100 bg-white py-1.5 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.28)]"
              style={{ top: pos.top, left: pos.left }}
            >
              <div className="px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-base-mute">
                {t('language.label')}
              </div>
              {OPTIONS.map((opt) => {
                const active = opt.code === lang
                return (
                  <button
                    key={opt.code}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => { setLang(opt.code); setOpen(false) }}
                    className={[
                      'group flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors',
                      active ? 'bg-brand-cyan/[0.08] text-base-text' : 'text-base-text hover:bg-black/[0.04]',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-[11px] font-bold tabular-nums',
                        active ? 'bg-brand-cyan text-white' : 'bg-gray-100 text-base-mute',
                      ].join(' ')}
                      aria-hidden
                    >
                      {opt.flag}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold leading-tight">{opt.label}</span>
                      <span className="block text-[10.5px] leading-tight text-base-mute">{opt.sub}</span>
                    </span>
                    {active && <Check size={13} className="shrink-0 text-brand-cyan" aria-hidden />}
                  </button>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  )
}
