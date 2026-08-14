import { useState, useMemo, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AdBanner from '../components/AdBanner'
import { getArticle } from '../services/articleStore'
import { saveCommentToDb, fetchAllComments } from '../services/supabaseClient'

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

const ARTICLES_DATABASE: Record<string, ArticleData> = {
  a1: {
    id: 'a1',
    tag: 'MATCH REPORT',
    title: 'Arsenal Dominate Derby to Go 3 Points Clear at the Top of the Premier League',
    subtitle: 'A tactical masterclass at the Emirates saw Saka and Ødegaard dismantle Chelsea in a commanding London derby victory.',
    author: 'James Mwangi',
    authorAvatar: 'JM',
    date: 'Aug 10, 2026',
    readTime: '4 min read',
    image: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=900&h=500&fit=crop&auto=format',
    imageCaption: 'Bukayo Saka celebrates scoring the opening goal in front of the home crowd at the Emirates.',
    likes: 284,
    paragraphs: [
      'Arsenal put on a masterclass at the Emirates on Saturday evening, delivering a dominant 2-1 victory over Chelsea that sent them three points clear at the summit of the Premier League table. In what was a pulsating London derby, the Gunners showcased everything that makes them title contenders — pace, creativity, tactical discipline, and moments of individual brilliance.',
      'Bukayo Saka opened the scoring in the 12th minute with a trademark run into the box, collecting a perfectly weighted through ball from Martin Ødegaard and finishing clinically past a helpless Sánchez. The Emirates erupted, and Arsenal barely looked back.',
      'Chelsea responded gamely, and Cole Palmer drew them level with a stunning long-range effort in the 38th minute that left David Raya rooted to the spot. It was a reminder that Chelsea, for all their inconsistency this season, have a genuine match-winner in Palmer.',
      'But Arsenal, urged on by a thunderous home crowd, regained their lead nine minutes after half-time. Kai Havertz, so often the subject of debate after his expensive arrival from Stamford Bridge, delivered the most emphatic of answers — powering home a near-post header from Martinelli’s whipped cross.',
      'The final 30 minutes saw Arsenal manage the game intelligently, pressing when needed and soaking up Chelsea pressure with an assured defensive performance led by the imperious William Saliba. Manager Mikel Arteta will be delighted, not just with the result, but with the manner of the performance — clinical in attack and resolute in defence.'
    ],
    related: [
      { id: 'a2', title: 'Here We Go: Chelsea Complete £80m Signing from Bundesliga', tag: 'TRANSFERS' },
      { id: 'a3', title: "Why Pep's High Press Is Struggling Against Low Blocks", tag: 'ANALYSIS' },
      { id: 'a6', title: 'UCL Quarter-Finals Preview: Tactical Battles & Key Player Head-to-Heads', tag: 'CHAMPIONS LEAGUE' },
    ]
  },
  a2: {
    id: 'a2',
    tag: 'TRANSFERS',
    title: 'Here We Go: Chelsea Complete £80m Signing of Bundesliga Midfield Prodigy',
    subtitle: 'The Blues have agreed personal terms and passed medicals ahead of the transfer window deadline.',
    author: 'Sarah Okonkwo',
    authorAvatar: 'SO',
    date: 'Aug 10, 2026',
    readTime: '3 min read',
    image: 'https://images.unsplash.com/photo-1589487391730-58f20eb2c308?w=900&h=500&fit=crop&auto=format',
    imageCaption: 'The 21-year-old playmaker completes medical checks ahead of signing a long-term deal.',
    likes: 192,
    paragraphs: [
      'Chelsea have officially completed the £80m transfer of Bundesliga midfield sensation Florian Wirtz, beating competition from Real Madrid and Bayern Munich to secure one of Europe’s most coveted talents.',
      'The 21-year-old German international completed his medical examination in London earlier today before putting pen to paper on a long-term six-year contract at Stamford Bridge.',
      'Known for his exquisite vision, dribbling in tight spaces, and goal-scoring threat from deep, Wirtz is expected to immediately step into Chelsea’s starting XI under Mauricio Pochettino.',
      '“Joining Chelsea is a dream step for my career,” Wirtz said in his first interview. “The vision presented to me by the club and the project here is something I could not turn down. I can’t wait to play at Stamford Bridge.”'
    ],
    related: [
      { id: 'a1', title: 'Arsenal Dominate Derby to Go 3 Points Clear at the Top', tag: 'MATCH REPORT' },
      { id: 'a7', title: "Exclusive: Thomas Tuchel Outlines England's Tactical Vision", tag: 'INTERVIEW' },
      { id: 'a3', title: "Why Pep's High Press Is Struggling Against Low Blocks", tag: 'ANALYSIS' },
    ]
  },
  a3: {
    id: 'a3',
    tag: 'ANALYSIS',
    title: "Tactical Breakdown: Why Pep's High Press Is Struggling Against Low Blocks",
    subtitle: 'An in-depth statistical analysis revealing how deep-defending teams are exploiting space behind Manchester City full-backs.',
    author: 'David Kamau',
    authorAvatar: 'DK',
    date: 'Aug 10, 2026',
    readTime: '6 min read',
    image: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=900&h=500&fit=crop&auto=format',
    imageCaption: 'Tactical positioning overlay showing City’s rest defence against counter-attacking opponents.',
    likes: 156,
    paragraphs: [
      'Manchester City’s relentless dominance over the last five seasons was built on positional play and a choking high counter-press. However, recent fixtures have exposed an emerging vulnerability when facing disciplined, low-block defensive setups.',
      'Opponents have surrendered possession willingly (averaging less than 32% ball possession), prioritizing central compactness and overloading channels to cut off passes into Erling Haaland.',
      'When City commit full-backs into inverted midfield positions, turnover transitions leave huge expanses of grass on the flanks. Direct long balls aimed at pacey wingers have yielded an unprecedented number of high-xG counter-attack opportunities against Ederson.',
      'Pep Guardiola will need to refine City’s rest defence structure before the upcoming Champions League knockout stage if they are to retain their European crown.'
    ],
    related: [
      { id: 'a1', title: 'Arsenal Dominate Derby to Go 3 Points Clear at the Top', tag: 'MATCH REPORT' },
      { id: 'a6', title: 'UCL Quarter-Finals Preview: Tactical Battles & Key Player Head-to-Heads', tag: 'CHAMPIONS LEAGUE' },
      { id: 'a5', title: 'Rashford Reborn: Why The Winger Looks Like a World-Class Threat', tag: 'OPINION' },
    ]
  },
  a4: {
    id: 'a4',
    tag: 'AFCON',
    title: 'Harambee Stars Name Strong 26-Man Squad for AFCON Group Stage Battles',
    subtitle: 'Coach Engin Firat names a powerhouse squad featuring European-based stars as Kenya prepares for crucial opening fixtures.',
    author: 'Peter Otieno',
    authorAvatar: 'PO',
    date: 'Aug 10, 2026',
    readTime: '5 min read',
    image: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=900&h=500&fit=crop&auto=format',
    imageCaption: 'Harambee Stars players celebrate during intense training sessions in Nairobi.',
    likes: 311,
    paragraphs: [
      'Kenya national team coach Engin Firat has officially announced the final 26-man Harambee Stars squad set to represent the nation at the Africa Cup of Nations.',
      'The squad features a potent mix of seasoned international veterans and explosive young domestic talent. Leading the line is striker Michael Olunga alongside fast-rising European stars.',
      'Group stage opponents present a formidable test, but confidence in camp is at an all-time high following an unbeaten six-match warm-up run.',
      '“We are going into this tournament not just to participate, but to make our nation proud and fight for a place in the knockout stages,” stated captain Michael Olunga.'
    ],
    related: [
      { id: 'a8', title: 'Tanzania Champions Sign Star Egyptian Playmaker in Record Deal', tag: 'EAST AFRICA' },
      { id: 'a1', title: 'Arsenal Dominate Derby to Go 3 Points Clear at the Top', tag: 'MATCH REPORT' },
      { id: 'a7', title: "Exclusive: Thomas Tuchel Outlines England's Tactical Vision", tag: 'INTERVIEW' },
    ]
  },
  a5: {
    id: 'a5',
    tag: 'OPINION',
    title: 'Rashford Reborn: Why The Winger Looks Like a World-Class Threat Again',
    subtitle: 'Restored confidence and tactical freedom under new management have unleashed Marcus Rashford’s best football in years.',
    author: 'Janet Wanjiku',
    authorAvatar: 'JW',
    date: 'Aug 09, 2026',
    readTime: '4 min read',
    image: 'https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?w=900&h=500&fit=crop&auto=format',
    imageCaption: 'Rashford in full stride during Manchester United’s recent league victory.',
    likes: 98,
    paragraphs: [
      'Football is a game of confidence, and few players demonstrate that truth as vividly as Marcus Rashford.',
      'After a frustrating period plagued by injuries and tactical instability, Rashford has rediscovered the explosive speed, direct dribbling, and deadly finishing that made him one of world football’s premier wide threats.',
      'Systematic freedom on the left wing has allowed him to isolate defenders one-on-one, generating double-digit goals and assists already this season.',
      'If Manchester United are to secure top-four football and silverware this term, maintaining Rashford’s peak form will be paramount.'
    ],
    related: [
      { id: 'a2', title: 'Here We Go: Chelsea Complete £80m Signing from Bundesliga', tag: 'TRANSFERS' },
      { id: 'a3', title: "Why Pep's High Press Is Struggling Against Low Blocks", tag: 'ANALYSIS' },
      { id: 'a1', title: 'Arsenal Dominate Derby to Go 3 Points Clear at the Top', tag: 'MATCH REPORT' },
    ]
  },
  a6: {
    id: 'a6',
    tag: 'CHAMPIONS LEAGUE',
    title: 'UCL Quarter-Finals Preview: Tactical Battles & Key Player Head-to-Heads',
    subtitle: 'Everything you need to know ahead of European football’s most anticipated heavyweight clashes this week.',
    author: 'John Njoroge',
    authorAvatar: 'JN',
    date: 'Aug 09, 2026',
    readTime: '5 min read',
    image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=900&h=500&fit=crop&auto=format',
    imageCaption: 'The Champions League trophy under the lights ahead of knockout football.',
    likes: 204,
    paragraphs: [
      'The UEFA Champions League returns this week with four breathtaking quarter-final match-ups that promise high drama and elite tactical duels.',
      'Real Madrid host Bayern Munich in a classic European classic, while Arsenal welcome Paris Saint-Germain to London in a high-octane battle of pressing intensity.',
      'Key tactical battles will hinge on midfield control, transitional speed, and how effectively defenders deal with world-class individual forwards.',
      'Our team of analysts breakdown every fixture, probable lineups, and key head-to-head battles to watch out for.'
    ],
    related: [
      { id: 'a3', title: "Why Pep's High Press Is Struggling Against Low Blocks", tag: 'ANALYSIS' },
      { id: 'a1', title: 'Arsenal Dominate Derby to Go 3 Points Clear at the Top', tag: 'MATCH REPORT' },
      { id: 'a4', title: 'Harambee Stars Name Strong 26-Man Squad for AFCON', tag: 'AFCON' },
    ]
  },
  a7: {
    id: 'a7',
    tag: 'INTERVIEW',
    title: "Exclusive: Thomas Tuchel Outlines England's Tactical Vision for World Cup",
    subtitle: 'The Three Lions manager opens up about squad selection, tactical adaptability, and building a winning culture.',
    author: 'Emma Kariuki',
    authorAvatar: 'EK',
    date: 'Aug 08, 2026',
    readTime: '7 min read',
    image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=900&h=500&fit=crop&auto=format',
    imageCaption: 'Thomas Tuchel addressing media representatives at Wembley Stadium.',
    likes: 445,
    paragraphs: [
      'In an exclusive sit-down interview, England manager Thomas Tuchel laid out his comprehensive strategic vision as tournament preparation intensifies.',
      'Tuchel emphasized fluid positional rotation, high physical intensity, and fostering an environment where young talents feel empowered to express themselves.',
      '“England possesses incredible technical depth across every position,” Tuchel said. “Our challenge is creating tactical clarity so the players can execute instinctively on the biggest stage.”',
      'The manager also addressed squad selection dilemmas, squad discipline, and managing external expectations heading into tournament football.'
    ],
    related: [
      { id: 'a1', title: 'Arsenal Dominate Derby to Go 3 Points Clear at the Top', tag: 'MATCH REPORT' },
      { id: 'a2', title: 'Here We Go: Chelsea Complete £80m Signing from Bundesliga', tag: 'TRANSFERS' },
      { id: 'a4', title: 'Harambee Stars Name Strong 26-Man Squad for AFCON', tag: 'AFCON' },
    ]
  },
  a8: {
    id: 'a8',
    tag: 'EAST AFRICA',
    title: 'Tanzania Champions Sign Star Egyptian Playmaker in Record-Breaking Deal',
    subtitle: 'Simba SC send shockwaves through East African football by securing the signature of Cairo’s top midfielder.',
    author: 'Moses Achieng',
    authorAvatar: 'MA',
    date: 'Aug 08, 2026',
    readTime: '3 min read',
    image: 'https://images.unsplash.com/photo-1624880357913-a8539238245b?w=900&h=500&fit=crop&auto=format',
    imageCaption: 'Fans assemble at Dar es Salaam airport to welcome the record signing.',
    likes: 287,
    paragraphs: [
      'Simba SC have completed a historic transfer, signing Egyptian international playmaker Ahmed Sayed "Zizo" from Zamalek in a landmark regional deal.',
      'The transfer signals the growing financial muscle and ambition of East African clubs competing in the CAF Champions League.',
      'Thousands of passionate supporters gathered in Dar es Salaam to welcome the 28-year-old maestro ahead of his official unveiling.',
      'Zizo is expected to make his debut in the upcoming derby fixture this weekend.'
    ],
    related: [
      { id: 'a4', title: 'Harambee Stars Name Strong 26-Man Squad for AFCON', tag: 'AFCON' },
      { id: 'a2', title: 'Here We Go: Chelsea Complete £80m Signing from Bundesliga', tag: 'TRANSFERS' },
      { id: 'a1', title: 'Arsenal Dominate Derby to Go 3 Points Clear at the Top', tag: 'MATCH REPORT' },
    ]
  }
}

const INITIAL_COMMENTS: CommentItem[] = [
  {
    id: 'c1',
    author: 'GunnerFan254',
    avatar: '⚽',
    text: 'What a performance! Saka and Ødegaard were absolutely unreal tonight.',
    likes: 24,
    time: '1h ago',
    replies: [
      { id: 'r1', author: 'ChelseaBlue', avatar: '🔵', text: 'Fair play, Saka is world class.', likes: 5, time: '45min ago' },
    ]
  },
  {
    id: 'c2',
    author: 'NairobiGooner',
    avatar: '🦁',
    text: 'Havertz has really settled in. What a header for the winning goal!',
    likes: 18,
    time: '2h ago',
    replies: []
  },
  {
    id: 'c3',
    author: 'EPLWatcher',
    avatar: '👀',
    text: 'Chelsea were poor in that second half. Lack of creativity without Palmer pulling strings.',
    likes: 11,
    time: '3h ago',
    replies: []
  },
]

const EXTRA_COMMENTS: CommentItem[] = [
  {
    id: 'c4',
    author: 'TacticalMind',
    avatar: '🧠',
    text: 'Saliba and Gabriel’s partnership is the best in Europe right now. Barely gave them a sniff in the 2nd half.',
    likes: 15,
    time: '4h ago',
    replies: []
  },
  {
    id: 'c5',
    author: 'KPL_Supporter',
    avatar: '🇰🇪',
    text: 'Great coverage as always! FlowerZFC bringing top quality football news.',
    likes: 32,
    time: '5h ago',
    replies: []
  },
  {
    id: 'c6',
    author: 'DerbyKing',
    avatar: '👑',
    text: 'The title race is going to go down to the wire. What a season we have on our hands.',
    likes: 9,
    time: '6h ago',
    replies: []
  }
]

export default function Article() {
  const { id = 'a1' } = useParams<{ id: string }>()
  const { t, user } = useApp()
  const navigate = useNavigate()

  // Get current article — check admin store first, then hardcoded DB
  const article = useMemo((): ArticleData => {
    const stored = getArticle(id)
    if (stored) {
      // Convert StoredArticle → ArticleData
      const wordCount = stored.body.split(/\s+/).filter(Boolean).length
      const readMin = Math.max(1, Math.round(wordCount / 200))
      return {
        id:           stored.id,
        tag:          stored.category.toUpperCase(),
        title:        stored.title,
        subtitle:     stored.metaDescription || undefined,
        author:       stored.author || 'FlowerZFC Staff',
        authorAvatar: (stored.author || 'F').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
        date:         stored.date,
        readTime:     `${readMin} min read`,
        image:        stored.imageUrl || 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=900&h=500&fit=crop&auto=format',
        imageCaption: stored.tags ? `Tags: ${stored.tags}` : undefined,
        likes:        stored.likes ?? 0,
        paragraphs:   stored.body ? stored.body.split('\n\n').filter(Boolean) : ['Content coming soon.'],
        related:      [],
      }
    }
    return ARTICLES_DATABASE[id] || ARTICLES_DATABASE['a1']
  }, [id])

  // Interactive states
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(article.likes)
  const [saved, setSaved] = useState(false)
  const [commentInput, setCommentInput] = useState('')
  const [commentList, setCommentList] = useState<CommentItem[]>(INITIAL_COMMENTS)
  const [hasLoadedMore, setHasLoadedMore] = useState(false)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)
  const [commentLikes, setCommentLikes] = useState<Record<string, number>>({})

  // Update like count & reset states when article route parameter changes
  useEffect(() => {
    setLiked(false)
    setLikeCount(article.likes)
    setSaved(false)
    setHasLoadedMore(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    // Load real comments from Supabase, fallback to INITIAL_COMMENTS
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
        setCommentList(INITIAL_COMMENTS)
      }
    }).catch(() => setCommentList(INITIAL_COMMENTS))
  }, [article, id])

  const toggleLike = () => {
    if (liked) {
      setLiked(false)
      setLikeCount(prev => prev - 1)
    } else {
      setLiked(true)
      setLikeCount(prev => prev + 1)
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
    if (!hasLoadedMore) {
      setCommentList(prev => [...prev, ...EXTRA_COMMENTS])
      setHasLoadedMore(true)
    }
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
              {!hasLoadedMore ? (
                <button
                  onClick={handleLoadMoreComments}
                  className="mt-6 w-full py-3 text-xs font-bold text-white rounded-xl transition-all hover:bg-white/5"
                  style={{ background: '#131320', border: '1px solid #1e1e32' }}
                >
                  Load More Comments ({EXTRA_COMMENTS.length} more)
                </button>
              ) : (
                <p className="mt-6 text-center text-xs text-gray-500">All comments loaded.</p>
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
