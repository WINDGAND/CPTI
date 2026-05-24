import { ArrowLeft, ClipboardList, Sparkles } from 'lucide-react'
import { buildAiRelationshipContext } from '../../utils/aiChatContext'
import { getResultThemeClass } from '../../utils/resultTheme'
import AiRelationshipChat from './AiRelationshipChat'

export default function AiRelationshipPage({ resultData, onBackToResult }) {
  const context = buildAiRelationshipContext(resultData)
  const themeClass = getResultThemeClass(resultData)

  return (
    <div className={`flex min-h-[calc(100dvh-4rem)] flex-col md:min-h-0 md:pb-10 ${themeClass}`}>
      {/* Hero — 去外层大白卡，保留 radial gradient 光晕 */}
      <section className="relative shrink-0 overflow-hidden px-1 py-5 sm:px-2 md:py-7">
        <div
          className="absolute inset-0 -z-10 opacity-90"
          style={{
            background:
              'radial-gradient(circle at 14% 20%, rgba(118,184,224,0.18), transparent 30%),' +
              'radial-gradient(circle at 82% 16%, rgba(244,167,176,0.16), transparent 30%),' +
              'radial-gradient(circle at 55% 100%, rgba(142,214,180,0.14), transparent 36%)',
          }}
          aria-hidden
        />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-eyebrow inline-flex items-center gap-1.5">
              <Sparkles size={12} aria-hidden />
              已载入最近一次 CPTI 结果
            </p>
            <h1 className="mt-3 text-2xl md:text-3xl font-extrabold leading-tight text-base-text">
              AI 关系助手
            </h1>
            <div className="mt-2 flex items-center gap-2.5">
              <span
                className="h-[3px] w-10 rounded-full"
                style={{ background: 'var(--poster-accent, #4298b4)', opacity: 0.85 }}
                aria-hidden
              />
              <p className="text-xs md:text-sm text-base-mute font-display tracking-wide">
                <span className="font-bold text-base-text">{context.code}</span>
                {context.title ? ` · ${context.title}` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row md:shrink-0">
            <button
              type="button"
              onClick={onBackToResult}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-base-text shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <ArrowLeft size={16} aria-hidden />
              返回结果报告
            </button>
            <div className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-cyan/10 px-4 py-2.5 text-sm font-semibold text-brand-cyan">
              <ClipboardList size={16} aria-hidden />
              {context.mode === 'dual' ? '双人拼图' : '单人感知'}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-4 flex min-h-0 flex-1 flex-col md:mt-5">
        <AiRelationshipChat resultData={resultData} className="flex min-h-0 flex-1 flex-col" />
      </div>
    </div>
  )
}
