import { useMemo, useState } from 'react'
import { BarChart3, CircleHelp, Github, HeartHandshake, Home, MessageCircleHeart, MessageSquarePlus } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useFeedback } from '../feedback/FeedbackContext'
import { useLanguage } from '../../i18n/LanguageContext'
import { useLocalizedResults, useLocalizedTypeGroupMeta } from '../../i18n/useLocalizedData'
import { GITHUB_REPO_URL } from '../../utils/site'
import LanguageSwitcher from './LanguageSwitcher'

const NAV_ITEM_DEFS = [
  { id: 'home', icon: Home, labelKey: 'nav.home' },
  { id: 'types', icon: HeartHandshake, labelKey: 'nav.types' },
  {
    id: 'ai',
    icon: MessageCircleHeart,
    labelKey: 'nav.ai',
    labelDesktopKey: 'nav.ai_desktop',
    ariaLabelKey: 'nav.ai_desktop',
    featured: true,
  },
  { id: 'stats', icon: BarChart3, labelKey: 'nav.stats' },
  { id: 'help', icon: CircleHelp, labelKey: 'nav.help' },
]

/**
 * 浮岛容器通用样式：圆角药丸 + 半透明白底 + 微弱描边 + 柔和投影
 * （以原子类拼接，避免新增全局 utility）
 */
const PILL_BASE =
  'rounded-full bg-base-card/90 backdrop-blur-md ring-1 ring-black/[0.04] shadow-[0_6px_24px_-12px_rgba(15,23,42,0.18)]'

function getNavDisplayLabel(item, t, { desktop = false } = {}) {
  if (desktop && item.labelDesktopKey) return t(item.labelDesktopKey)
  return t(item.labelKey)
}

function getNavAriaLabel(item, t) {
  if (item.ariaLabelKey) return t(item.ariaLabelKey)
  if (item.labelDesktopKey) return t(item.labelDesktopKey)
  return t(item.labelKey)
}

