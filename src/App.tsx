import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import { AppProvider } from './context/AppContext'
import Header from './components/Header'
import Footer from './components/Footer'
import CookieBanner from './components/CookieBanner'
import Home from './pages/Home'
import Scores from './pages/Scores'
import MatchDetail from './pages/MatchDetail'
import Fixtures from './pages/Fixtures'
import Standings from './pages/Standings'
import News from './pages/News'
import Article from './pages/Article'
import Transfers from './pages/Transfers'
import Videos from './pages/Videos'
import Mixes from './pages/Mixes'
import Shop from './pages/Shop'
import Product from './pages/Product'
import Checkout from './pages/Checkout'
import Predictions from './pages/Predictions'
import Advertise from './pages/Advertise'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import Account from './pages/Account'
import About from './pages/About'
import Contact from './pages/Contact'
import Club from './pages/Club'
import Player from './pages/Player'
import Search from './pages/Search'
import LiveBlog from './pages/LiveBlog'
import Fantasy from './pages/Fantasy'
import Tips from './pages/Tips'
import Quiz from './pages/Quiz'
import EastAfrica from './pages/EastAfrica'
import Tip from './pages/Tip'
import Admin from './pages/Admin'
import AdminRouteGuard from './components/AdminRouteGuard'
import TipButton from './components/TipButton'

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center text-center px-4">
      <div>
        <p className="text-8xl font-black text-white mb-4" style={{ fontFamily: 'Big Shoulders Display', color: '#00b341' }}>404</p>
        <h1 className="text-3xl font-black text-white mb-2" style={{ fontFamily: 'Big Shoulders Display' }}>Page Not Found</h1>
        <p className="text-gray-400 mb-8">The page you're looking for doesn't exist.</p>
        <a href="/" className="inline-block px-6 py-3 text-sm font-bold text-white rounded" style={{ background: '#00b341' }}>Back to Home</a>
      </div>
    </div>
  )
}

function LegalPage({ title, content }: { title: string; content: string }) {
  return (
    <div className="max-w-screen-md mx-auto px-4 py-12">
      <p className="text-xs text-gray-600 mb-2">Last updated: August 10, 2026</p>
      <h1 className="text-4xl font-black text-white mb-6" style={{ fontFamily: 'Big Shoulders Display' }}>{title}</h1>
      <div className="prose text-gray-300 text-sm leading-relaxed space-y-4" dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  )
}

