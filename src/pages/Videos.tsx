import { useState, useMemo, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import AdBanner from '../components/AdBanner'

interface VideoItem {
  id: string
  type: 'short' | 'long'
  category: string
  title: string
  duration: string
  views: string
  date: string
  likes: string
  thumb: string
  ytId: string
  channel: string
  description: string
  featured?: boolean
}

const VIDEOS: VideoItem[] = [
  {
    id: 'v1',
    type: 'long',
    category: 'Match Highlights',
    title: 'Arsenal 4-0 Man City | Full Match Highlights & Key Moments',
    duration: '12:45',
    views: '5.4M',
    date: '3 days ago',
    likes: '142K',
    thumb: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&h=450&fit=crop&auto=format',
    ytId: 'dQw4w9WgXcQ',
    channel: 'FlowerZFC TV',
    description: 'Watch all four goals as Arsenal delivered an unforgettable performance against Manchester City at the Emirates Stadium.',
    featured: true,
  },
  {
    id: 'v2',
    type: 'short',
    category: 'Skills & Goals',
    title: 'Bukayo Saka Unstoppable Dribbling Skill Compilation 🔥',
    duration: '0:58',
    views: '2.1M',
    date: '2 days ago',
    likes: '98K',
    thumb: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=400&h=600&fit=crop&auto=format',
    ytId: 'dQw4w9WgXcQ',
    channel: 'FlowerZFC Shorts',
    description: 'Saka tearing up defenses in slow motion!',
  },
  {
    id: 'v3',
    type: 'short',
    category: 'Skills & Goals',
    title: 'Erling Haaland Hat-Trick in 8 Minutes 😱',
    duration: '0:45',
    views: '3.8M',
    date: '4 days ago',
    likes: '165K',
    thumb: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=400&h=600&fit=crop&auto=format',
    ytId: 'dQw4w9WgXcQ',
    channel: 'FlowerZFC Shorts',
    description: 'Relive the fastest hat-trick of the season.',
  },
  {
    id: 'v4',
    type: 'long',
    category: 'Match Highlights',
    title: 'Top 10 Goals of the Month | Premier League 2026',
    duration: '15:20',
    views: '8.2M',
    date: '5 days ago',
    likes: '310K',
    thumb: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&h=450&fit=crop&auto=format',
    ytId: 'dQw4w9WgXcQ',
    channel: 'FlowerZFC TV',
    description: 'The definitive countdown of the ten best long-range strikes and team goals.',
  },
  {
    id: 'v5',
    type: 'short',
    category: 'Skills & Goals',
    title: 'Zidane-Level Roulette Skill from Vinicius Jr. 🌟',
    duration: '0:38',
    views: '1.5M',
    date: '6 days ago',
    likes: '74K',
    thumb: 'https://images.unsplash.com/photo-1570498839593-e565b39455fc?w=400&h=600&fit=crop&auto=format',
    ytId: 'dQw4w9WgXcQ',
    channel: 'FlowerZFC Shorts',
    description: 'Pure Samba magic on the touchline.',
  },
  {
    id: 'v6',
    type: 'long',
    category: 'Interviews',
    title: 'AFCON Best Goals & Official Tournament Review',
    duration: '18:10',
    views: '3.1M',
    date: '1 week ago',
    likes: '112K',
    thumb: 'https://images.unsplash.com/photo-1624880357913-a8539238245b?w=800&h=450&fit=crop&auto=format',
    ytId: 'dQw4w9WgXcQ',
    channel: 'FlowerZFC Africa',
    description: 'Relive the passion, goals, and drama of the tournament.',
  },
  {
    id: 'v7',
    type: 'long',
    category: 'Tactical Analysis',
    title: 'Champions League Quarter-Finals Deep Dive Tactical Breakdown',
    duration: '22:15',
    views: '1.8M',
    date: '1 week ago',
    likes: '59K',
    thumb: 'https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?w=800&h=450&fit=crop&auto=format',
    ytId: 'dQw4w9WgXcQ',
    channel: 'FlowerZFC Tactics',
    description: 'Analyzing press resistance, wing rotation, and defensive blocks.',
  },
  {
    id: 'v8',
    type: 'short',
    category: 'Skills & Goals',
    title: 'Goalkeeper Saves Nobody Could Believe 🧤',
    duration: '0:52',
    views: '4.2M',
    date: '1 week ago',
    likes: '204K',
    thumb: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=600&fit=crop&auto=format',
    ytId: 'dQw4w9WgXcQ',
    channel: 'FlowerZFC Shorts',
    description: 'Incredible acrobatic saves from Raya, Alisson, and Ederson.',
  },
]

const CATEGORIES = ['All', 'Match Highlights', 'Skills & Goals', 'Tactical Analysis', 'Shorts', 'Interviews']

interface VideoModalProps {
  video: VideoItem
  onClose: () => void
  onSelectNext: (v: VideoItem) => void
  playlist: VideoItem[]
}

function VideoModal({ video, onClose, onSelectNext, playlist }: VideoModalProps) {
  const isShort = video.type === 'short'
  const [liked, setLiked] = useState(false)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.95)' }}>
      <div className="absolute inset-0" onClick={onClose} />
      <div className={`relative z-10 w-full ${isShort ? 'max-w-md' : 'max-w-5xl'}`}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-gray-400 hover:text-white transition-colors text-2xl"
        >
          ✕
        </button>

        {/* Video Player Box */}
        <div className={`relative bg-black rounded-xl overflow-hidden shadow-2xl ${isShort ? 'aspect-[9/16]' : 'aspect-video'}`}>
          <iframe
            src={`https://www.youtube.com/embed/${video.ytId}?autoplay=1`}
            title={video.title}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Video Info Box */}
        <div className="mt-4 p-5 rounded-xl border border-[#1e1e32]" style={{ background: '#131320' }}>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded text-white" style={{ background: '#00b341' }}>
              {video.category}
            </span>
            <span className="text-xs text-gray-500">{video.channel}</span>
          </div>

          <h3 className="text-xl font-black text-white mb-2 leading-tight" style={{ fontFamily: 'Big Shoulders Display' }}>
            {video.title}
          </h3>

          <p className="text-xs text-gray-400 mb-4 line-clamp-2 leading-relaxed">
            {video.description}
          </p>

          <div className="flex items-center justify-between text-xs text-gray-400 border-t border-[#1e1e32] pt-3 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span>👁 {video.views} views</span>
              <span>•</span>
              <span>{video.date}</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setLiked(l => !l)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  liked ? 'bg-[#00b341] text-white' : 'bg-[#1a1a28] text-gray-300 hover:text-white'
                }`}
              >
                {liked ? '❤️ Liked' : '🤍 Like'}
              </button>

              <a
                href={`https://youtube.com/watch?v=${video.ytId}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-[#00b341] text-white font-bold transition-opacity hover:opacity-80"
              >
                Watch on YouTube ↗
              </a>
            </div>
          </div>
        </div>

        {/* Up Next Carousel */}
        <div className="mt-4">
          <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Up Next in Football TV</p>
          <div className="flex gap-3 overflow-x-auto ticker-scroll pb-2">
            {playlist.filter(v => v.id !== video.id).map(v => (
              <button
                key={v.id}
                onClick={() => onSelectNext(v)}
                className="flex-none text-left rounded-lg overflow-hidden border border-[#1e1e32] hover:border-[#00b341] transition-all group"
                style={{ width: '160px', background: '#131320' }}
              >
                <div className="relative overflow-hidden" style={{ height: '90px' }}>
                  <img src={v.thumb} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <span className="absolute bottom-1 right-1 text-[9px] font-black px-1 rounded bg-black/80 text-white">
                    {v.duration}
                  </span>
                </div>
                <p className="p-2 text-[11px] font-bold text-white line-clamp-2 leading-snug">
                  {v.title}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Videos() {
  const { t } = useApp()
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null)
  const [videoList, setVideoList] = useState<VideoItem[]>(VIDEOS)

  useEffect(() => {
    // Channel feed for Sky Sports Football / Goal
    const rssUrl = 'https://www.youtube.com/feeds/videos.xml?channel_id=UCqZQlzSHbVJrwrn5XvzrzcA'
    fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`)
      .then(r => r.json())
      .then(data => {
        if (data.status === 'ok' && data.items?.length) {
          const parsed: VideoItem[] = data.items.map((item: any, i: number) => {
            const ytMatch = item.link?.match(/v=([^&]+)/)
            const ytId = ytMatch ? ytMatch[1] : 'dQw4w9WgXcQ'
            return {
              id: `yt-${i}`,
              type: item.title.toLowerCase().includes('short') ? 'short' : 'long',
              category: item.title.toLowerCase().includes('skill') ? 'Skills & Goals' : 'Match Highlights',
              title: item.title,
              duration: item.title.toLowerCase().includes('short') ? '0:59' : '8:30',
              views: `${Math.floor(Math.random() * 500 + 100)}K`,
              date: new Date(item.pubDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
              likes: `${Math.floor(Math.random() * 20 + 5)}K`,
              thumb: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
              ytId,
              channel: 'Sky Sports Football',
              description: item.description || item.title,
              featured: i === 0,
            }
          })
          setVideoList(prev => [...parsed, ...prev.filter(p => !p.id.startsWith('yt-'))])
        }
      })
      .catch(() => {})
  }, [])

  const featuredVideo = videoList.find(v => v.featured) || videoList[0] || VIDEOS[0]

  const filteredVideos = useMemo(() => {
    return videoList.filter(v => {
      const matchCat =
        selectedCategory === 'All' ||
        (selectedCategory === 'Shorts' && v.type === 'short') ||
        v.category.toLowerCase() === selectedCategory.toLowerCase()

      const matchSearch =
        searchQuery.trim() === '' ||
        v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.category.toLowerCase().includes(searchQuery.toLowerCase())

      return matchCat && matchSearch
    })
  }, [videoList, selectedCategory, searchQuery])

  return (
    <div style={{ background: '#0a0a14', minHeight: '100vh', width: '100%' }}>
      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg,#12122a 0%,#0a1a14 100%)', borderBottom: '1px solid #1e1e32' }}>
        <div className="max-w-screen-xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-[#00b341]">FOOTBALL MEDIA TV</span>
              <h1 className="text-4xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>
                {t('videos')} & Highlights
              </h1>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search goals, skills, highlights..."
                className="w-full px-4 py-2.5 text-xs text-white placeholder-gray-500 rounded-xl outline-none"
                style={{ background: '#131320', border: '1px solid #1e1e32' }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-8">
        {/* Category Filter Chips */}
        <div className="flex gap-2 overflow-x-auto ticker-scroll pb-2 mb-8">
          {CATEGORIES.map(c => {
            const active = selectedCategory === c
            return (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className="px-4 py-2 text-xs font-bold rounded-full transition-all flex-none"
                style={{
                  background: active ? '#00b341' : '#131320',
                  color: active ? '#ffffff' : '#9ca3af',
                  border: active ? '1px solid #00b341' : '1px solid #1e1e32',
                }}
              >
                {c}
              </button>
            )
          })}
        </div>

        {/* Leaderboard Ad */}
        <div className="mb-8 flex justify-center">
          <AdBanner size="leaderboard" />
        </div>

        {/* Featured Video Banner (when no active search/category filter) */}
        {selectedCategory === 'All' && !searchQuery && (
          <div
            onClick={() => setActiveVideo(featuredVideo)}
            className="group relative rounded-2xl overflow-hidden mb-10 border border-[#1e1e32] cursor-pointer shadow-2xl transition-all duration-300 hover:border-[#00b341]"
            style={{ height: '420px', background: '#131320' }}
          >
            <img
              src={featuredVideo.thumb}
              alt={featuredVideo.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, rgba(10,10,20,0.95) 20%, rgba(10,10,20,0.4) 60%, transparent 100%)' }}
            />

            {/* Play Badge */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-[#00b341] text-white flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                <svg width="24" height="24" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              </div>
            </div>

            <div className="absolute top-4 left-4 flex gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-[#00b341] text-white">
                FEATURED HIGHLIGHT
              </span>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded bg-black/80 text-white">
                ⏱ {featuredVideo.duration}
              </span>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
              <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight mb-2 group-hover:text-[#00b341] transition-colors" style={{ fontFamily: 'Big Shoulders Display' }}>
                {featuredVideo.title}
              </h2>
              <p className="text-xs sm:text-sm text-gray-300 max-w-2xl line-clamp-2 mb-3">
                {featuredVideo.description}
              </p>
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span>👁 {featuredVideo.views} views</span>
                <span>•</span>
                <span>{featuredVideo.date}</span>
                <span>•</span>
                <span>❤️ {featuredVideo.likes} likes</span>
              </div>
            </div>
          </div>
        )}

        {/* Video Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredVideos.map(v => (
            <div
              key={v.id}
              onClick={() => setActiveVideo(v)}
              className={`group flex flex-col justify-between rounded-xl overflow-hidden border border-[#1e1e32] hover:border-[#00b341] transition-all cursor-pointer ${
                v.type === 'short' ? 'sm:row-span-2' : ''
              }`}
              style={{ background: '#131320' }}
            >
              <div>
                <div className="relative overflow-hidden" style={{ height: v.type === 'short' ? '280px' : '180px' }}>
                  <img
                    src={v.thumb}
                    alt={v.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                    <div className="w-12 h-12 rounded-full bg-[#00b341] text-white flex items-center justify-center shadow-lg">
                      <svg width="18" height="18" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                  </div>

                  {/* Badge */}
                  <span className="absolute bottom-2 right-2 text-[10px] font-black px-1.5 py-0.5 rounded bg-black/80 text-white">
                    {v.duration}
                  </span>
                  {v.type === 'short' && (
                    <span className="absolute top-2 left-2 text-[9px] font-black px-2 py-0.5 rounded bg-[#00b341] text-white">
                      SHORT
                    </span>
                  )}
                </div>

                <div className="p-4">
                  <span className="text-[9px] font-black text-[#00b341] block mb-1 uppercase tracking-wider">
                    {v.category}
                  </span>
                  <h3 className="text-sm font-bold text-white group-hover:text-[#00b341] transition-colors line-clamp-2 leading-snug">
                    {v.title}
                  </h3>
                </div>
              </div>

              <div className="px-4 pb-4 pt-0 flex items-center justify-between text-[11px] text-gray-500 border-t border-[#1e1e32] mt-auto">
                <span className="pt-2">👁 {v.views}</span>
                <span className="pt-2">{v.date}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Channel Subscribe Banner Widget */}
        <div className="mt-12 p-8 rounded-2xl border border-[#00b341] text-center flex flex-col sm:flex-row items-center justify-between gap-6" style={{ background: 'linear-gradient(135deg, #131320 0%, #0a1a14 100%)' }}>
          <div className="text-left">
            <h3 className="text-2xl font-black text-white mb-1" style={{ fontFamily: 'Big Shoulders Display' }}>
              Subscribe to FlowerZFC Official Channel
            </h3>
            <p className="text-xs text-gray-400">
              Get instant match highlights, tactical breakdowns, and exclusive player interviews.
            </p>
          </div>

          <a
            href="https://youtube.com"
            target="_blank"
            rel="noreferrer"
            className="px-6 py-3 rounded-xl text-xs font-bold text-white shadow-xl transition-transform hover:scale-105 shrink-0"
            style={{ background: '#00b341' }}
          >
            ▶ Subscribe on YouTube
          </a>
        </div>
      </div>

      {/* Video Player Modal */}
      {activeVideo && (
        <VideoModal
          video={activeVideo}
          onClose={() => setActiveVideo(null)}
          onSelectNext={v => setActiveVideo(v)}
          playlist={VIDEOS}
        />
      )}
    </div>
  )
}
