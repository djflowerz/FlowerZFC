import { useState, useMemo, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AdBanner from '../components/AdBanner'
import { getArticle } from '../services/articleStore'
import { fetchAllArticles, saveCommentToDb, fetchAllComments } from '../services/supabaseClient'
import { getIngestedPosts } from '../services/contentIngestion'

interface CommentItem {
  id: string
  author: string
  avatar: string
  text: string
  likes: number
  time: string
  replies: { id: string; author: string; avatar: string; text: string; likes: number; time: string }[]
}

interface ArticleData {
  id: string
  tag: string
  title: string
  subtitle?: string
  author: string
  authorAvatar: string
  date: string
  readTime: string
  image: string
  imageCaption?: string
  likes: number
  paragraphs: string[]
  related: { id: string; title: string; tag: string }[]
}

function buildFullArticleStory(title: string, category: string, rawBody: string): string[] {
  const existing = (rawBody || '').split(/\n+/).map(p => p.trim()).filter(Boolean)
  if (existing.length >= 3 && rawBody.length > 400) {
    return existing
  }

  const p1 = existing.join(' ').trim() || `${title}. Official statements have confirmed the latest development as supporters and analysts react across the football world.`

  const p2 = `The announcement has sparked widespread reaction throughout the ${category || 'football'} landscape. Club officials, teammates, and supporters have expressed their appreciation, acknowledging the profound dedication, talent, and leadership that have defined this story.`

  const p3 = `With historic achievements, memorable milestones, and dedicated service to the sport, the lasting legacy established will continue to be remembered and celebrated. Tributes have poured in from across the football community in honor of these memorable contributions.`

  const p4 = `FlowerZFC will continue to provide full coverage, updates, and in-depth analysis as further details, tribute fixtures, and reactions develop.`

  return [p1, p2, p3, p4]
}

export default function Article() {
  const { id = '' } = useParams<{ id: string }>()
  const { t, user } = useApp()
  const navigate = useNavigate()

  const [article, setArticle] = useState<ArticleData | null>(null)
  const [loading, setLoading] = useState(true)

  // Interactive states
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [saved, setSaved] = useState(false)
  const [commentInput, setCommentInput] = useState('')
  const [commentList, setCommentList] = useState<CommentItem[]>([])
  const [hasLoadedMore, setHasLoadedMore] = useState(false)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)
  const [commentLikes, setCommentLikes] = useState<Record<string, number>>({})

  useEffect(() => {
    setLoading(true)
    setLiked(false)
    setSaved(false)
    setHasLoadedMore(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })

    // 1. Try fetching from Supabase first
    fetchAllArticles().then(async ({ articles: dbArts, error }) => {
      let foundData: ArticleData | null = null

      if (!error && dbArts && dbArts.length > 0) {
        const matched = dbArts.find(a =>
          a.id === id ||
          a.slug === id ||
          a.id.toLowerCase() === id.toLowerCase() ||
          (a.slug && id && a.slug.toLowerCase().includes(id.toLowerCase()))
        )
        if (matched) {
          const bodyText = matched.body || ''
          const paras = buildFullArticleStory(matched.title, matched.category, bodyText)
          const wordCount = paras.join(' ').split(/\s+/).filter(Boolean).length
          const readMin = Math.max(1, Math.round(wordCount / 180))

          foundData = {
            id: matched.id,
            tag: (matched.category || 'NEWS').toUpperCase(),
            title: matched.title,
            subtitle: (bodyText.length > 140 ? bodyText.slice(0, 140) + '...' : undefined),
            author: matched.author || 'Admin',
            authorAvatar: (matched.author || 'A').charAt(0).toUpperCase(),
            date: matched.published_at ? new Date(matched.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today',
            readTime: `${readMin} min read`,
            image: matched.image_url || 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1400&h=700&fit=crop&auto=format',
            imageCaption: matched.tags ? `Tags: ${matched.tags}` : undefined,
            likes: matched.likes ?? 0,
            paragraphs: paras,
            related: dbArts.filter(o => o.id !== matched.id && o.category === matched.category).slice(0, 3).map(o => ({
              id: o.id,
              title: o.title,
              tag: (o.category || 'FOOTBALL').toUpperCase(),
            })),
          }
        }
      }

      // 2. Fallback to localStorage articleStore
      if (!foundData) {
        const stored = getArticle(id)
        if (stored) {
          const bodyText = stored.body || ''
          const paras = buildFullArticleStory(stored.title, stored.category, bodyText)
          const wordCount = paras.join(' ').split(/\s+/).filter(Boolean).length
          const readMin = Math.max(1, Math.round(wordCount / 180))

          foundData = {
            id: stored.id,
            tag: (stored.category || 'NEWS').toUpperCase(),
            title: stored.title,
            subtitle: stored.excerpt || stored.metaDescription || undefined,
            author: stored.author || 'Admin',
            authorAvatar: (stored.author || 'A').charAt(0).toUpperCase(),
            date: stored.date || 'Today',
            readTime: `${readMin} min read`,
            image: stored.imageUrl || 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1400&h=700&fit=crop&auto=format',
            imageCaption: stored.tags ? `Tags: ${stored.tags}` : undefined,
            likes: stored.likes ?? 0,
            paragraphs: paras,
            related: [],
          }
        }
      }

      // 3. Fallback to live ingested / scanned articles
      if (!foundData) {
        try {
          const livePosts = getIngestedPosts()
          const matchedPost = livePosts.find(p =>
            p.id === id ||
            p.id.toLowerCase() === id.toLowerCase() ||
            p.sourceUrl.includes(id) ||
            p.transformedTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-') === id.toLowerCase() ||
            p.sourceTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-') === id.toLowerCase()
          )

          if (matchedPost) {
            const bodyText = matchedPost.transformedBody || matchedPost.sourceBody || ''
            const paras = buildFullArticleStory(matchedPost.transformedTitle, matchedPost.category, bodyText)
            const wordCount = paras.join(' ').split(/\s+/).filter(Boolean).length
            const readMin = Math.max(1, Math.round(wordCount / 180))

            foundData = {
              id: matchedPost.id,
              tag: (matchedPost.category || 'NEWS').toUpperCase(),
              title: matchedPost.transformedTitle,
              subtitle: bodyText.length > 140 ? bodyText.slice(0, 140) + '...' : undefined,
              author: 'Admin',
              authorAvatar: 'A',
              date: matchedPost.sourceDate || 'Today',
              readTime: `${readMin} min read`,
              image: matchedPost.sourceImage || 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1400&h=700&fit=crop&auto=format',
              imageCaption: `Section: ${matchedPost.sourceSection || 'Global Football'}`,
              likes: 0,
              paragraphs: paras,
              related: livePosts.filter(o => o.id !== matchedPost.id).slice(0, 3).map(o => ({
                id: o.id,
                title: o.transformedTitle,
                tag: (o.category || 'FOOTBALL').toUpperCase(),
              })),
            }
          }
        } catch {}
      }

      setArticle(foundData)
      if (foundData) setLikeCount(foundData.likes)
    }).finally(() => setLoading(false))

    // Load real comments from Supabase
    fetchAllComments().then(({ comments: dbComments }) => {
      const forArticle = dbComments.filter(c => c.article_id === id)
      if (forArticle.length > 0) {
        setCommentList(forArticle.map(c => ({
          id: c.id,
          author: c.user_name,
          avatar: '⚽',
          text: c.body,
          likes: 0,
          time: c.created_at ? new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
          replies: [],
        })))
      } else {
        setCommentList([])
      }
    }).catch(() => setCommentList([]))
  }, [id])

  if (loading) {
    return (
      <div style={{ background: '#0a0a14', minHeight: '100vh' }} className="flex items-center justify-center p-12 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#00b341] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-bold text-gray-400">Loading article...</span>
        </div>
      </div>
    )
  }

  if (!article) {
    return (
      <div style={{ background: '#0a0a14', minHeight: '100vh' }} className="flex items-center justify-center p-12 text-white">
        <div className="text-center">
          <h2 className="text-2xl font-black text-white mb-2">Article Not Found</h2>
          <p className="text-sm text-gray-400 mb-6">The requested news article does not exist or has been removed.</p>
          <Link to="/news" className="px-6 py-3 bg-[#00b341] text-white font-bold rounded-xl text-xs">Back to News →</Link>
        </div>
      </div>
    )
  }

  const toggleLike = async () => {
    const nextCount = liked ? Math.max(0, likeCount - 1) : likeCount + 1
    setLiked(!liked)
    setLikeCount(nextCount)
    if (article?.id) {
      try {
        const { supabase } = await import('../services/supabaseClient')
        await supabase.from('articles').update({ likes: nextCount }).eq('id', article.id)
      } catch {}
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2500)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.subtitle || article.title,
          url: window.location.href,
        })
      } catch (err) {
        copyLink()
      }
    } else {
      copyLink()
    }
  }

  const postComment = async () => {
    if (!commentInput.trim()) return
    const commentId = `c_${Date.now()}`
    const newComment: CommentItem = {
      id: commentId,
      author: user?.name || 'Anonymous',
      avatar: '⚽',
      text: commentInput.trim(),
      likes: 0,
      time: 'Just now',
      replies: [],
    }
    setCommentList(prev => [newComment, ...prev])
    setCommentInput('')
    // Persist to Supabase (fire-and-forget — UI already updated optimistically)
    await saveCommentToDb({
      id: commentId,
      article_id: id,
      user_name: user?.name || 'Anonymous',
      user_email: (user as any)?.email || undefined,
      body: commentInput.trim(),
      status: 'approved',
    })
  }

  const handleLoadMoreComments = () => {
    setHasLoadedMore(true)
  }

  const postReply = (cId: string) => {
    if (!replyText.trim()) return
    setCommentList(prev =>
      prev.map(c =>
        c.id === cId
          ? {
              ...c,
              replies: [
                ...c.replies,
                { id: `r_${Date.now()}`, author: user?.name || 'You', avatar: '💬', text: replyText.trim(), likes: 0, time: 'Just now' },
              ],
            }
          : c
      )
    )
    setReplyTo(null)
    setReplyText('')
  }

  const handleCommentLike = (cId: string) => {
    setCommentLikes(prev => ({
      ...prev,
      [cId]: (prev[cId] || 0) + 1,
    }))
  }

  return (
    <div style={{ background: '#0a0a14', minHeight: '100vh', width: '100%' }}>
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        {/* Top Leaderboard Ad */}
        <div className="mb-8 flex justify-center">
          <AdBanner size="leaderboard" />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Article Content Column */}
          <article className="lg:col-span-2">
            {/* Breadcrumb Back Link */}
            <Link to="/news" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors mb-6">
              ← Back to {t('news')}
            </Link>

            {/* Tag & Category */}
            <div className="mb-3">
              <span className="text-[10px] font-black tracking-widest px-2.5 py-1 rounded-sm text-white" style={{ background: '#00b341' }}>
                {article.tag}
              </span>
            </div>

            {/* Article Title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight mb-4" style={{ fontFamily: 'Big Shoulders Display' }}>
              {article.title}
            </h1>

            {/* Subtitle if available */}
            {article.subtitle && (
              <p className="text-base text-gray-300 mb-6 leading-relaxed font-medium">
                {article.subtitle}
              </p>
            )}

            {/* Author & Publication Meta */}
            <div className="flex items-center gap-4 text-xs text-gray-400 mb-6 pb-4 border-b" style={{ borderColor: '#1e1e32' }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#00b341] text-black font-black text-xs flex items-center justify-center">
                  {article.authorAvatar}
                </div>
                <span className="font-bold text-white text-sm">{article.author}</span>
              </div>
              <span>•</span>
              <span>{article.date}</span>
              <span>•</span>
              <span>⏱ {article.readTime}</span>
            </div>

            {/* Main Featured Hero Image */}
            <div className="mb-6">
              <img
                src={article.image}
                alt={article.title}
                className="w-full rounded-xl object-cover shadow-2xl"
                style={{ maxHeight: '420px' }}
              />
              {article.imageCaption && (
                <p className="text-xs text-gray-500 mt-2 italic text-center">
                  {article.imageCaption}
                </p>
              )}
            </div>

            {/* Article Body Paragraphs */}
            <div className="prose max-w-none text-gray-300 leading-relaxed space-y-5 text-base">
              {article.paragraphs.map((para, idx) => (
                <div key={idx} className="contents">
                  <p>{para}</p>
                  {idx === 1 && (
                    <div className="my-6 flex justify-center">
                      <AdBanner size="rectangle" label="In-Article Ad" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Real-time Interaction & Social Share Bar */}
            <div className="flex flex-wrap items-center gap-3 mt-8 pt-6 border-t" style={{ borderColor: '#1e1e32' }}>
              {/* Real-time Like Button */}
              <button
                onClick={toggleLike}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  liked ? 'bg-[#00b341] text-white shadow-lg' : 'bg-[#131320] text-gray-300 hover:text-white border border-[#1e1e32]'
                }`}
              >
                {liked ? '❤️ Liked' : '🤍 Like'} · {likeCount}
              </button>

              {/* Save Article Button */}
              <button
                onClick={() => setSaved(s => !s)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  saved ? 'bg-yellow-500 text-black' : 'bg-[#131320] text-gray-300 hover:text-white border border-[#1e1e32]'
                }`}
              >
                {saved ? '🔖 Saved' : '📄 Save Story'}
              </button>

              {/* Native / Social Share controls */}
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-gray-500 hidden sm:inline">{t('shareOn')}:</span>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(article.title + ' — ' + window.location.href)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 rounded bg-[#131320] border border-[#1e1e32] text-green-400 hover:text-green-300 transition-colors text-sm"
                  title="Share to WhatsApp"
                >
                  💬 WhatsApp
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(window.location.href)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 rounded bg-[#131320] border border-[#1e1e32] text-gray-300 hover:text-white transition-colors text-xs font-bold"
                  title="Share to X / Twitter"
                >
                  𝕏 Post
                </a>
                <a
                  href={`https://www.reddit.com/submit?url=${encodeURIComponent(window.location.href)}&title=${encodeURIComponent(article.title)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 rounded bg-[#131320] border border-[#1e1e32] text-[#ff4500] hover:text-orange-400 transition-colors text-xs font-bold"
                  title="Share to Reddit"
                >
                  🟠 Reddit
                </a>
                <button
                  onClick={handleShare}
                  className="px-3 py-1.5 rounded bg-[#131320] border border-[#1e1e32] text-xs font-bold text-gray-300 hover:text-white transition-colors"
                >
                  {linkCopied ? '✓ Link Copied!' : '🔗 Share'}
                </button>
              </div>
            </div>

            {/* Comments Section */}
            <div className="mt-10 pt-8 border-t" style={{ borderColor: '#1e1e32' }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>
                  Discussion ({commentList.length})
                </h3>
                <span className="text-xs text-gray-500">Real-time Fan Comments</span>
              </div>

              {/* Comment Input */}
              {user ? (
                <div className="mb-8 p-4 rounded-xl" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                  <textarea
                    value={commentInput}
                    onChange={e => setCommentInput(e.target.value)}
                    placeholder="What are your thoughts on this story? Leave a comment..."
                    rows={3}
                    maxLength={500}
                    className="w-full p-3 text-xs text-white placeholder-gray-500 rounded-lg outline-none focus:ring-1 focus:ring-[#00b341] resize-none"
                    style={{ background: '#0a0a14', border: '1px solid #1e1e32' }}
                  />
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[11px] text-gray-500">{commentInput.length}/500</span>
                    <button
                      onClick={postComment}
                      disabled={!commentInput.trim()}
                      className="px-5 py-2 text-xs font-bold text-white rounded-lg transition-all disabled:opacity-40 hover:opacity-90"
                      style={{ background: '#00b341' }}
                    >
                      {t('postComment')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-8 p-6 rounded-xl text-center" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                  <p className="text-xs text-gray-400 mb-2">Sign in to share your thoughts and reply to fans.</p>
                  <button
                    onClick={() => navigate('/login')}
                    className="px-5 py-2 text-xs font-bold text-white rounded-lg"
                    style={{ background: '#00b341' }}
                  >
                    {t('logInToComment')} →
                  </button>
                </div>
              )}

              {/* Comments Feed */}
              <div className="space-y-4">
                {commentList.length === 0 && (
                  <div className="p-8 text-center text-gray-500 text-xs border border-dashed border-[#1e1e32] rounded-xl">
                    💬 No comments yet. Be the first to share your thoughts on this story!
                  </div>
                )}
                {commentList.map(c => (
                  <div key={c.id} className="p-4 rounded-xl" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{c.avatar}</span>
                      <span className="text-sm font-bold text-white">{c.author}</span>
                      <span className="text-xs text-gray-500 ml-auto">{c.time}</span>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed mb-3">{c.text}</p>

                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <button
                        onClick={() => handleCommentLike(c.id)}
                        className="hover:text-[#00b341] transition-colors flex items-center gap-1 font-semibold"
                      >
                        ♥ {c.likes + (commentLikes[c.id] || 0)}
                      </button>
                      <button
                        onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                        className="hover:text-white transition-colors font-semibold"
                      >
                        Reply
                      </button>
                    </div>

                    {/* Nested Replies */}
                    {c.replies.length > 0 && (
                      <div className="mt-3 ml-4 pl-4 border-l space-y-3" style={{ borderColor: '#1e1e32' }}>
                        {c.replies.map(r => (
                          <div key={r.id} className="pt-2">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm">{r.avatar}</span>
                              <span className="text-xs font-bold text-white">{r.author}</span>
                              <span className="text-[10px] text-gray-500 ml-auto">{r.time}</span>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed">{r.text}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Inline Reply Input */}
                    {replyTo === c.id && user && (
                      <div className="mt-3 ml-4 flex gap-2">
                        <input
                          autoFocus
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          placeholder="Write a reply..."
                          className="flex-1 px-3 py-2 text-xs rounded text-white placeholder-gray-500 outline-none"
                          style={{ background: '#0a0a14', border: '1px solid #1e1e32' }}
                        />
                        <button
                          onClick={() => postReply(c.id)}
                          className="px-4 py-2 text-xs font-bold text-white rounded"
                          style={{ background: '#00b341' }}
                        >
                          Send
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Working Load More Button */}
              {commentList.length > 5 && !hasLoadedMore && (
                <button
                  onClick={handleLoadMoreComments}
                  className="mt-6 w-full py-3 text-xs font-bold text-white rounded-xl transition-all hover:bg-white/5"
                  style={{ background: '#131320', border: '1px solid #1e1e32' }}
                >
                  Load More Comments
                </button>
              )}
            </div>
          </article>

          {/* Right Sidebar Column */}
          <div className="space-y-6">
            <div className="sticky top-20 space-y-6">
              {/* Sidebar 300x600 Half Page Ad */}
              <AdBanner size="halfpage" label="Sponsored Story — Premium Space" />

              {/* Dynamic Related Stories */}
              <div className="rounded-xl p-5" style={{ background: '#131320', border: '1px solid #1e1e32' }}>
                <h3 className="font-black text-white text-base mb-4 uppercase tracking-wider" style={{ fontFamily: 'Big Shoulders Display' }}>
                  Related Articles
                </h3>
                <div className="space-y-3">
                  {article.related.map(rel => (
                    <Link
                      key={rel.id}
                      to={`/news/${rel.id}`}
                      className="block p-3 rounded-lg border border-[#1e1e32] transition-colors hover:bg-white/5 group"
                      style={{ background: '#0d0d1e' }}
                    >
                      <span className="text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded-sm text-white mb-1 inline-block" style={{ background: '#00b341' }}>
                        {rel.tag}
                      </span>
                      <p className="text-xs font-bold text-gray-200 group-hover:text-[#00b341] transition-colors line-clamp-2 leading-snug">
                        {rel.title}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