export default function Header({
  activeTab,
  onNavigateHome,
  onNavigateCoupleTypes,
  onNavigateAI,
  onNavigateStats,
  onNavigateHelp,
  onLogoHome,
}) {
  const [typesOpen, setTypesOpen] = useState(false)
  const { openFeedback } = useFeedback()
  const { t } = useLanguage()
  const RESULTS = useLocalizedResults()
  const TYPE_GROUP_META = useLocalizedTypeGroupMeta()
  const NAV_ITEMS = NAV_ITEM_DEFS

  const groupedTypes = useMemo(() => {
    const grouped = { SR: [], SP: [], IR: [], IP: [] }
    RESULTS.forEach((result) => {
      if (grouped[result.group]) {
        grouped[result.group].push(result)
      }
    })
    return grouped
  }, [RESULTS])

  function handleLogoClick(e) {
    if (onLogoHome) {
      e.preventDefault()
      onLogoHome()
    }
  }

  function handleNavigate(itemId) {
    if (itemId === 'home') onNavigateHome?.()
    if (itemId === 'types') onNavigateCoupleTypes?.()
    if (itemId === 'ai') onNavigateAI?.()
    if (itemId === 'stats') onNavigateStats?.()
    if (itemId === 'help') onNavigateHelp?.()
  }

  return (
    <header className="sticky top-0 z-50">
      {/* 顶部渐变 fade mask + backdrop-blur：让滚动内容到达 header 区时柔和模糊+消失
       * 用 inset-0 严格限制在 header 高度内，避免下溢遮挡 AI 助手页等固定高度容器的顶部内容
       * 用 white 而非 base-bg：在浅灰背景上是"淡白消失带"，在白色背景上几乎无感知，跨页面自适应 */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 backdrop-blur-md bg-gradient-to-b from-white/85 via-white/55 to-transparent"
        aria-hidden
      />

      {/* 顶栏外壳：透明背景 + 上下留白 + 全宽 flex 让 Logo/反馈贴向视口左右两端 */}
      <div className="w-full px-3 pt-3 pb-2 sm:pt-3.5 sm:px-5 md:px-8 md:pt-4 md:pb-3 lg:px-10">
        <div className="relative flex w-full items-center gap-2 md:gap-3">

          {/* ── Logo：左上角，直接坐在背景上，无白色容器 ────────── */}
          <a
            href="/"
            onClick={handleLogoClick}
            className="flex shrink-0 items-center gap-2 h-11 sm:h-12 rounded-full px-2 -mx-2 transition-colors hover:bg-black/[0.035]"
            aria-label={t('nav.back_to_home')}
          >
            <img
              src="/logo.png"
              alt=""
              className="h-8 w-8 shrink-0 sm:h-9 sm:w-9 object-contain"
            />
            <span
              className="logo-gradient-flow font-display min-w-0 font-extrabold tracking-tight text-[14px] sm:text-[15px] lg:text-[16px] leading-none bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  'linear-gradient(90deg, #F4A7B0 0%, #8ED6B4 33%, #76B8E0 66%, #B8A0D0 100%)',
              }}
            >
              Couple Type Indicator
            </span>
          </a>

          {/* ── Nav 浮岛（仅桌面端） - 绝对居中保证视觉中心 ───── */}
          <nav
            className={[
              PILL_BASE,
              'hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-0.5 px-1.5 h-12',
            ].join(' ')}
            aria-label={t('nav.home')}
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id

              // 在 nav pill 内的视觉规则：
              // - featured（AI）+ active：实心青色内嵌药丸 + 微阴影
              // - featured 非 active：青色淡底 + 青色文字（暗示 CTA）
              // - 普通 active：深色高亮内嵌药丸
              // - 普通非 active：纯文字 + hover 灰底
              const innerClass = item.featured
                ? (isActive
                    ? 'bg-brand-cyan text-white shadow-[0_4px_12px_-4px_rgba(66,152,180,0.55)]'
                    : 'bg-brand-cyan/12 text-brand-cyan hover:bg-brand-cyan hover:text-white hover:shadow-[0_4px_12px_-4px_rgba(66,152,180,0.55)]')
                : (isActive
                    ? 'bg-black/[0.06] text-base-text font-semibold'
                    : 'text-base-mute hover:bg-black/[0.045] hover:text-base-text')

              const baseInner = 'inline-flex h-9 items-center gap-1.5 rounded-full px-3 leading-none text-[13.5px] lg:text-sm transition-all duration-150'

              if (item.id === 'types') {
                return (
                  <div
                    key={item.id}
                    className="relative"
                    onMouseEnter={() => setTypesOpen(true)}
                    onMouseLeave={() => setTypesOpen(false)}
                  >
                    <button
                      type="button"
                      className={[baseInner, innerClass].join(' ')}
                      onClick={() => handleNavigate(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      aria-label={getNavAriaLabel(item, t)}
                    >
                      <Icon size={14} aria-hidden />
                      <span>{getNavDisplayLabel(item, t, { desktop: true })}</span>
                    </button>
                    <AnimatePresence>
                      {typesOpen && (
                        <motion.div
                          key="couple-types-popover"
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.16, ease: 'easeOut' }}
                          className="absolute left-1/2 top-[calc(100%+14px)] z-50 w-[min(92vw,980px)] rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-xl"
                          transformTemplate={(_, generated) => `translateX(-50%) ${generated}`}
                        >
                          <div className="space-y-6">
                            {Object.entries(TYPE_GROUP_META).map(([groupCode, meta]) => (
                              <section key={groupCode}>
                                <h3 className="text-[26px] leading-none font-extrabold text-base-text">
                                  {meta.label}
                                  <span className="ml-2 text-base font-semibold text-base-mute">
                                    {meta.subtitle}
                                  </span>
                                </h3>
                                <p className="mt-2 text-sm text-base-mute">{meta.desc}</p>
                                <div className="mt-3 grid grid-cols-4 gap-3">
                                  {groupedTypes[groupCode].map((type) => (
                                    <div
                                      key={type.code}
                                      className="rounded-md px-2 py-2 text-center"
                                      style={{ backgroundColor: meta.accent }}
                                      title={type.title}
                                    >
                                      <p className="text-[22px] font-extrabold leading-none text-white">{type.code}</p>
                                      <p className="mt-1 text-xs font-semibold text-white/95">{type.title}</p>
                                    </div>
                                  ))}
                                </div>
                              </section>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  className={[baseInner, innerClass].join(' ')}
                  onClick={() => handleNavigate(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={getNavAriaLabel(item, t)}
                >
                  <Icon size={14} aria-hidden />
                  <span>{getNavDisplayLabel(item, t, { desktop: true })}</span>
                </button>
              )
            })}
          </nav>

          {/* ── 右上角：语言切换器 + 反馈 + GitHub ─────────────────── */}
          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 -mr-2 sm:-mr-3">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={openFeedback}
              className={[
                'inline-flex shrink-0 items-center justify-center gap-1.5 h-11 sm:h-12 w-11 sm:w-auto sm:px-3 rounded-full',
                'text-base-mute transition-colors hover:text-brand-cyan hover:bg-black/[0.035]',
              ].join(' ')}
              aria-label={t('nav.open_feedback')}
            >
              <MessageSquarePlus size={17} aria-hidden />
              <span className="hidden sm:inline text-[14px] font-medium leading-none">{t('nav.feedback')}</span>
            </button>
            {/* GitHub 仓库入口：移动端顶部空间紧张（Logo 文字不可压缩），仅在 sm+ 显示，
                移动端用户由关于页页脚的入口兜底 */}
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={[
                'hidden sm:inline-flex shrink-0 items-center justify-center h-12 w-12 rounded-full',
                'text-base-mute transition-colors hover:text-brand-cyan hover:bg-black/[0.035]',
              ].join(' ')}
              aria-label={t('nav.github')}
              title={t('nav.github')}
            >
              <Github size={17} aria-hidden />
            </a>
          </div>
        </div>
      </div>

      {/* ── 移动端固定底部浮空导航 Tab ─────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-3 pointer-events-none"
        style={{ paddingBottom: 'max(0.75rem, calc(env(safe-area-inset-bottom) + 0.5rem))' }}
        aria-label={t('nav.home')}
      >
        <div
          className={[
            PILL_BASE,
            'pointer-events-auto grid grid-cols-5 px-1 pt-1 pb-1 shadow-[0_10px_30px_-10px_rgba(15,23,42,0.25)]',
          ].join(' ')}
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            const homeNudgeClass = item.id === 'home' ? '-translate-y-px' : ''
            return (
              <button
                key={item.id}
                type="button"
                className={[
                  item.featured
                    ? 'relative -mt-5 flex flex-col items-center justify-center gap-1 rounded-2xl px-1 pb-1 pt-0 transition-all leading-none'
                    // 非 featured：用 rounded-full 让 active 高亮也是药丸形，与容器 rounded-full 圆角融合，
                    // 不会在第一/最后一个 tab 处出现"高亮溢出容器圆弧"的视觉空白
                    : 'flex flex-col items-center justify-center gap-0.5 rounded-full px-1 py-1.5 transition-colors leading-none',
                  item.featured
                    ? 'text-brand-cyan'
                    : (isActive ? 'text-brand-cyan bg-brand-cyan/10' : 'text-base-mute'),
                ].join(' ')}
                onClick={() => handleNavigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={getNavAriaLabel(item, t)}
              >
                <span
                  className={[
                    item.featured
                      ? 'inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-cyan text-white shadow-[0_8px_24px_-6px_rgba(66,152,180,0.6)] ring-4 ring-base-card'
                      : 'inline-flex h-4 w-4 items-center justify-center',
                    homeNudgeClass,
                  ].join(' ')}
                >
                  <Icon size={item.featured ? 23 : 16} className="-translate-y-px" aria-hidden />
                </span>
                <span className={[item.featured ? 'text-[11px] font-bold leading-none' : 'text-[11px] leading-none font-medium', homeNudgeClass].join(' ')}>
                  {getNavDisplayLabel(item, t)}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </header>
  )
}
