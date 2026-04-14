import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RAW_VALUES } from '../utils/scoring'

/** 返回当前视口是否 >= sm（640px） */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 640
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const handler = (e) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isDesktop
}

/**
 * CPTI 七圆点李克特量表（PRD 3.2.0 / 3.2.1）
 *
 * 视觉规格：
 *   - 7 枚圆点横向排列，中间最小、向两侧渐大（山形）
 *   - 左三枚：青绿色系；中间：中性灰；右三枚：紫色系
 *   - 未选：空心描边
 *   - hover：实心填充 + 白色勾
 *   - 已选：实心填充 + 白色勾（不放大，尺寸固定）
 *   - 两端标签：左绿右紫
 *
 * Props：
 *   value       {number|null}  当前选中索引 (0-6)，null=未选
 *   onChange    {Function}     (index: number, score: number) => void
 *   leftLabel   {string}       左端标签，默认"同意"
 *   rightLabel  {string}       右端标签，默认"不认同"
 */

// ─── 圆点配置表（索引 0-6）─────────────────────────────────
// 尺寸整体上调，山形：index 3 最小(30) → 两侧渐大至 46px
// 每个圆点有两套尺寸：mobile（< sm）和 desktop（≥ sm）
const DOT_CONFIG = [
  { mobile: 30, desktop: 46, borderColor: '#33a474', fillColor: '#33a474', opacity: 1    }, // 0 +3 绿深
  { mobile: 27, desktop: 41, borderColor: '#33a474', fillColor: '#33a474', opacity: 0.75 }, // 1 +2 绿中
  { mobile: 24, desktop: 36, borderColor: '#33a474', fillColor: '#33a474', opacity: 0.5  }, // 2 +1 绿浅
  { mobile: 20, desktop: 30, borderColor: '#D1D5DB', fillColor: '#9CA3AF', opacity: 1    }, // 3  0 灰
  { mobile: 24, desktop: 36, borderColor: '#88619a', fillColor: '#88619a', opacity: 0.5  }, // 4 -1 紫浅
  { mobile: 27, desktop: 41, borderColor: '#88619a', fillColor: '#88619a', opacity: 0.75 }, // 5 -2 紫中
  { mobile: 30, desktop: 46, borderColor: '#6b4a7e', fillColor: '#6b4a7e', opacity: 1    }, // 6 -3 紫深
]

const LEFT_COLOR  = '#33a474'
const RIGHT_COLOR = '#88619a'

// ─── 组件 ─────────────────────────────────────────────────────

export default function LikertScale({
  value = null,
  onChange,
  leftLabel  = '同意',
  rightLabel = '不认同',
}) {
  const [hovered, setHovered] = useState(null)
  const isDesktop = useIsDesktop()

  return (
    <div className="w-full select-none">
      {/* 端点标签行（圆点行上方，单独一行，不会溢出） */}
      <div className="flex justify-between mb-2 px-1">
        <span className="text-xs font-medium" style={{ color: LEFT_COLOR }}>
          {leftLabel}
        </span>
        <span className="text-xs font-medium" style={{ color: RIGHT_COLOR }}>
          {rightLabel}
        </span>
      </div>

      {/* 7 枚圆点横向均匀分布 */}
      <div className="flex items-center justify-between w-full min-h-[44px]">
        {DOT_CONFIG.map((cfg, idx) => {
          const size       = isDesktop ? cfg.desktop : cfg.mobile
          const isSelected = value === idx
          const isHovered  = hovered === idx
          const filled     = isSelected || isHovered
          const score      = RAW_VALUES[idx]
          const checkSize  = Math.round(size * 0.42)

          return (
            <motion.button
              key={idx}
              type="button"
              aria-label={`选项 ${score > 0 ? '+' : ''}${score}`}
              aria-pressed={isSelected}
              onClick={() => { setHovered(null); onChange?.(idx, score) }}
              onMouseEnter={() => setHovered(idx)}
              onMouseLeave={() => setHovered(null)}
              onPointerLeave={() => setHovered(null)}
              style={{
                width:           size,
                height:          size,
                minWidth:        size,
                borderWidth:     2,
                borderStyle:     'solid',
                borderColor:     cfg.borderColor,
                backgroundColor: filled ? cfg.fillColor : 'transparent',
                opacity:         cfg.opacity,
                borderRadius:    '50%',
                cursor:          'pointer',
                outline:         'none',
                padding:         0,
                display:         'flex',
                alignItems:      'center',
                justifyContent:  'center',
                transition:      'background-color 0.15s ease',
                flexShrink:      0,
              }}
              whileTap={{ scale: 0.92 }}
              transition={{ duration: 0.1 }}
            >
              <AnimatePresence>
                {filled && (
                  <motion.svg
                    key="check"
                    width={checkSize}
                    height={checkSize}
                    viewBox="0 0 12 10"
                    fill="none"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.15 }}
                    style={{ pointerEvents: 'none', flexShrink: 0 }}
                  >
                    <polyline
                      points="1.5,5 4.5,8.5 10.5,1.5"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </motion.svg>
                )}
              </AnimatePresence>
            </motion.button>
          )
        })}
      </div>

      {/* 辅助刻度线 */}
      <div
        className="mt-2 h-px"
        style={{
          background:
            'linear-gradient(to right, #33a474, #4298b4, #D1D5DB, #88619a, #6b4a7e)',
          opacity: 0.2,
        }}
      />
    </div>
  )
}
