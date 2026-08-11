import { motion, useReducedMotion } from 'framer-motion'
import { TYPE_CODES, getTypeImageSrc } from '../../data/typeImages'
import { useLanguage } from '../../i18n/LanguageContext'

/**
 * 首页 Hero 光谱图带 —— 「16 种爱情的颜色」的第一屏可视化
 *
 * 结构（自上而下）：
 *   四色光谱细带 → 16 型配图无限横滚（按四色系排序）→ 行动文案
 *
 * 性能与无障碍：
 * - 单张 webp 均 < 40KB，懒加载 + 懒解码，跑马灯仅平移 transform（GPU 合成层）
 * - 重复序列 aria-hidden，整组对外暴露为一个语义链接
 * - prefers-reduced-motion：停止横滚与光带流动，呈现静态序列
 */
export default function HomeSpectrumMarquee({ onOpenTypes }) {
  const { t } = useLanguage()
  const reduceMotion = useReducedMotion()

  const marqueeRow = (
    <>
      {TYPE_CODES.map((code) => (
        <img
          key={code}
          src={getTypeImageSrc(code)}
          alt=""
          width="72"
          height="90"
          loading="lazy"
          decoding="async"
          draggable="false"
          className="home-marquee-img h-[72px] w-[58px] shrink-0 rounded-lg object-cover shadow-sm ring-1 ring-black/[0.05] sm:h-[90px] sm:w-[72px]"
        />
      ))}
    </>
  )

  return (
    <div className="home-marquee mt-4 md:mt-4">
      {/* 四色光谱细带 —— 品牌签名，带缓慢流光 */}
      <div className="spectrum-ribbon mx-auto" aria-hidden />

      {/* 16 型配图横滚：轨道不截断（overflow-visible），由父级 main 的 overflow-x:hidden 兜底，
          避免 overflow-hidden 容器与内部 absolute 定位冲突导致序列右侧整段被裁 */}
      <button
        type="button"
        onClick={onOpenTypes}
        className="marquee-mask group mt-3 block w-full cursor-pointer overflow-visible py-1 outline-none"
        aria-label={t('home.spectrum_aria')}
      >
        {reduceMotion ? (
          <div className="flex justify-center gap-2 overflow-hidden sm:gap-2.5">{marqueeRow}</div>
        ) : (
          <motion.div
            className="flex w-max gap-2 will-change-transform sm:gap-2.5"
            animate={{ x: ['0%', '-50%'] }}
            transition={{ duration: 48, ease: 'linear', repeat: Infinity }}
          >
            <div className="flex gap-2 sm:gap-2.5">{marqueeRow}</div>
            <div className="flex gap-2 sm:gap-2.5" aria-hidden>{marqueeRow}</div>
          </motion.div>
        )}

        <p className="mt-2 text-center text-[11px] text-base-mute transition-colors duration-200 group-hover:text-brand-cyan">
          {t('home.spectrum_caption')}
        </p>
      </button>
    </div>
  )
}
