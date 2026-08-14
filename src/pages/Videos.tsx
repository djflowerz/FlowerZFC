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

const VIDEOS: VideoItem[] = []

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
    // Official Sky Sports Football YouTube RSS feed (channel ID UCNAf1k0yIjyGu3k9BwAg3LG)
    const rssUrl = 'https://www.youtube.com/feeds/videos.xml?channel_id=UCNAf1k0yIjyGu3k9BwAg3LG'
    fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`)
      .then(r => r.json())
      .then(data => {
        if (data.status === 'ok' && data.items?.length) {
          const footballKeywords = ['football', 'goal', 'match', 'premier', 'soccer', 'highlights', 'league', 'cup', 'united', 'city', 'arsenal', 'chelsea', 'liverpool', 'real madrid', 'barcelona', 'bayern', 'psg', 'derby', 'vs', 'ucl', 'afcon', 'skill']
          const filtered = data.items.filter((item: any) => {
            const titleLower = item.title.toLowerCase()
            return footballKeywords.some(kw => titleLower.includes(kw))
          })

          const itemsToMap = filtered.length > 0 ? filtered : data.items
          const parsed: VideoItem[] = itemsToMap.map((item: any, i: number) => {
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
          setVideoList(parsed)
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
        {videoList.length === 0 ? (
          <div className="text-center py-24 rounded-2xl border border-[#1e1e32]" style={{ background: '#131320' }}>
            <p className="text-5xl mb-3">🎬</p>
            <h3 className="text-2xl font-black text-white mb-2" style={{ fontFamily: 'Big Shoulders Display' }}>No Videos Available Yet</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto">Football highlights, skills and match videos will appear here once published.</p>
          </div>
        ) : (
          <>
            {selectedCategory === 'All' && !searchQuery && featuredVideo && (
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
          </>
        )}

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
          playlist={videoList}
        />
      )}
    </div>
  )
}