import StickyAnchorAd from './components/StickyAnchorAd'
import LoginPromptModal from './components/LoginPromptModal'
import ErrorBoundary from './components/ErrorBoundary'

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main style={{ paddingTop: '56px', minHeight: '100vh', paddingBottom: '70px' }}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
      <CookieBanner />
      <LoginPromptModal />
      <TipButton />
      <StickyAnchorAd />
      <Footer />
    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout><Home /></Layout>} />
          <Route path="/scores" element={<Layout><Scores /></Layout>} />
          <Route path="/scores/:id" element={<Layout><MatchDetail /></Layout>} />
          <Route path="/match/:id" element={<Layout><MatchDetail /></Layout>} />
          <Route path="/live/:matchId" element={<Layout><LiveBlog /></Layout>} />
          <Route path="/fixtures" element={<Layout><Fixtures /></Layout>} />
          <Route path="/standings" element={<Layout><Standings /></Layout>} />
          <Route path="/news" element={<Layout><News /></Layout>} />
          <Route path="/news/:id" element={<Layout><Article /></Layout>} />
          <Route path="/transfers" element={<Layout><Transfers /></Layout>} />
          <Route path="/fantasy" element={<Layout><Fantasy /></Layout>} />
          <Route path="/tips" element={<Layout><Tips /></Layout>} />
          <Route path="/quiz" element={<Layout><Quiz /></Layout>} />
          <Route path="/east-africa" element={<Layout><EastAfrica /></Layout>} />
          <Route path="/videos" element={<Layout><Videos /></Layout>} />
          <Route path="/mixes" element={<Layout><Mixes /></Layout>} />
          <Route path="/shop" element={<Layout><Shop /></Layout>} />
          <Route path="/shop/:id" element={<Layout><Product /></Layout>} />
          <Route path="/product/:id" element={<Layout><Product /></Layout>} />
          <Route path="/checkout" element={<Layout><Checkout /></Layout>} />
          <Route path="/predictions" element={<Layout><Predictions /></Layout>} />
          <Route path="/advertise" element={<Layout><Advertise /></Layout>} />
          <Route path="/admin" element={<AdminRouteGuard><Layout><Admin /></Layout></AdminRouteGuard>} />
          <Route path="/login" element={<Layout><Login /></Layout>} />
        <Route path="/reset-password" element={<Layout><ResetPassword /></Layout>} />
          <Route path="/account" element={<Layout><Account /></Layout>} />
          <Route path="/account/:section" element={<Layout><Account /></Layout>} />
          <Route path="/about" element={<Layout><About /></Layout>} />
          <Route path="/contact" element={<Layout><Contact /></Layout>} />
          <Route path="/club/:slug" element={<Layout><Club /></Layout>} />
          <Route path="/club/:id" element={<Layout><Club /></Layout>} />
          <Route path="/player/:id" element={<Layout><Player /></Layout>} />
          <Route path="/search" element={<Layout><Search /></Layout>} />
          <Route path="/privacy" element={<Layout><LegalPage title="Privacy Policy" content="<p>FlowerZFC collects account information (name, email), usage data via Google Analytics (GA4), and advertising data via Google AdSense. We do not sell your personal data to third parties.</p><p><strong>Data we collect:</strong> Account credentials, comments, prediction history, followed clubs, cookie preferences, browsing behavior (anonymized via GA4).</p><p><strong>Third parties:</strong> Google Analytics, Google AdSense, Printful/Printify (for merch orders). Each operates under their own privacy policies.</p><p><strong>Your rights (GDPR):</strong> You may request access to, correction of, or deletion of your personal data by emailing privacy@flowerz.fc. We respond within 30 days.</p><p><strong>Cookies:</strong> We use essential cookies for authentication, analytics cookies (GA4), and advertising cookies (AdSense). Manage preferences via the cookie banner.</p><p><strong>Data retention:</strong> Account data is retained until account deletion. Analytics data is retained for 26 months.</p><p>Contact: privacy@flowerz.fc</p>" /></Layout>} />
          <Route path="/terms" element={<Layout><LegalPage title="Terms of Service" content="<p>By using FlowerZFC, you agree to these terms. You must be 13+ years old to create an account.</p><p><strong>Acceptable use:</strong> No spam, harassment, or illegal content in comments. One account per person. No scraping or automated access without permission.</p><p><strong>Content:</strong> Site content is owned by FlowerZFC. User-submitted comments remain yours but grant us a license to display them.</p><p><strong>Predictions:</strong> For entertainment only. Not financial or betting advice.</p><p><strong>Shop:</strong> Orders are subject to Printful/Printify's fulfillment policies. We are not liable for shipping delays outside our control.</p><p><strong>Governing law:</strong> Republic of Kenya.</p>" /></Layout>} />
          <Route path="/cookies" element={<Layout><LegalPage title="Cookie Policy" content="<p>We use cookies to improve your experience on FlowerZFC.</p><p><strong>Essential cookies:</strong> Required for authentication and site functionality. Cannot be disabled.</p><p><strong>Analytics cookies:</strong> Google Analytics 4 (GA4) to understand site usage. Can be declined in cookie settings.</p><p><strong>Advertising cookies:</strong> Google AdSense to serve relevant ads. Can be declined in cookie settings.</p><p>To manage cookies, click 'Manage preferences' on the cookie consent banner or visit your browser settings.</p>" /></Layout>} />
          <Route path="/dmca" element={<Layout><LegalPage title="DMCA / Copyright" content="<p>FlowerZFC respects intellectual property rights. If you believe content on this site infringes your copyright, contact dmca@flowerz.fc with:</p><ul><li>Your contact information</li><li>A description of the copyrighted work</li><li>The URL of the allegedly infringing content</li><li>A statement of good faith belief that the use is unauthorized</li></ul><p>We will respond within 5 business days and remove infringing content promptly upon valid notice.</p>" /></Layout>} />
          <Route path="/tip" element={<Layout><Tip /></Layout>} />
          <Route path="*" element={<Layout><NotFound /></Layout>} />
        </Routes>
      </BrowserRouter>
      <ToastContainer
        position="bottom-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        toastStyle={{ fontFamily: "'Hanken Grotesk', 'Noto Sans', system-ui, sans-serif" }}
      />
    </AppProvider>
    </ErrorBoundary>
  )
}
