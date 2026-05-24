import Header from './Header'

/**
 * AppShell — 全站页面外壳
 * 含 sticky 顶栏 + 居中内容区，移动端优先，桌面端自动扩宽。
 *
 * @param {{ headerNav?: object, contentSurface?: 'muted' | 'white', contentWidth?: 'default' | 'wide', compactMobileBottom?: boolean, flushTop?: boolean }} props
 *   contentSurface — 'white'：整页与 main 同为白底（情侣类型页，避免 clip-path 与顶栏间隙露出灰底）
 *   contentWidth — 'wide'：结果报告等宽屏阅读（接近 max-w-7xl）
 *   compactMobileBottom — AI 聊天页等：移动端去掉 main 底部留白，由页面内组件自行适配底部导航
 *   flushTop — 结果页等：去掉 main 顶内边距，让全宽色带与顶栏直接接壤
 */
export default function AppShell({
  children,
  headerNav,
  contentSurface = 'muted',
  contentWidth = 'default',
  compactMobileBottom = false,
  flushTop = false,
  flushBottom = false,
  flushHorizontal = false,
}) {
  const whitePage = contentSurface === 'white'
  const wide = contentWidth === 'wide'
  const mobileBottomPadding = compactMobileBottom ? 'pb-0' : 'pb-24'
  const desktopBottomPadding = flushBottom ? 'md:pb-0' : (wide ? 'md:pb-10' : 'md:pb-8')
  const mainTopPadding = flushTop || whitePage ? 'pt-0 md:pt-0' : compactMobileBottom ? 'pt-3 md:pt-8' : 'pt-5 md:pt-8'
  const horizontalPadding = flushHorizontal ? 'px-0 md:px-0 lg:px-0' : (wide ? 'px-4 md:px-6 lg:px-8' : 'px-4')

  return (
    <div className={whitePage ? 'min-h-screen bg-base-card bg-noise' : 'min-h-screen bg-base-bg bg-noise'}>
      <Header {...headerNav} />
      <main
        className={[
          wide
            ? `w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[min(100%,90rem)] mx-auto ${horizontalPadding} ${mobileBottomPadding} ${desktopBottomPadding}`
            : `max-w-2xl mx-auto ${horizontalPadding} ${mobileBottomPadding} md:max-w-4xl ${desktopBottomPadding}`,
          whitePage ? 'bg-base-card' : '',
          mainTopPadding,
        ].join(' ')}
      >
        {children}
      </main>
    </div>
  )
}
