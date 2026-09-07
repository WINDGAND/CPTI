import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { getTypeImageSources } from '../../data/typeImages'
import { useLanguage } from '../../i18n/LanguageContext'

/**
 * 类型配图灯箱：点击类型卡片后全屏放大查看配图。
 *
 * 关闭：背板点击 / Esc / 右上角按钮。配图优先 webp，失败再换 png
 *（与 CoupleTypesPage 的 TypeIllustration 同一套 public/images/cpti 约定）。
 *
 * @param {object} props
 * @param {{ code: string, title: string }} props.type 当前情侣类型（码 + 标题）
 * @param {function(): void} props.onClose 关闭灯箱（背板 / Esc / 按钮共用）
 * @returns {JSX.Element}
 * 副作用：挂载时把 `document.body.style.overflow` 设为 hidden，卸载时还原进入前的值；
 * 无 localStorage、无网络
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
    // 锁滚动；cleanup 必须还原进入前的 overflow，否则关灯箱后页面无法滚动
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
        onClick={(e) => e.stopPropagation()} // 挡住冒泡，避免点图片也被当成点背板而关闭
      >
        <img
          src={src}
          alt={`${type.code} ${type.title}`}
          className="max-h-[76vh] w-auto max-w-full rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 object-contain"
          draggable="false"
          onError={() => {
            // 已是 png 仍失败：不再切 src，否则会反复触发 onError
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
