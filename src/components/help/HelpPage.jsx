import AboutPage from '../about/AboutPage'
import FAQPage from '../faq/FAQPage'

export default function HelpPage({ onStartTest }) {
  return (
    <div className="pb-10">
      <FAQPage onStartTest={onStartTest} />

      <div className="my-10 border-t border-gray-200" />

      <AboutPage
        onStartTest={onStartTest}
        onGoFAQ={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      />
    </div>
  )
}
