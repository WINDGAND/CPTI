import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, Download, Image as ImageIcon, Loader2, X } from 'lucide-react'
import { copyTextToClipboard, exportElementAsImage, toMarkdown } from '../../utils/aiChatExport'
import AiMessageContent from './AiMessageContent'

const POSTER_THEME_BG = {
  'theme-pink':   { gradient: 'linear-gradient(160deg, #FFF5F7 0%, #FFE2E8 100%)', accent: '#F4A7B0' },
  'theme-blue':   { gradient: 'linear-gradient(160deg, #F0F8FF 0%, #DCEBF8 100%)', accent: '#76B8E0' },
  'theme-purple': { gradient: 'linear-gradient(160deg, #F8F4FF 0%, #ECE2F6 100%)', accent: '#B8A0D0' },
  'theme-green':  { gradient: 'linear-gradient(160deg, #F0FBF5 0%, #DBF4E6 100%)', accent: '#8ED6B4' },
}

function formatExportDate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function ChatShareModal({
  open,
  onClose,
  messages,
  context,
  themeClass = 'theme-blue',
  sessionTitle = '对话精选',
}) {
  const posterRef = useRef(null)
  const [copyState, setCopyState] = useState('idle') // idle | done | fail
  const [exportState, setExportState] = useState('idle') // idle | busy | done | fail

  const theme = POSTER_THEME_BG[themeClass] || POSTER_THEME_BG['theme-blue']
  const exportMessages = useMemo(() => (messages || []).filter((m) => m?.content), [messages])

  useEffect(() => {
    if (!open) {
      setCopyState('idle')
      setExportState('idle')
    }
  }, [open])

  async function handleCopyMarkdown() {
    if (copyState === 'done') return
    const md = toMarkdown(exportMessages, { context, title: sessionTitle })
    const ok = await copyTextToClipboard(md)
    setCopyState(ok ? 'done' : 'fail')
    setTimeout(() => setCopyState('idle'), 1800)
  }

  async function handleExportImage() {
    if (exportState === 'busy') return
    setExportState('busy')
    try {
      await exportElementAsImage(posterRef.current, {
        fileName: `CPTI-${context?.code || 'AI'}-chat-${formatExportDate()}.png`,
        backgroundColor: '#ffffff',
        scale: 2,
      })
      setExportState('done')
      setTimeout(() => setExportState('idle'), 1800)
    } catch (err) {
      console.error('[ChatShareModal] export image failed', err)
      setExportState('fail')
      setTimeout(() => setExportState('idle'), 2200)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="share-modal-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 px-3 pb-3 pt-10 md:items-center md:py-6"
        >
          <div className="absolute inset-0" onClick={onClose} aria-hidden />

          <motion.div
            key="share-modal-panel"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'tween', ease: [0.22, 0.61, 0.36, 1], duration: 0.28 }}
            className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
              <div>
                <p className="text-eyebrow">Share · Export</p>
                <h3 className="mt-1 text-[17px] font-bold leading-snug text-base-text">
                  分享 / 导出当前对话
                </h3>
                <p className="mt-1 text-[12px] leading-5 text-base-mute">
                  共 {exportMessages.length} 条消息 · {context?.code ? `${context.code} 结果` : 'CPTI 助手'}
                </p>
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

            <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[1fr_auto]">
              {/* 海报预览 */}
              <div className="min-h-0 overflow-y-auto bg-gray-50/70 p-4 sm:p-5">
                <div className="mx-auto w-full max-w-xl">
                  <p className="mb-2 px-1 text-[11px] uppercase tracking-[0.18em] text-base-mute">Preview</p>
                  <div
                    ref={posterRef}
                    className={`overflow-hidden rounded-2xl shadow-[0_18px_60px_-25px_rgba(15,23,42,0.4)] ${themeClass}`}
                    style={{ background: '#fff' }}
                  >
                    <div
                      className="relative px-6 pt-8 pb-6"
                      style={{ background: theme.gradient }}
                    >
                      <p
                        className="font-display text-[11px] font-semibold uppercase tracking-[0.18em]"
                        style={{ color: theme.accent }}
                      >
                        CPTI · AI Relationship
                      </p>
                      <h4 className="mt-2 text-[20px] font-extrabold leading-snug text-base-text">
                        {sessionTitle || '关于我们的一段对话'}
                      </h4>
                      <div className="mt-2 flex items-center gap-2.5">
                        <span
                          className="h-[3px] w-9 rounded-full"
                          style={{ background: theme.accent, opacity: 0.85 }}
                        />
                        <p className="text-[12px] font-semibold text-base-mute">
                          <span className="text-base-text">{context?.code || 'CPTI'}</span>
                          {context?.title ? ` · ${context.title}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4 px-6 py-6">
                      {exportMessages.length === 0 ? (
                        <p className="py-10 text-center text-[13px] text-base-mute">
                          这条对话还没有内容可以导出。
                        </p>
                      ) : (
                        exportMessages.map((msg) => {
                          const isUser = msg.role === 'user'
                          return (
                            <div key={msg.id} className={['flex', isUser ? 'justify-end' : 'justify-start'].join(' ')}>
                              <div
                                className={[
                                  'max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-7',
                                  isUser ? 'text-white' : 'border border-gray-100 bg-white text-base-text',
                                ].join(' ')}
                                style={isUser ? { background: theme.accent } : null}
                              >
                                {isUser
                                  ? <AiMessageContent content={msg.content} isUser />
                                  : <AiMessageContent content={msg.content} />}
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-black/5 px-6 py-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-base-mute">
                        cpti · couple type indicator
                      </p>
                      <p className="text-[10px] text-base-mute">{formatExportDate()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 操作面板 */}
              <div className="shrink-0 border-t border-gray-100 bg-white p-4 md:w-[260px] md:border-l md:border-t-0 md:p-5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-base-mute">Actions</p>

                <div className="mt-3 space-y-2.5">
                  <button
                    type="button"
                    onClick={handleExportImage}
                    disabled={exportState === 'busy' || exportMessages.length === 0}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-cyan py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_24px_-12px_rgba(66,152,180,0.6)] transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {exportState === 'busy' && <Loader2 size={14} className="animate-spin" />}
                    {exportState === 'idle' && <ImageIcon size={14} />}
                    {exportState === 'done' && <Check size={14} />}
                    {exportState === 'fail' && <Download size={14} />}
                    {exportState === 'busy' && '正在生成长图...'}
                    {exportState === 'idle' && '导出为长图（PNG）'}
                    {exportState === 'done' && '已保存到下载'}
                    {exportState === 'fail' && '生成失败，再试一次'}
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyMarkdown}
                    disabled={exportMessages.length === 0}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2.5 text-[13px] font-semibold text-base-text transition-colors hover:bg-black/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {copyState === 'done'
                      ? <><Check size={14} className="text-brand-cyan" />已复制 Markdown</>
                      : copyState === 'fail'
                        ? <><Copy size={14} className="text-rose-500" />复制失败，再试一次</>
                        : <><Copy size={14} />复制为 Markdown</>}
                  </button>
                </div>

                <div className="mt-5 space-y-2 text-[11.5px] leading-5 text-base-mute">
                  <p>· 长图按当前主题色生成，可保存或转发到任意社交平台。</p>
                  <p>· Markdown 文本可粘贴到笔记 / 飞书 / Notion 等。</p>
                  <p>· 分享前请确认对话里没有不希望公开的隐私信息。</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
