import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import AppShell from './components/layout/AppShell'
import HomeStepCards from './components/home/HomeStepCards'
import Questionnaire from './components/Questionnaire'
import Loading from './components/Loading'
import ResultPoster from './components/ResultPoster'
import CoupleTypesPage from './components/types/CoupleTypesPage'
import FAQPage from './components/faq/FAQPage'
import AboutPage from './components/about/AboutPage'
import StatsPage from './components/stats/StatsPage'
import { QUESTIONS, QUESTIONS_PER_DIMENSION } from './data/questions'
import { computeDualModeResult, computeSingleModeResult } from './utils/scoring'
import { submitStats } from './utils/statsApi'

/**
 * App — 顶层视图路由
 *
 * view:
 *   'home'    — 首页（问卷 或 情侣类型页）
 *   'loading' — 光谱分析过渡页（2s）
 *   'result'  — 结果海报
 *
 * mainTab（仅 view==='home'）:
 *   'quiz'  — 标题 + 三步引导 + 答题
 *   'types' — 情侣类型总览
 *   'stats' — 统计总览
 *   'faq'   — 常见问题
 *   'about' — 关于 CPTI
 */
export default function App() {
  const [view, setView] = useState('home')
  const [mainTab, setMainTab] = useState('quiz')
  const [resultData, setResultData] = useState(null)

  function goQuizHome() {
    setResultData(null)
    setView('home')
    setMainTab('quiz')
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  function goCoupleTypes() {
    setView('home')
    setMainTab('types')
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  function goFAQ() {
    setView('home')
    setMainTab('faq')
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  function goStats() {
    setView('home')
    setMainTab('stats')
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  function goAbout() {
    setView('home')
    setMainTab('about')
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const headerNav = {
    activeTab: view === 'home'
      ? (mainTab === 'quiz' ? 'home' : mainTab)
      : null,
    onNavigateHome: goQuizHome,
    onNavigateCoupleTypes: goCoupleTypes,
    onNavigateStats: goStats,
    onNavigateFAQ: goFAQ,
    onNavigateAbout: goAbout,
    onLogoHome: goQuizHome,
  }

  // 答题完成 → 计算结果 → 进入 Loading
  function handleQuizComplete(payload) {
    const computed = payload.mode === 'dual'
      ? computeDualModeResult(QUESTIONS, payload.answers, QUESTIONS_PER_DIMENSION)
      : computeSingleModeResult(QUESTIONS, payload.answers, QUESTIONS_PER_DIMENSION)

    const resultCode = payload.mode === 'dual'
      ? computed.relationship?.code
      : computed.perception?.code
    if (resultCode) {
      submitStats(resultCode, payload.mode).catch(() => {})
    }

    setResultData(computed)
    setView('loading')
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  // Loading 结束 → 结果页
  function handleLoadingDone() {
    setView('result')
  }

  // 重新测试
  function handleRestart() {
    goQuizHome()
  }

  // ── Loading ────────────────────────────────────────────────
  if (view === 'loading') {
    return <Loading onDone={handleLoadingDone} />
  }

  // ── 结果海报 ───────────────────────────────────────────────
  if (view === 'result' && resultData) {
    return (
      <AppShell headerNav={headerNav} contentWidth="wide">
        <AnimatePresence mode="wait">
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0  }}
            exit={{    opacity: 0, y: -16 }}
            transition={{ duration: 0.4 }}
          >
            <ResultPoster
              resultData={resultData}
              onRestart={handleRestart}
            />
          </motion.div>
        </AnimatePresence>
      </AppShell>
    )
  }

  // ── 首页：问卷 或 情侣类型 ───────────────────────────────────
  return (
    <AppShell
      headerNav={headerNav}
      contentSurface={mainTab === 'types' ? 'white' : 'muted'}
    >
      {mainTab === 'types' ? (
        <CoupleTypesPage onStartTest={goQuizHome} />
      ) : mainTab === 'stats' ? (
        <StatsPage
          onStartTest={goQuizHome}
          onGoTypes={goCoupleTypes}
        />
      ) : mainTab === 'faq' ? (
        <FAQPage onStartTest={goQuizHome} />
      ) : mainTab === 'about' ? (
        <AboutPage
          onStartTest={goQuizHome}
          onGoFAQ={goFAQ}
        />
      ) : (
        <>
          <div className="pt-4 pb-4 text-center md:pt-8">
            <h1 className="text-h1 mb-2">CPTI 亲密光谱测试</h1>
            <p className="text-mute">一个人先看你眼中的我们，两个人拼出真正的我们。</p>
          </div>

          <HomeStepCards />

          <div className="my-6 border-t border-gray-100" />

          <Questionnaire onComplete={handleQuizComplete} />
        </>
      )}
    </AppShell>
  )
}
