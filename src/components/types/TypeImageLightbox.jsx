import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { getTypeImageSources } from '../../data/typeImages'
import { useLanguage } from '../../i18n/LanguageContext'

/**
 * 类型配图灯箱 —— 点击类型卡片后放大查看图片
 *
 * - 点击背板 / Esc / 右上角按钮关闭
 * - 打开期间锁定 body 滚动
 * - 图片优先 webp，失败回退 png（与 TypeIllustration 同一套资源约定）
 */
export default function TypeImageLightbox({ type, onClose }) {
  const { t } = useLanguage()
  const sources = getTypeImageSources(type.code)
  const [src, setSrc] = useState(sources.webp)

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return (
    <motion.div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${type.code} ${type.title}`}
    >
      <motion.figure
        className="relative flex max-h-full flex-col items-center"
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.25, ease: [0.16, 0.84, 0.34, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={`${type.code} ${type.title}`}
          className="max-h-[76vh] w-auto max-w-full rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 object-contain"
          draggable="false"
          onError={() => {
            if (src !== sources.png) setSrc(sources.png)
          }}
        />
        <figcaption className="mt-4 text-center">
          <span className="text-xs font-black uppercase tracking-[0.18em] text-white/70">
            {type.code}
          </span>
          <span className="ml-2 text-base font-bold text-white">{type.title}</span>
        </figcaption>
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-2 -right-2 sm:-right-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-base-text shadow-lg transition hover:scale-105"
          aria-label={t('common.close')}
        >
          <X size={17} aria-hidden />
        </button>
      </motion.figure>
    </motion.div>
  )
}
