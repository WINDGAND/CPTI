import { ArrowLeft } from 'lucide-react'
import { getResultThemeClass } from '../../utils/resultTheme'
import AiRelationshipChat from './AiRelationshipChat'

/**
 * AiRelationshipPage —— AI 关系助手页（轻量壳）
 *
 * 改版要点：
 * - 不再有巨大的 "AI 关系助手" H1（Header 导航已经标识当前 Tab）
 * - 全宽沉浸式：没有外层大白卡片，对话直接铺在背景光晕之上
 * - 「返回结果报告」作为左侧紧凑按钮注入到 chat 工具栏，与会话标题在同一行
 * - 高度撑满视口：扣除顶栏（桌面端 80px）与移动端底部 Tab（约 72px + safe-area）
 */
export default function AiRelationshipPage({ resultData, onBackToResult }) {
  const themeClass = getResultThemeClass(resultData)

  const backButton = (
    <button
      type="button"
      onClick={onBackToResult}
      className="group inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-1.5 text-[12.5px] font-semibold text-base-text transition-colors hover:bg-black/[0.045]"
      aria-label="返回结果报告"
    >
      <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" aria-hidden />
      <span className="hidden sm:inline">返回报告</span>
    </button>
  )

  return (
    <div
      className={[
        'relative w-full',
        // 高度：占满视口除去顶栏（移动端再让出底部导航）
        'h-[calc(100dvh-4rem-72px-env(safe-area-inset-bottom))]',
        'sm:h-[calc(100dvh-4.5rem-72px-env(safe-area-inset-bottom))]',
        'md:h-[calc(100dvh-5rem)]',
        themeClass,
      ].join(' ')}
    >
      {/* 背景光晕：极淡的三色 radial，替代以前的大白卡 */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(circle at 12% 18%, rgba(118,184,224,0.16), transparent 30%),' +
            'radial-gradient(circle at 86% 14%, rgba(244,167,176,0.14), transparent 30%),' +
            'radial-gradient(circle at 50% 100%, rgba(142,214,180,0.12), transparent 40%)',
        }}
        aria-hidden
      />

      {/* 极淡的主题色边缘装饰：左上角一道 hairline + accent 短色条 */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 -z-10 hidden md:flex md:items-center md:gap-3 md:px-6 md:pt-3">
        <span
          className="h-[2px] w-12 rounded-full"
          style={{ background: 'var(--poster-accent, #4298b4)', opacity: 0.85 }}
          aria-hidden
        />
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-base-mute">
          ai · companion
        </p>
      </div>

      <div className="relative h-full min-h-0 px-0 md:px-2 md:pb-2 md:pt-9">
        <AiRelationshipChat
          resultData={resultData}
          themeClass={themeClass}
          toolbarLeft={backButton}
        />
      </div>
    </div>
  )
}
