import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { TYPE_CODES, getTypeThumbSources } from '../../data/typeImages'
import { useLanguage } from '../../i18n/LanguageContext'

/**
 * 首页 Hero 光谱图带 —— 「16 种爱情的颜色」的第一屏可视化
 *
 * 结构（自上而下）：
 *   四色光谱细带 → 16 型配图无限横滚（按四色系排序）→ 行动文案
 *
 * 性能与无障碍：
 * - 使用 256x256 跑马灯专用缩略图（单张 webp < 10KB，全量约 110KB），首屏直接加载
 * - 加载中与加载失败都落在色系渐变占位上，onError 走 webp → png → 占位 兜底链，
 *   任何网络状况下都不会露出浏览器破图
 * - 跑马灯仅平移 transform（GPU 合成层）；重复序列 aria-hidden
 * - prefers-reduced-motion：停止横滚与光带流动，呈现静态序列
 */

// 四色系占位渐变，与 spectrum-ribbon 的品牌四色一致
const FAMILY_PLACEHOLDER = {
  SR: 'from-[#F4A7B0]/35 to-[#F4A7B0]/70',
  SP: 'from-[#76B8E0]/35 to-[#76B8E0]/70',
  IR: 'from-[#B8A0D0]/35 to-[#B8A0D0]/70',
  IP: 'from-[#8ED6B4]/35 to-[#8ED6B4]/70',
}

function MarqueeImage({ code }) {
  const [stage, setStage] = useState('webp') // webp → png → dead（彻底失败，只留占位）
  const [loaded, setLoaded] = useState(false)
  const thumbs = getTypeThumbSources(code)
  const placeholder = FAMILY_PLACEHOLDER[code.slice(0, 2)] ?? FAMILY_PLACEHOLDER.SR

  return (
    <div
      className={`home-marquee-img relative h-[72px] w-[58px] shrink-0 overflow-hidden rounded-lg bg-gradient-to-br shadow-sm ring-1 ring-black/[0.05] sm:h-[90px] sm:w-[72px] ${placeholder}`}
    >
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold tracking-wider text-white/80">
        {code}
      </span>
      {stage !== 'dead' && (
        <img
          src={stage === 'webp' ? thumbs.webp : thumbs.png}
          alt=""
          width="72"
          height="90"
          decoding="async"
          draggable="false"
          onLoad={() => setLoaded(true)}
          onError={() => setStage(stage === 'webp' ? 'png' : 'dead')}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  )
}

export default function HomeSpectrumMarquee({ onOpenTypes }) {
  const { t } = useLanguage()
  const reduceMotion = useReducedMotion()

  const marqueeRow = (
    <>
      {TYPE_CODES.map((code) => (
        <MarqueeImage key={code} code={code} />
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
