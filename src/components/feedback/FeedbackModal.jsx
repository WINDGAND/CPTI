import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle } from 'lucide-react'
import { submitFeedback } from '../../utils/feedbackApi'
import { useLanguage } from '../../i18n/LanguageContext'

const MAX_LEN = 2000

export default function FeedbackModal({ open, onClose }) {
  const { t } = useLanguage()
  const [body, setBody] = useState('')
  const [status, setStatus] = useState('idle') // 'idle' | 'submitting' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('')
  const textareaRef = useRef(null)

  useEffect(() => {
    if (open) {
      setBody('')
      setStatus('idle')
      setErrorMsg('')
      // 延迟聚焦，等动画落定
      setTimeout(() => textareaRef.current?.focus(), 120)
    }
  }, [open])

  // 关闭时等动画结束再重置，避免内容闪烁
  function handleClose() {
    if (status === 'submitting') return
    onClose()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = body.trim()
    if (!trimmed) return

    setStatus('submitting')
    setErrorMsg('')

    try {
      await submitFeedback({
        body: trimmed,
        pagePath: window.location.pathname,
      })
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err?.message || t('feedback.submit_failed'))
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="feedback-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center bg-black/40 px-4"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
          <motion.div
            key="feedback-card"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="w-full max-w-sm rounded-card border border-gray-100 bg-white shadow-xl flex flex-col"
            style={{ maxHeight: 'min(90dvh, 520px)' }}
          >
            {/* 标题行（固定不随滚动消失） */}
            <div className="flex shrink-0 items-center justify-between px-5 pt-5 pb-1">
              <h2 className="text-base font-semibold text-base-text">{t('feedback.title')}</h2>
              <button
                type="button"
                onClick={handleClose}
                disabled={status === 'submitting'}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-base-mute hover:bg-gray-100 transition-colors disabled:opacity-40"
                aria-label={t('common.close')}
              >
                <X size={16} />
              </button>
            </div>

            {status === 'success' ? (
              <div className="flex flex-col items-center gap-3 px-5 pt-6 pb-7 text-center overflow-y-auto">
                <CheckCircle size={40} className="text-brand-cyan" />
                <p className="text-sm font-semibold text-base-text">{t('feedback.success_title')}</p>
                <p className="text-xs text-base-mute leading-relaxed">
                  {t('feedback.success_desc')}
                </p>
                <button
                  type="button"
                  className="btn-primary mt-2 px-8"
                  onClick={onClose}
                >
                  {t('common.ok')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="px-5 pt-3 pb-5 space-y-3 overflow-y-auto">
                <p className="text-xs leading-relaxed text-base-mute">
                  {t('feedback.desc')}
                </p>

                <div className="space-y-1">
                  <textarea
                    ref={textareaRef}
                    value={body}
                    onChange={(e) => setBody(e.target.value.slice(0, MAX_LEN))}
                    placeholder={t('feedback.placeholder')}
                    rows={4}
                    className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-base md:text-sm text-base-text placeholder:text-gray-400 focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan transition-colors"
                    disabled={status === 'submitting'}
                    required
                    maxLength={MAX_LEN}
                  />
                  <p className="text-right text-[11px] text-base-mute/70">
                    {body.length} / {MAX_LEN}
                  </p>
                </div>

                {status === 'error' && (
                  <p className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-600">
                    {errorMsg}
                  </p>
                )}

                <div className="flex gap-2 pt-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={status === 'submitting'}
                    className="btn-ghost flex-1 py-2.5 text-sm disabled:opacity-50"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={status === 'submitting' || !body.trim()}
                    className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-50"
                  >
                    {status === 'submitting' ? t('common.submitting') : t('common.submit')}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
