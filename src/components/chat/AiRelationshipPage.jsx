import { ArrowLeft, ClipboardList, MessageCircleHeart, Sparkles } from 'lucide-react'
import { buildAiRelationshipContext } from '../../utils/aiChatContext'
import AiRelationshipChat from './AiRelationshipChat'

export default function AiRelationshipPage({ resultData, onBackToResult }) {
  const context = buildAiRelationshipContext(resultData)

  return (
    <div className="pb-10">
      <section className="relative overflow-hidden rounded-[28px] border border-white/80 bg-white p-5 shadow-card sm:p-7">
        <div
          className="absolute inset-0 opacity-80"
          style={{
            background:
              'radial-gradient(circle at 14% 20%, rgba(118,184,224,0.2), transparent 28%), radial-gradient(circle at 82% 16%, rgba(244,167,176,0.18), transparent 30%), radial-gradient(circle at 55% 100%, rgba(142,214,180,0.16), transparent 34%)',
          }}
          aria-hidden
        />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-brand-cyan shadow-sm">
              <Sparkles size={13} aria-hidden />
              已载入最近一次 CPTI 结果
            </p>
            <h1 className="mt-4 text-2xl font-black leading-tight text-base-text md:text-3xl">
              AI 关系助手
            </h1>
            <p className="mt-3 text-sm leading-7 text-base-mute">
              当前基于 <span className="font-bold text-base-text">{context.code}</span>
              {context.title ? ` · ${context.title}` : ''} 进行对话。你可以直接问具体相处问题，聊天记录和测试结果都只保存在当前浏览器。
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row md:shrink-0">
            <button
              type="button"
              onClick={onBackToResult}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-100 bg-white px-4 py-2.5 text-sm font-semibold text-base-text shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
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

      <div className="mt-5">
        <AiRelationshipChat resultData={resultData} />
      </div>

      <p className="mt-4 flex items-start gap-2 rounded-2xl border border-gray-100 bg-white/80 px-4 py-3 text-xs leading-6 text-base-mute shadow-sm">
        <MessageCircleHeart size={15} className="mt-0.5 shrink-0 text-brand-cyan" aria-hidden />
        AI 关系助手只提供沟通参考，不替代心理咨询、医疗建议或现实中的安全求助。
      </p>
    </div>
  )
}
