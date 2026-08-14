import { useState } from 'react'
import { useApp } from '../context/AppContext'
import AdBanner from '../components/AdBanner'

export default function Contact() {
  const { t } = useApp()
  const [form, setForm] = useState({ name: '', email: '', subject: 'General', message: '' })
  const [sent, setSent] = useState(false)

  return (
    <div className="max-w-screen-md mx-auto px-4 py-12">
      <div className="flex justify-center mb-8">
        <AdBanner size="leaderboard" label="Contact & Advertising Inquiry Space" />
      </div>
      <h1 className="text-4xl font-black text-white mb-2" style={{ fontFamily: 'Big Shoulders Display' }}>{t('contactUs')}</h1>
      <p className="text-gray-400 mb-8">We usually reply within 2 business days.</p>
      {sent ? (
        <div className="text-center py-16 rounded-xl" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
          <p className="text-5xl mb-3">✅</p>
          <h2 className="text-xl font-black text-white mb-1" style={{ fontFamily: 'Big Shoulders Display' }}>Message Sent!</h2>
          <p className="text-sm text-gray-400">We'll get back to you within 2 business days.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your Name *" className="w-full px-4 py-3 text-sm text-white placeholder:text-gray-600 rounded outline-none focus:ring-1 focus:ring-red-500" style={{ background: '#131320', border: '1px solid #1e1e32' }} />
            <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email *" type="email" className="w-full px-4 py-3 text-sm text-white placeholder:text-gray-600 rounded outline-none focus:ring-1 focus:ring-red-500" style={{ background: '#131320', border: '1px solid #1e1e32' }} />
            <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="w-full px-4 py-3 text-sm text-white rounded outline-none" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
              {['General', 'Press', 'Correction request', 'Technical issue', 'Advertising'].map(s => <option key={s}>{s}</option>)}
            </select>
            <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Your message..." rows={5} className="w-full px-4 py-3 text-sm text-white placeholder:text-gray-600 rounded outline-none focus:ring-1 focus:ring-red-500 resize-none" style={{ background: '#131320', border: '1px solid #1e1e32' }} />
            <button onClick={() => form.name && form.email && setSent(true)} className="w-full py-3 text-sm font-bold text-white rounded transition-colors hover:opacity-90" style={{ background: '#00b341' }}>Send Message →</button>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>Direct Contact</h3>
            <div className="space-y-3">
              <a href="mailto:hello@flowerz.fc" className="flex items-center gap-3 p-3 rounded text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                ✉️ hello@flowerz.fc
              </a>
              <a href="https://wa.me/254700000000" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded text-sm text-green-400 hover:bg-white/5 transition-colors" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                💬 +254 700 000 000 (WhatsApp)
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
