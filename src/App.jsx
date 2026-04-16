import { Suspense, lazy, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import AppShell from './components/layout/AppShell'
import HomeStepCards from './components/home/HomeStepCards'
import Questionnaire from './components/Questionnaire'
import Loading from './components/Loading'
import FAQPage from './components/faq/FAQPage'
import AboutPage from './components/about/AboutPage'
import StatsPage from './components/stats/StatsPage'
import { QUESTIONS, QUESTIONS_PER_DIMENSION } from './data/questions'
import { computeDualModeResult, computeSingleModeResult } from './utils/scoring'
import { submitStats, submitTelemetry } from './utils/statsApi'
import { preloadTypeImage } from './data/typeImages'
import { clearQuizDraft } from './utils/quizDraft'
import { readSingleShareFromSearch, stripSingleShareFromUrl } from './utils/inviteCodec'

const ResultPoster = lazy(() => import('./components/ResultPoster'))
const CoupleTypesPage = lazy(() => import('./components/types/CoupleTypesPage'))

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
  const [loadingMeta, setLoadingMeta] = useState({
    preloadTask: Promise.resolve(),
    minDurationMs: 800,
  })

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

  useEffect(() => {
    const parsed = readSingleShareFromSearch(QUESTIONS, window.location.search)
    if (parsed.status !== 'ready') return

    try {
      const computed = computeSingleModeResult(QUESTIONS, parsed.answers, QUESTIONS_PER_DIMENSION)
      setResultData(computed)
      setLoadingMeta({
        preloadTask: computed?.perception?.code ? preloadTypeImage(computed.perception.code) : Promise.resolve(),
        minDurationMs: 500,
      })
      setView('loading')
      window.history.replaceState({}, '', stripSingleShareFromUrl())
      window.scrollTo({ top: 0, behavior: 'instant' })
    } catch {
      window.history.replaceState({}, '', stripSingleShareFromUrl())
    }
  }, [])

  // 答题完成 → 计算结果 → 进入 Loading
  function handleQuizComplete(payload) {
    clearQuizDraft()
    const computed = payload.mode === 'dual'
      ? computeDualModeResult(QUESTIONS, payload.answers, QUESTIONS_PER_DIMENSION)
      : computeSingleModeResult(QUESTIONS, payload.answers, QUESTIONS_PER_DIMENSION)

    const resultCode = payload.mode === 'dual'
      ? computed.relationship?.code
      : computed.perception?.code
    if (resultCode) {
      submitStats(resultCode, payload.mode).catch(() => {})
    }

    if (payload.mode === 'dual') {
      const [answersA = {}, answersB = {}] = Array.isArray(payload.answers) ? payload.answers : []
      const playerA = computed.players?.[0]
      const playerB = computed.players?.[1]
      if (playerA?.dimensionScores && answersA) {
        submitTelemetry({
          mode: 'dual',
          questionCount: QUESTIONS.length,
          answers: answersA,
          dimensionScores: playerA.dimensionScores,
        }).catch(() => {})
      }
      if (playerB?.dimensionScores && answersB) {
        submitTelemetry({
          mode: 'dual',
          questionCount: QUESTIONS.length,
          answers: answersB,
          dimensionScores: playerB.dimensionScores,
        }).catch(() => {})
      }
    } else if (computed?.perception?.dimensionScores && payload.answers) {
      submitTelemetry({
        mode: 'single',
        questionCount: QUESTIONS.length,
        answers: payload.answers,
        dimensionScores: computed.perception.dimensionScores,
      }).catch(() => {})
    }

    const preloadTask = resultCode
      ? preloadTypeImage(resultCode)
      : Promise.resolve()

    setResultData(computed)
    setLoadingMeta({
      preloadTask,
      minDurationMs: 800,
    })
    setView('loading')
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  // Loading 结束 → 结果页
  function handleLoadingDone() {
    setView('result')
  }

  // 重新测试
  function handleRestart() {
    clearQuizDraft()
    goQuizHome()
  }

  // ── Loading ────────────────────────────────────────────────
  if (view === 'loading') {
    return (
      <Loading
        onDone={handleLoadingDone}
        minDurationMs={loadingMeta.minDurationMs}
        preloadTask={loadingMeta.preloadTask}
      />
    )
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
            <Suspense fallback={<div className="py-16 text-center text-base-mute">正在准备报告内容...</div>}>
              <ResultPoster
                resultData={resultData}
                onRestart={handleRestart}
              />
            </Suspense>
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
        <Suspense fallback={<div className="py-12 text-center text-base-mute">正在加载情侣类型...</div>}>
          <CoupleTypesPage onStartTest={goQuizHome} />
        </Suspense>
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
