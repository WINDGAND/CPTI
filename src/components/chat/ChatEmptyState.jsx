import { ArrowUpRight, Compass, Flame, HeartHandshake, MessageCircleHeart } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext'

const SCENE_PALETTE = [
  { id: 'cooldown', labelKey: 'chat.empty_scene_cooldown', icon: Flame, accent: '#F4A7B0' },
  { id: 'daily', labelKey: 'chat.empty_scene_daily', icon: MessageCircleHeart, accent: '#76B8E0' },
  { id: 'upgrade', labelKey: 'chat.empty_scene_upgrade', icon: HeartHandshake, accent: '#B8A0D0' },
  { id: 'self', labelKey: 'chat.empty_scene_self', icon: Compass, accent: '#8ED6B4' },
]

function buildScenes(context, t) {
  const code = context?.code || t('chat.empty_fallback_code')
  const isDual = context?.mode === 'dual'

  return [
    {
      ...SCENE_PALETTE[0],
      label: t(SCENE_PALETTE[0].labelKey),
      prompts: [
        t('chat.empty_prompt_cooldown_1', { code }),
        t('chat.empty_prompt_cooldown_2'),
        t('chat.empty_prompt_cooldown_3'),
      ],
    },
    {
      ...SCENE_PALETTE[1],
      label: t(SCENE_PALETTE[1].labelKey),
      prompts: [
        t('chat.empty_prompt_daily_1'),
        t('chat.empty_prompt_daily_2'),
        isDual ? t('chat.empty_prompt_daily_3_dual') : t('chat.empty_prompt_daily_3_single'),
      ],
    },
    {
      ...SCENE_PALETTE[2],
      label: t(SCENE_PALETTE[2].labelKey),
      prompts: [
        t('chat.empty_prompt_upgrade_1'),
        t('chat.empty_prompt_upgrade_2'),
        t('chat.empty_prompt_upgrade_3'),
      ],
    },
    {
      ...SCENE_PALETTE[3],
      label: t(SCENE_PALETTE[3].labelKey),
      prompts: [
        t('chat.empty_prompt_self_1', { code }),
        t('chat.empty_prompt_self_2'),
        t('chat.empty_prompt_self_3'),
      ],
    },
  ]
}

export default function ChatEmptyState({ context, disabled = false, onPick }) {
  const { t } = useLanguage()
  const scenes = buildScenes(context, t)

  return (
    <div className="mx-auto w-full max-w-4xl px-1 pt-6 pb-2 md:pt-10">
      {/* 极简引导：仅保留一句核心提问 */}
      <h2 className="mb-6 text-[20px] font-extrabold leading-tight text-base-text md:mb-9 md:text-[26px]">
        {t('chat.empty_title_lead')}<span className="text-base-mute">{t('chat.empty_title_rest')}</span>
      </h2>

      {/* 4 场景 — 桌面端 4 列，平板 2 列，移动 1 列；hairline 分隔，去卡片 */}
      <div className="grid grid-cols-1 gap-x-7 gap-y-5 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-gray-100/80">
        {scenes.map((scene, idx) => {
          const Icon = scene.icon
          return (
            <section
              key={scene.id}
              className={[
                'relative min-w-0',
                idx > 0 ? 'sm:pt-0 lg:pl-6' : 'lg:pr-2',
                idx > 0 ? 'pt-5 border-t border-gray-100/80 sm:border-t-0' : '',
              ].join(' ')}
            >
              <div className="mb-2.5 flex items-center gap-2">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full"
                  style={{ background: `${scene.accent}26`, color: scene.accent }}
                  aria-hidden
                >
                  <Icon size={12} strokeWidth={2.6} />
                </span>
                <h3 className="text-[13.5px] font-bold leading-none text-base-text">{scene.label}</h3>
              </div>
              <ul className="space-y-0.5">
                {scene.prompts.map((prompt) => (
                  <li key={prompt}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onPick?.(prompt)}
                      className="group/btn flex w-full items-start gap-1.5 rounded-md px-1.5 py-1.5 text-left text-[12.5px] leading-5 text-base-text/90 transition-colors hover:bg-black/[0.035] hover:text-base-text disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span
                        className="mt-2 inline-block h-[3px] w-[3px] shrink-0 rounded-full"
                        style={{ background: scene.accent }}
                        aria-hidden
                      />
                      <span className="flex-1">{prompt}</span>
                      <ArrowUpRight
                        size={12}
                        className="mt-0.5 shrink-0 text-base-mute opacity-0 transition-opacity group-hover/btn:opacity-100"
                        aria-hidden
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
