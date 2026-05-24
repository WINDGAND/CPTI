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
        // 高度：占满视口除去浮空顶栏 + 移动端再让出浮空底部导航（含 safe-area）
        // 浮空底部 Tab 约 86px = 浮空 pill 自身 ~74px + 外壳 pb 12px
        'h-[calc(100dvh-4rem-86px-env(safe-area-inset-bottom))]',
        'sm:h-[calc(100dvh-4.5rem-86px-env(safe-area-inset-bottom))]',
        'md:h-[calc(100dvh-5rem)]',
        themeClass,
      ].join(' ')}
    >
      {/* 背景光晕：fixed 覆盖整个视口，让主题渐变与 AppShell 周围背景无缝衔接
       * 避免在大屏（视口 > max-w-6xl）下出现"渐变块嵌在白底里"的割裂感
       * 跟随 AI 助手页生命周期：进入页面时显示，离开时随组件 unmount 自动消失 */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(circle at 12% 18%, rgba(118,184,224,0.18), transparent 32%),' +
            'radial-gradient(circle at 86% 14%, rgba(244,167,176,0.16), transparent 32%),' +
            'radial-gradient(circle at 50% 100%, rgba(142,214,180,0.14), transparent 42%)',
        }}
        aria-hidden
      />

      {/* 主体内容外层 padding：仅桌面端，让卡片不贴视口边缘，呈现浮空感 */}
      <div className="relative h-full min-h-0 md:px-3 md:pb-3 lg:px-4 lg:pb-4">
        {/* 柔和半透明卡片容器：
         *   - 半透明白底 + backdrop-blur，能透出底层主题渐变，不死板
         *   - 大圆角 + 极淡描边 + 微妙阴影，跟周围渐变形成清晰视觉分区
         *   - 仅 md+ 启用卡片效果，移动端保持全屏沉浸（避免双层 padding 浪费空间）
         */}
        <div
          className={[
            'relative h-full min-h-0 overflow-hidden',
            'md:rounded-[28px] md:bg-white/55 md:backdrop-blur-md',
            'md:ring-1 md:ring-white/55',
            'md:shadow-[0_20px_60px_-30px_rgba(15,23,42,0.18)]',
          ].join(' ')}
        >
          <AiRelationshipChat
            resultData={resultData}
            themeClass={themeClass}
            toolbarLeft={backButton}
          />
        </div>
      </div>
    </div>
  )
}
