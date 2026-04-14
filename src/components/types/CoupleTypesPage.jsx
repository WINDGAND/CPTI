import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { RESULTS } from '../../data/results'
import { TYPE_GROUP_META, TYPE_GROUP_ORDER } from '../../data/typeGroups'
import { getTypeListingIntro } from '../../utils/typeListing'
import { getTypeImageSrc } from '../../data/typeImages'

function StartTestButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-cyan px-8 py-3.5 text-sm font-semibold text-white shadow-md transition hover:opacity-90 active:scale-[0.98]"
    >
      开始测试
      <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
    </button>
  )
}

function TypeIllustration({ code }) {
  const [broken, setBroken] = useState(false)
  const src = getTypeImageSrc(code)

  if (broken) {
    return (
      <div
        className="w-full max-w-[220px] aspect-[4/5] rounded-xl border-2 border-dashed border-base-text/15 bg-white/30 flex items-center justify-center mb-4 mx-auto"
        aria-label={`${code} 配图占位`}
      >
        <span className="text-xs font-medium text-base-mute/60 px-3 text-center">
          配图待定
        </span>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[220px] aspect-[4/5] mx-auto mb-4 rounded-xl overflow-hidden bg-white/25 shadow-sm ring-1 ring-black/[0.04]">
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover object-center"
        loading="lazy"
        decoding="async"
        onError={() => setBroken(true)}
      />
    </div>
  )
}

/**
 * 情侣类型总览页：全宽色带、居中文案、斜切衔接、public/images/cpti/{CODE}.png
 */
export default function CoupleTypesPage({ onStartTest }) {
  const byGroup = TYPE_GROUP_ORDER.reduce((acc, key) => {
    acc[key] = RESULTS.filter((r) => r.group === key)
    return acc
  }, {})

  return (
    <div className="pb-12 bg-base-card">
      <header className="text-center -mx-4 px-4 pt-6 pb-6 md:pt-10 md:pb-8 bg-base-card">
        <h1 className="text-3xl md:text-4xl font-extrabold text-base-text tracking-tight">
          情侣类型
        </h1>
        <div className="mt-8 flex justify-center">
          <StartTestButton onClick={onStartTest} />
        </div>
      </header>

      <div className="cpti-types-bleed">
        {TYPE_GROUP_ORDER.map((groupCode, index) => {
          const meta = TYPE_GROUP_META[groupCode]
          const types = byGroup[groupCode] ?? []
          const isFirstBand = index === 0
          const angled = index > 0
          const angleFlip = index % 2 === 0
          const angleClass = angled
            ? angleFlip
              ? 'cpti-types-band-angle-reverse'
              : 'cpti-types-band-angle'
            : ''

          return (
            <section
              key={groupCode}
              className={[
                'relative z-0 overflow-hidden px-4 pb-8 md:px-6 md:pb-10',
                isFirstBand && 'cpti-types-first-zigzag',
                angleClass,
              ].filter(Boolean).join(' ')}
              style={{
                zIndex: index + 1,
                backgroundColor: `color-mix(in srgb, ${meta.accent} 18%, white)`,
              }}
              aria-label={`${meta.label} ${meta.subtitle}`}
            >
              <div className="relative z-[1] mx-auto max-w-4xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[90rem] pt-1 md:pt-2 lg:px-4 xl:px-8">
                {/* 系列水印：顶栏居中、占文档流，避免与卡片重叠 */}
                <p
                  className="text-center text-[clamp(2rem,6.25vw,3.5rem)] font-black leading-tight tracking-tight select-none mb-4 md:mb-5"
                  style={{
                    color: `color-mix(in srgb, ${meta.accent} 38%, transparent)`,
                  }}
                  aria-hidden
                >
                  {meta.label}
                </p>
                <p className="text-sm text-base-mute max-w-2xl mx-auto leading-relaxed text-center">
                  {meta.desc}
                </p>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-x-10 sm:gap-y-10 lg:gap-x-12 xl:gap-x-16 lg:gap-y-8">
                  {types.map((type) => (
                    <article
                      key={type.code}
                      className="flex flex-col items-center text-center lg:min-w-0 lg:px-1 xl:px-2"
                    >
                      <TypeIllustration code={type.code} />
                      <h3
                        className="text-lg font-bold leading-snug text-center"
                        style={{ color: meta.accent }}
                      >
                        {type.title}
                      </h3>
                      <p className="mt-1 text-sm font-bold text-base-text tracking-wide text-center">
                        {type.code}
                      </p>
                      <p className="mt-2 text-sm text-base-mute leading-relaxed text-center w-full max-w-[15.5rem] sm:max-w-[17rem] lg:max-w-[15rem] xl:max-w-[16rem] mx-auto">
                        {getTypeListingIntro(type)}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          )
        })}
      </div>

      <footer className="flex justify-center pt-10 pb-4">
        <StartTestButton onClick={onStartTest} />
      </footer>
    </div>
  )
}
