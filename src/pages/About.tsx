import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AdBanner from '../components/AdBanner'

export default function About() {
  const { t } = useApp()
  return (
    <div className="max-w-screen-md mx-auto px-4 py-12">
      <div className="flex justify-center mb-8">
        <AdBanner size="leaderboard" label="Partner With FlowerZFC" />
      </div>
      <h1 className="text-5xl font-black text-white mb-4" style={{ fontFamily: 'Big Shoulders Display' }}>About FlowerZFC</h1>
      <p className="text-lg text-gray-400 mb-8">{t('tagline')}</p>
      <div className="space-y-8 text-sm text-gray-300 leading-relaxed">
        <section>
          <h2 className="text-2xl font-black text-white mb-3" style={{ fontFamily: 'Big Shoulders Display' }}>Our Story</h2>
          <p>FlowerZFC was born from a simple frustration: East Africa's football fans were underserved by global sports media. We built a platform that combines world-class live scores and football news with a deep focus on the East African football scene — Harambee Stars, Simba SC, Gor Mahia, and the regional leagues that matter to us.</p>
        </section>
        <section>
          <h2 className="text-2xl font-black text-white mb-3" style={{ fontFamily: 'Big Shoulders Display' }}>Mission</h2>
          <p>To deliver football news, live scores, and entertainment that reflects East Africa's passion for the game — available in the languages our community speaks, at the quality our fans deserve.</p>
        </section>
        <section>
          <h2 className="text-2xl font-black text-white mb-3" style={{ fontFamily: 'Big Shoulders Display' }}>The Team</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { name: 'DJ Flowerz', role: 'Founder & Creative Director', bio: 'Nairobi-based DJ, football fanatic, and founder of Bigstone Entertainment. Brings music and football together.' },
              { name: 'James Mwangi', role: 'Head of Football Content', bio: 'Veteran football journalist covering East African and European football for 12+ years.' },
            ].map(m => (
              <div key={m.name} className="p-4 rounded-lg" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                <div className="w-12 h-12 rounded-full mb-3 flex items-center justify-center text-2xl" style={{ background: '#1a1a28' }}>👤</div>
                <h3 className="font-black text-white text-base" style={{ fontFamily: 'Big Shoulders Display' }}>{m.name}</h3>
                <p className="text-xs text-[#00b341] mb-2">{m.role}</p>
                <p className="text-xs text-gray-500">{m.bio}</p>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="text-2xl font-black text-white mb-3" style={{ fontFamily: 'Big Shoulders Display' }}>Editorial Standards</h2>
          <p>We source transfer news from verifiable reports and API-Football data, writing original commentary rather than republishing third-party content. Corrections are handled within 24 hours — contact us at corrections@flowerz.fc.</p>
        </section>
      </div>
    </div>
  )
}
