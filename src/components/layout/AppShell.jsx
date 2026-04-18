import { MessageSquarePlus } from 'lucide-react'
import Header from './Header'
import { useFeedback } from '../feedback/FeedbackContext'

/**
 * AppShell — 全站页面外壳
 * 含 sticky 顶栏 + 居中内容区，移动端优先，桌面端自动扩宽。
 *
 * @param {{ headerNav?: object, contentSurface?: 'muted' | 'white', contentWidth?: 'default' | 'wide' }} props
 *   contentSurface — 'white'：整页与 main 同为白底（情侣类型页，避免 clip-path 与顶栏间隙露出灰底）
 *   contentWidth — 'wide'：结果报告等宽屏阅读（接近 max-w-7xl）
 */
export default function AppShell({ children, headerNav, contentSurface = 'muted', contentWidth = 'default' }) {
  const whitePage = contentSurface === 'white'
  const wide = contentWidth === 'wide'
  const { openFeedback } = useFeedback()

  return (
    <div className={whitePage ? 'min-h-screen bg-base-card' : 'min-h-screen bg-base-bg'}>
      <Header {...headerNav} />
      <main
        className={[
          wide
            ? 'w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[min(100%,90rem)] mx-auto px-4 pb-24 md:px-6 lg:px-8 md:pb-10'
            : 'max-w-2xl mx-auto px-4 pb-24 md:max-w-4xl md:pb-8',
          whitePage ? 'bg-base-card pt-0 md:pt-0' : 'pt-5 md:pt-8',
        ].join(' ')}
      >
        {/* 桌面端反馈入口：顶栏下方、内容区右上角，移动端隐藏（移动端已在 Header 内提供） */}
        <div className="hidden md:flex justify-end mb-2 -mt-4">
          <button
            type="button"
            onClick={openFeedback}
            className="inline-flex items-center gap-1.5 text-sm text-base-mute hover:text-brand-cyan transition-colors duration-150"
            aria-label="问题反馈"
          >
            <MessageSquarePlus size={15} aria-hidden />
            <span className="leading-none">反馈</span>
          </button>
        </div>

        {children}
      </main>
    </div>
  )
}
