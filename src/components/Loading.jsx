import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

/**
 * Loading — 光谱融合三幕剧本（PRD 3.2.2 升级版）
 *
 * 三幕（无论何时被资源回调打断都保持视觉完整）：
 *   Act 1 (0~0.5s): 四色点汇聚 — 从外圈轨道向中心收拢
 *   Act 2 (0.5~1.1s): 字母轮转 — S/I·R/P·O/F·D/A 在中心快速闪烁
 *   Act 3 (1.1~∞): 光谱光条 — 中心光晕散开成光谱长条，缓慢呼吸
 *
 * Props:
 *   onDone() — 过渡结束后跳转结果页的回调
 *   minDurationMs — 最短展示时长
 *   preloadTask — 关键资源预热 Promise
 */

const DOTS = [
  { color: '#F4A7B0', label: 'peach' },
  { color: '#76B8E0', label: 'sky' },
  { color: '#B8A0D0', label: 'violet' },
  { color: '#8ED6B4', label: 'mint' },
]

const ORBIT_ANGLES = [0, 90, 180, 270]
const ORBIT_RX = 60
const ORBIT_RY = 38

// 字母轮转序列（4 个维度，每对二元字母）
const LETTERS = ['S', 'I', 'R', 'P', 'O', 'F', 'D', 'A']

export default function Loading({
  onDone,
  minDurationMs = 800,
  preloadTask = Promise.resolve(),
}) {
  const [letterIdx, setLetterIdx] = useState(0)

  // 字母轮转动画（仅在 Act 2 视觉上有意义，但持续运行不影响其它幕）
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const stepMs = 90
    function tick(now) {
      if (now - last >= stepMs) {
        setLetterIdx((i) => (i + 1) % LETTERS.length)
        last = now
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    let cancelled = false
    let minTimer = null
    const minWait = new Promise((resolve) => {
      const waitMs = Math.max(0, minDurationMs)
      minTimer = setTimeout(resolve, waitMs)
    })

    Promise.allSettled([minWait, preloadTask])
      .then(() => {
        if (!cancelled) onDone()
      })

    return () => {
      cancelled = true
      if (minTimer) clearTimeout(minTimer)
    }
  }, [onDone, minDurationMs, preloadTask])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-base-bg overflow-hidden">
      {/* 极淡背景光晕（四色 radial） */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 30% 30%, rgba(244,167,176,0.18), transparent 60%),' +
            'radial-gradient(ellipse 60% 50% at 70% 30%, rgba(118,184,224,0.18), transparent 60%),' +
            'radial-gradient(ellipse 60% 50% at 30% 75%, rgba(184,160,208,0.16), transparent 60%),' +
            'radial-gradient(ellipse 60% 50% at 70% 75%, rgba(142,214,180,0.16), transparent 60%)',
        }}
        aria-hidden
      />

      {/* 主舞台 */}
      <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
        {/* 中心融合光晕 — Act 1 出现，Act 3 散开 */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 80,
            height: 80,
            background:
              'conic-gradient(from 0deg, #F4A7B0, #76B8E0, #B8A0D0, #8ED6B4, #F4A7B0)',
            filter: 'blur(14px)',
          }}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{
            scale: [0.4, 1, 1.15, 1],
            opacity: [0, 0.7, 0.85, 0.7],
            rotate: [0, 60, 180, 360],
          }}
          transition={{
            scale:   { duration: 1.6, times: [0, 0.3, 0.7, 1], ease: 'easeInOut' },
            opacity: { duration: 1.6, times: [0, 0.3, 0.7, 1], ease: 'easeInOut' },
            rotate:  { duration: 6, repeat: Infinity, ease: 'linear' },
          }}
        />

        {/* 四个轨道色点 — Act 1 汇聚后转入慢轨道 */}
        {DOTS.map((dot, i) => {
          const startDeg = ORBIT_ANGLES[i]
          const x0 = ORBIT_RX * Math.cos((startDeg * Math.PI) / 180)
          const y0 = ORBIT_RY * Math.sin((startDeg * Math.PI) / 180)
          const x90 = ORBIT_RX * Math.cos(((startDeg + 90) * Math.PI) / 180)
          const y90 = ORBIT_RY * Math.sin(((startDeg + 90) * Math.PI) / 180)
          const x180 = ORBIT_RX * Math.cos(((startDeg + 180) * Math.PI) / 180)
          const y180 = ORBIT_RY * Math.sin(((startDeg + 180) * Math.PI) / 180)
          const x270 = ORBIT_RX * Math.cos(((startDeg + 270) * Math.PI) / 180)
          const y270 = ORBIT_RY * Math.sin(((startDeg + 270) * Math.PI) / 180)

          return (
            <motion.div
              key={dot.label}
              className="absolute rounded-full"
              style={{
                width: 16,
                height: 16,
                backgroundColor: dot.color,
                filter: 'blur(2px)',
                boxShadow: `0 0 16px ${dot.color}`,
              }}
              initial={{ x: x0 * 1.6, y: y0 * 1.6, scale: 0.6, opacity: 0 }}
              animate={{
                x: [x0 * 1.6, x0, x90, x180, x270, x0],
                y: [y0 * 1.6, y0, y90, y180, y270, y0],
                scale: [0.6, 1.2, 0.9, 1.2, 0.9, 1.2],
                opacity: [0, 1, 0.85, 1, 0.85, 1],
              }}
              transition={{
                x:       { duration: 4, times: [0, 0.15, 0.4, 0.6, 0.8, 1], repeat: Infinity, ease: 'easeInOut' },
                y:       { duration: 4, times: [0, 0.15, 0.4, 0.6, 0.8, 1], repeat: Infinity, ease: 'easeInOut' },
                scale:   { duration: 4, times: [0, 0.15, 0.4, 0.6, 0.8, 1], repeat: Infinity, ease: 'easeInOut' },
                opacity: { duration: 4, times: [0, 0.15, 0.4, 0.6, 0.8, 1], repeat: Infinity, ease: 'easeInOut' },
              }}
            />
          )
        })}

        {/* Act 2 — 中心字母轮转 */}
        <motion.span
          className="relative font-display font-black tabular-nums leading-none"
          style={{
            fontSize: 56,
            background: 'linear-gradient(135deg, #4298b4, #88619a 50%, #33a474)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            mixBlendMode: 'normal',
            zIndex: 2,
          }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
          aria-hidden
        >
          {LETTERS[letterIdx]}
        </motion.span>
      </div>

      {/* 文案区 */}
      <motion.div
        className="mt-10 text-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
      >
        <p className="text-eyebrow mb-1.5">Reading your spectrum</p>
        <p className="text-sm text-base-text font-medium tracking-wide">
          正在分析你们的亲密光谱
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            ...
          </motion.span>
        </p>
      </motion.div>

      {/* Act 3 — 底部光谱细带 */}
      <motion.div
        className="mt-6 h-[3px] rounded-full"
        style={{
          width: 180,
          background: 'linear-gradient(90deg, #F4A7B0, #76B8E0, #B8A0D0, #8ED6B4)',
          boxShadow: '0 0 18px rgba(118,184,224,0.5)',
        }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.8, ease: [0.16, 0.84, 0.34, 1] }}
      />
    </div>
  )
}
