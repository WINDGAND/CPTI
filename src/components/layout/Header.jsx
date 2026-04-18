import { useMemo, useState } from 'react'
import { BarChart3, CircleHelp, HeartHandshake, Home, Info, MessageSquarePlus } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { RESULTS } from '../../data/results'
import { TYPE_GROUP_META } from '../../data/typeGroups'
import { useFeedback } from '../feedback/FeedbackContext'

const NAV_ITEMS = [
  { id: 'home', label: '首页', icon: Home },
  { id: 'types', label: '情侣类型', icon: HeartHandshake },
  { id: 'stats', label: '统计', icon: BarChart3 },
  { id: 'faq', label: '常见问题', icon: CircleHelp },
  { id: 'about', label: '关于', icon: Info },
]

export default function Header({
  activeTab,
  onNavigateHome,
  onNavigateCoupleTypes,
  onNavigateStats,
  onNavigateFAQ,
  onNavigateAbout,
  onLogoHome,
}) {
  const [typesOpen, setTypesOpen] = useState(false)
  const { openFeedback } = useFeedback()

  const groupedTypes = useMemo(() => {
    const grouped = { SR: [], SP: [], IR: [], IP: [] }
    RESULTS.forEach((result) => {
      if (grouped[result.group]) {
        grouped[result.group].push(result)
      }
    })
    return grouped
  }, [])

  function handleLogoClick(e) {
    if (onLogoHome) {
      e.preventDefault()
      onLogoHome()
    }
  }

  function handleNavigate(itemId) {
    if (itemId === 'home') onNavigateHome?.()
    if (itemId === 'types') onNavigateCoupleTypes?.()
    if (itemId === 'stats') onNavigateStats?.()
    if (itemId === 'faq') onNavigateFAQ?.()
    if (itemId === 'about') onNavigateAbout?.()
  }

  return (
    <header className="sticky top-0 z-50 bg-base-card border-b border-gray-100 relative">
      {/* 顶栏主行：左侧品牌 + 顶部居中导航 */}
      <div className="relative w-full px-4 sm:px-6 lg:px-10 h-16 sm:h-18 lg:h-20 flex items-center justify-between">

        {/* ── Logo + 品牌文字（左上角，不居中） ── */}
        <a
          href="/"
          onClick={handleLogoClick}
          className="flex min-w-0 flex-1 items-center gap-2.5 md:flex-none md:shrink-0"
        >
          {/* Logo：移动端 36px，平板 44px，桌面 52px */}
          <img
            src="/logo.png"
            alt="CPTI Logo"
            className="h-9 w-9 shrink-0 sm:h-11 sm:w-11 lg:h-13 lg:w-13 object-contain"
          />
          <span
            className="min-w-0 font-bold tracking-tight text-base lg:text-lg leading-tight bg-clip-text text-transparent"
            style={{
              backgroundImage:
                'linear-gradient(to right, #F4A7B0, #8ED6B4, #76B8E0, #B8A0D0)',
            }}
          >
            Couple Type Indicator
          </span>
        </a>

        {/* ── 移动端反馈入口（Logo 右侧，md 以上隐藏） ── */}
        <button
          type="button"
          onClick={openFeedback}
          className="md:hidden ml-2 inline-flex h-9 shrink-0 items-center gap-1 px-2 rounded-full text-base-mute hover:text-brand-cyan hover:bg-brand-cyan/10 transition-colors"
          aria-label="问题反馈"
        >
          <MessageSquarePlus size={17} />
          <span className="text-xs font-medium leading-none">反馈</span>
        </button>

        {/* ── 桌面端居中导航 ── */}
        <nav className="hidden md:flex items-center gap-7 absolute left-1/2 -translate-x-1/2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            const homeNudgeClass = item.id === 'home' ? '-translate-y-px' : ''
            const baseClass = [
              'inline-flex h-8 items-center gap-1.5 leading-none text-sm lg:text-base transition-colors duration-150',
              isActive ? 'text-brand-cyan font-semibold' : 'text-base-mute hover:text-brand-cyan',
            ].join(' ')

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
                    className={baseClass}
                    onClick={() => handleNavigate(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={item.label}
                  >
                    <span className={['inline-flex h-4 w-4 shrink-0 items-center justify-center', homeNudgeClass].join(' ')}>
                      <Icon size={15} className="-translate-y-px" aria-hidden />
                    </span>
                    <span className={['leading-none', homeNudgeClass].join(' ')}>{item.label}</span>
                  </button>
                  <AnimatePresence>
                    {typesOpen && (
                      <motion.div
                        key="couple-types-popover"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.16, ease: 'easeOut' }}
                        className="absolute left-1/2 top-[calc(100%+12px)] z-50 w-[min(92vw,980px)] rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-xl"
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
                              <p className="mt-2 text-sm text-base-mute">
                                {meta.desc}
                              </p>

                              <div className="mt-3 grid grid-cols-4 gap-3">
                                {groupedTypes[groupCode].map((type) => (
                                  <div
                                    key={type.code}
                                    className="rounded-md px-2 py-2 text-center"
                                    style={{
                                      backgroundColor: meta.accent,
                                    }}
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
                className={baseClass}
                onClick={() => handleNavigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
              >
                <span className={['inline-flex h-4 w-4 shrink-0 items-center justify-center', homeNudgeClass].join(' ')}>
                  <Icon size={15} className="-translate-y-px" aria-hidden />
                </span>
                <span className={['leading-none', homeNudgeClass].join(' ')}>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* ── 移动端固定底部导航 ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-base-card/95 backdrop-blur-sm"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        <div className="grid grid-cols-5 px-2 pt-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            const homeNudgeClass = item.id === 'home' ? '-translate-y-px' : ''
            return (
              <button
                key={item.id}
                type="button"
                className={[
                  'flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 transition-colors leading-none',
                  isActive ? 'text-brand-cyan bg-brand-cyan/10' : 'text-base-mute',
                ].join(' ')}
                onClick={() => handleNavigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
              >
                <span className={['inline-flex h-4 w-4 items-center justify-center', homeNudgeClass].join(' ')}>
                  <Icon size={16} className="-translate-y-px" aria-hidden />
                </span>
                <span className={['text-[11px] leading-none font-medium', homeNudgeClass].join(' ')}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </header>
  )
}
