import { useEffect } from 'react'
import { motion } from 'framer-motion'

/**
 * Loading — 光谱融合过渡页（PRD 3.2.2）
 *
 * 全屏居中光谱动画，2 秒后自动调用 onDone()。
 * Props:
 *   onDone() — 2s 后跳转结果页的回调
 */

// 四大色系对应的圆点颜色（与 tailwind.config 一致）
const DOTS = [
  { color: '#F4A7B0', label: 'peach',  delay: 0    },
  { color: '#76B8E0', label: 'sky',    delay: 0.25 },
  { color: '#B8A0D0', label: 'violet', delay: 0.5  },
  { color: '#8ED6B4', label: 'mint',   delay: 0.75 },
]

// 每个圆在椭圆轨道上的初始角度（度）
const ORBIT_ANGLES = [0, 90, 180, 270]
const ORBIT_RX = 44  // 水平半轴 px
const ORBIT_RY = 28  // 垂直半轴 px

export default function Loading({ onDone }) {
  useEffect(() => {
    const t = setTimeout(() => onDone(), 2000)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-base-bg">
      {/* ── 光谱动画：4 圆轨道旋转 + 中心渐变模糊光晕 ── */}
      <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>

        {/* 中心柔光 */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 60,
            height: 60,
            background:
              'radial-gradient(circle, rgba(140,214,180,0.5) 0%, rgba(182,160,208,0.3) 40%, transparent 70%)',
            filter: 'blur(8px)',
          }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* 4 个轨道圆点 */}
        {DOTS.map((dot, i) => {
          const startDeg = ORBIT_ANGLES[i]
          // 将角度转为弧度计算初始坐标
          const rad0 = (startDeg * Math.PI) / 180
          const x0 = ORBIT_RX * Math.cos(rad0)
          const y0 = ORBIT_RY * Math.sin(rad0)
          // 终点：旋转 360°
          const rad1 = ((startDeg + 360) * Math.PI) / 180
          const x1 = ORBIT_RX * Math.cos(rad1)
          const y1 = ORBIT_RY * Math.sin(rad1)

          return (
            <motion.div
              key={dot.label}
              className="absolute rounded-full"
              style={{
                width: 22,
                height: 22,
                backgroundColor: dot.color,
                filter: 'blur(3px)',
                x: x0,
                y: y0,
              }}
              animate={{
                x: [x0, ORBIT_RX * Math.cos((startDeg + 90) * Math.PI / 180),
                        ORBIT_RX * Math.cos((startDeg + 180) * Math.PI / 180),
                        ORBIT_RX * Math.cos((startDeg + 270) * Math.PI / 180),
                        x1],
                y: [y0, ORBIT_RY * Math.sin((startDeg + 90) * Math.PI / 180),
                        ORBIT_RY * Math.sin((startDeg + 180) * Math.PI / 180),
                        ORBIT_RY * Math.sin((startDeg + 270) * Math.PI / 180),
                        y1],
                scale: [1, 1.25, 1, 1.25, 1],
                opacity: [0.85, 1, 0.85, 1, 0.85],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'linear',
                delay: dot.delay,
                times: [0, 0.25, 0.5, 0.75, 1],
              }}
            />
          )
        })}
      </div>

      {/* 文案 */}
      <motion.p
        className="mt-8 text-sm text-base-mute tracking-wide"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        正在分析你们的亲密光谱...
      </motion.p>
    </div>
  )
}
