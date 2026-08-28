/**
 * AI 关系助手 · 分享海报弹层
 *
 * 把当前选中的对话渲染成主题色海报，支持：
 *   1. 复制 Markdown（走 clipboard，失败时按钮短暂显示 fail）
 *   2. 用 html2canvas 把海报 DOM 导出为 PNG 并触发下载
 * 未知 themeClass 回落到湖水蓝 theme-blue，与结果页四大色系默认值一致。
 * 无会话存储副作用；剪贴板 / 下载由 aiChatExport 完成。
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, Download, Image as ImageIcon, Loader2, X } from 'lucide-react'
import { copyTextToClipboard, exportElementAsImage, toMarkdown } from '../../utils/aiChatExport'
import AiMessageContent from './AiMessageContent'
import { useLanguage } from '../../i18n/LanguageContext'

/** 海报头图渐变 + 强调色；键名与结果页 themeClass（粉/蓝/紫/绿）对齐 */
const POSTER_THEME_BG = {
  'theme-pink':   { gradient: 'linear-gradient(160deg, #FFF5F7 0%, #FFE2E8 100%)', accent: '#F4A7B0' },
  'theme-blue':   { gradient: 'linear-gradient(160deg, #F0F8FF 0%, #DCEBF8 100%)', accent: '#76B8E0' },
  'theme-purple': { gradient: 'linear-gradient(160deg, #F8F4FF 0%, #ECE2F6 100%)', accent: '#B8A0D0' },
  'theme-green':  { gradient: 'linear-gradient(160deg, #F0FBF5 0%, #DBF4E6 100%)', accent: '#8ED6B4' },
}

/** 导出文件名与海报页脚用的 YYYY-MM-DD，不走用户语言环境以免路径非法字符 */
function formatExportDate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * 分享弹层：预览海报并导出 Markdown / PNG。不写入 localStorage。
 *
 * @param {object} props
 * @param {boolean} props.open 为 false 时不挂载面板，并复位复制/导出按钮态
 * @param {function} props.onClose 点遮罩或关闭钮
 * @param {Array<{id?: string, role?: string, content?: string}>} [props.messages] 待导出消息；无 content 的条目会被滤掉
 * @param {{ code?: string, title?: string, mode?: string }} [props.context] 测评上下文，写入海报副标题与文件名
 * @param {string} [props.themeClass='theme-blue'] 结果主题类名；未知值回落 theme-blue
 * @param {string} [props.sessionTitle] 海报主标题；缺省用「精选对话」文案
 * @returns {JSX.Element}
 */
export default function ChatShareModal({
  open,
  onClose,
  messages,
  context,
  themeClass = 'theme-blue',
  sessionTitle,
}) {
  const { t } = useLanguage()
  const resolvedSessionTitle = sessionTitle || t('chat.selected_collection_title')
  const posterRef = useRef(null)
  const [copyState, setCopyState] = useState('idle') // idle | done | fail
  const [exportState, setExportState] = useState('idle') // idle | busy | done | fail

  // 未知色系不抛错：海报仍可导出，只是用默认湖水蓝
  const theme = POSTER_THEME_BG[themeClass] || POSTER_THEME_BG['theme-blue']
  // 空气泡不进海报 / Markdown，避免导出一串空白圆角块
  const exportMessages = useMemo(() => (messages || []).filter((m) => m?.content), [messages])

  useEffect(() => {
    if (!open) {
      // 关掉后再开时不应残留「已复制 / 已导出」成功态
      setCopyState('idle')
      setExportState('idle')
    }
  }, [open])

  async function handleCopyMarkdown() {
    // toast 窗口内忽略重复点击，避免连续写剪贴板
    if (copyState === 'done') return
    const md = toMarkdown(exportMessages, { context, title: resolvedSessionTitle })
    const ok = await copyTextToClipboard(md)
    setCopyState(ok ? 'done' : 'fail')
    setTimeout(() => setCopyState('idle'), 1800)
  }

  async function handleExportImage() {
    // html2canvas 进行中再点会叠一张图；busy 直接丢掉
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
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-[calc(env(safe-area-inset-top)+0.75rem)] md:items-center md:p-6"
        >
          <div className="absolute inset-0" onClick={onClose} aria-hidden />

          <motion.div
            key="share-modal-panel"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'tween', ease: [0.22, 0.61, 0.36, 1], duration: 0.28 }}
            className="relative z-10 flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl md:max-h-[min(88dvh,860px)]"
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
              <div>
                <p className="text-eyebrow">{t('chat.share_eyebrow')}</p>
                <h3 className="mt-1 text-[17px] font-bold leading-snug text-base-text">
                  {t('chat.share_modal_title')}
                </h3>
                <p className="mt-1 text-[12px] leading-5 text-base-mute">
                  {context?.code
                    ? t('chat.share_modal_count_with_code', { n: exportMessages.length, code: context.code })
                    : t('chat.share_modal_count_no_code', { n: exportMessages.length })}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full text-base-mute hover:bg-black/[0.06] hover:text-base-text"
                aria-label={t('chat.share_close')}
              >
                <X size={17} />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[1fr_auto]">
              {/* 海报预览 */}
              <div className="min-h-0 overflow-y-auto bg-gray-50/70 p-4 sm:p-5">
                <div className="mx-auto w-full max-w-xl">
                  <p className="mb-2 px-1 text-[11px] uppercase tracking-[0.18em] text-base-mute">{t('chat.share_preview')}</p>
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
                        {t('chat.share_poster_eyebrow')}
                      </p>
                      <h4 className="mt-2 text-[20px] font-extrabold leading-snug text-base-text">
                        {resolvedSessionTitle || t('chat.share_poster_title_fallback')}
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
                          {t('chat.share_empty')}
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
                <p className="text-[11px] uppercase tracking-[0.18em] text-base-mute">{t('chat.share_actions')}</p>

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
                    {exportState === 'busy' && t('chat.share_export_busy')}
                    {exportState === 'idle' && t('chat.share_export_idle')}
                    {exportState === 'done' && t('chat.share_export_done')}
                    {exportState === 'fail' && t('chat.share_export_fail')}
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyMarkdown}
                    disabled={exportMessages.length === 0}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2.5 text-[13px] font-semibold text-base-text transition-colors hover:bg-black/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {copyState === 'done'
                      ? <><Check size={14} className="text-brand-cyan" />{t('chat.share_copy_md_done')}</>
                      : copyState === 'fail'
                        ? <><Copy size={14} className="text-rose-500" />{t('chat.share_copy_md_fail')}</>
                        : <><Copy size={14} />{t('chat.share_copy_md_idle')}</>}
                  </button>
                </div>

                <div className="mt-5 space-y-2 text-[11.5px] leading-5 text-base-mute">
                  <p>{t('chat.share_tip_1')}</p>
                  <p>{t('chat.share_tip_2')}</p>
                  <p>{t('chat.share_tip_3')}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
