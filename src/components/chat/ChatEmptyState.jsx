import { ArrowUpRight, Compass, Flame, HeartHandshake, MessageCircleHeart } from 'lucide-react'

const SCENE_PALETTE = [
  { id: 'cooldown', label: '冷战修复', icon: Flame, accent: '#F4A7B0' },
  { id: 'daily', label: '日常沟通', icon: MessageCircleHeart, accent: '#76B8E0' },
  { id: 'upgrade', label: '亲密升级', icon: HeartHandshake, accent: '#B8A0D0' },
  { id: 'self', label: '自我觉察', icon: Compass, accent: '#8ED6B4' },
]

function buildScenes(context) {
  const code = context?.code || '这类关系'
  const isDual = context?.mode === 'dual'

  return [
    {
      ...SCENE_PALETTE[0],
      prompts: [
        `${code} 型最容易因为什么小事吵起来？`,
        '一个人想靠近、一个人想冷静时该怎么开口？',
        '我已经道歉了 TA 还没回应，该等还是再开一次口？',
      ],
    },
    {
      ...SCENE_PALETTE[1],
      prompts: [
        '给我们一个今晚就能试的 5 分钟沟通练习。',
        '怎么让 TA 知道我不是在挑刺，只是想说我的感受？',
        isDual ? '哪个维度上我们最容易误解对方？' : '怎么主动问 TA 一些深入但不冒犯的问题？',
      ],
    },
    {
      ...SCENE_PALETTE[2],
      prompts: [
        '想给 TA 一份不要钱但走心的小惊喜，有什么思路？',
        '怎么聊一聊未来一年的关系节奏，不让对方感到压力？',
        '最近变成搭子状态，怎么把心动感找回来一点？',
      ],
    },
    {
      ...SCENE_PALETTE[3],
      prompts: [
        `${code} 型在关系里最常忽略的需求是什么？`,
        '我担心自己付出太多，怎么判断是爱还是自我感动？',
        '焦虑「TA 是不是不爱我了」，可以怎么自我安抚？',
      ],
    },
  ]
}

export default function ChatEmptyState({ context, disabled = false, onPick }) {
  const scenes = buildScenes(context)

  return (
    <div className="mx-auto w-full max-w-4xl px-1 pt-6 pb-2 md:pt-10">
      {/* 极简引导：仅保留一句核心提问 */}
      <h2 className="mb-6 text-[20px] font-extrabold leading-tight text-base-text md:mb-9 md:text-[26px]">
        今天，<span className="text-base-mute">想跟我聊些什么？</span>
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
