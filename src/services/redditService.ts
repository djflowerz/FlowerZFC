// ─── Reddit Service ────────────────────────────────────────────────────────────
// No Reddit API credentials required.
// Uses Reddit's native deep-link submit URLs to open a pre-filled submission
// form in the user's browser. Tracks posted articles in Supabase.

import { supabase } from './supabaseClient'

// ─── Football Subreddits ──────────────────────────────────────────────────────
export interface FootballSubreddit {
  name: string          // e.g. "soccer"
  display: string       // e.g. "r/soccer"
  description: string
  tags: string[]        // article category tags that fit here
  subscribers: string   // approx subscriber count label
  flag: string
  rules?: string        // posting rules hint
}

export const DISCOVERABLE_SUBREDDITS: FootballSubreddit[] = [
  // Global & General
  { name: 'soccer',           display: 'r/soccer',           subscribers: '5.2M',  flag: '⚽', description: 'World football news, highlights & goals',       tags: ['Football', 'Latest News', 'Transfers'] },
  { name: 'football',         display: 'r/football',         subscribers: '950K',  flag: '🌍', description: 'Global football discussion and news',          tags: ['Football', 'Latest News'] },
  { name: 'dailyfootball',    display: 'r/dailyfootball',    subscribers: '65K',   flag: '📰', description: 'Daily football news & analysis',                tags: ['Latest News', 'Daily News Roundups'] },
  { name: 'footballtactics',  display: 'r/footballtactics',  subscribers: '140K',  flag: '🧠', description: 'Tactical analysis, formations & breakdown',     tags: ['Predictions', 'Football'] },
  
  // European Competitions
  { name: 'championsleague',  display: 'r/championsleague',  subscribers: '650K',  flag: '🏆', description: 'UEFA Champions League discussion & news',       tags: ['Champions League'] },
  { name: 'EuropaLeague',     display: 'r/EuropaLeague',     subscribers: '220K',  flag: '🟠', description: 'UEFA Europa & Conference League',               tags: ['Europa League'] },

  // Premier League & Clubs
  { name: 'PremierLeague',    display: 'r/PremierLeague',    subscribers: '1.3M',  flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', description: 'English Premier League news & discussions',    tags: ['Premier League'] },
  { name: 'Arsenal',          display: 'r/Arsenal',          subscribers: '780K',  flag: '🔴', description: 'Arsenal FC Gunners community',                  tags: ['Premier League'] },
  { name: 'LiverpoolFC',      display: 'r/LiverpoolFC',      subscribers: '890K',  flag: '🔴', description: 'Liverpool FC The Reds',                         tags: ['Premier League'] },
  { name: 'chelseafc',        display: 'r/chelseafc',        subscribers: '520K',  flag: '🔵', description: 'Chelsea FC Blues',                              tags: ['Premier League'] },
  { name: 'ManchesterUnited', display: 'r/ManchesterUnited', subscribers: '750K',  flag: '🔴', description: 'Manchester United Red Devils',                  tags: ['Premier League'] },
  { name: 'reddevils',        display: 'r/reddevils',        subscribers: '620K',  flag: '👹', description: 'Manchester United fan community',               tags: ['Premier League'] },
  { name: 'MCFC',             display: 'r/MCFC',             subscribers: '420K',  flag: '🔵', description: 'Manchester City Citizens',                      tags: ['Premier League'] },
  { name: 'Tottenham',        display: 'r/Tottenham',        subscribers: '320K',  flag: '⚪', description: 'Tottenham Hotspur Spurs',                       tags: ['Premier League'] },
  { name: 'coys',             display: 'r/coys',             subscribers: '210K',  flag: '🐓', description: 'Tottenham Hotspur COYS',                        tags: ['Premier League'] },
  { name: 'nufc',             display: 'r/nufc',             subscribers: '180K',  flag: '⚪', description: 'Newcastle United Magpies',                      tags: ['Premier League'] },
  { name: 'Everton',          display: 'r/Everton',          subscribers: '110K',  flag: '🔵', description: 'Everton FC Toffees',                            tags: ['Premier League'] },
  { name: 'avfc',             display: 'r/avfc',             subscribers: '90K',   flag: '🟣', description: 'Aston Villa FC',                                tags: ['Premier League'] },
  { name: 'Championship',     display: 'r/Championship',     subscribers: '160K',  flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', description: 'EFL Championship football',                   tags: ['Football'] },

  // Spanish La Liga & Clubs
  { name: 'LaLiga',           display: 'r/LaLiga',           subscribers: '380K',  flag: '🇪🇸', description: 'Spanish La Liga football & news',               tags: ['La Liga'] },
  { name: 'realmadrid',       display: 'r/realmadrid',       subscribers: '450K',  flag: '👑', description: 'Real Madrid CF Los Blancos',                    tags: ['La Liga', 'Champions League'] },
  { name: 'Barca',            display: 'r/Barca',            subscribers: '390K',  flag: '🔵', description: 'FC Barcelona Blaugrana',                        tags: ['La Liga', 'Champions League'] },
  { name: 'atletico',         display: 'r/atletico',         subscribers: '70K',   flag: '🔴', description: 'Atletico Madrid Colchoneros',                   tags: ['La Liga'] },

  // German Bundesliga & Clubs
  { name: 'Bundesliga',       display: 'r/Bundesliga',       subscribers: '340K',  flag: '🇩🇪', description: 'German Bundesliga football',                    tags: ['Bundesliga'] },
  { name: 'fcbayern',         display: 'r/fcbayern',         subscribers: '260K',  flag: '🔴', description: 'FC Bayern Munich Die Roten',                    tags: ['Bundesliga', 'Champions League'] },
  { name: 'borussiadortmund', display: 'r/borussiadortmund', subscribers: '180K',  flag: '🟡', description: 'Borussia Dortmund BVB 09',                      tags: ['Bundesliga'] },
  { name: 'bayer04',          display: 'r/bayer04',          subscribers: '55K',   flag: '🔴', description: 'Bayer 04 Leverkusen Werkself',                  tags: ['Bundesliga'] },

  // Italian Serie A & Clubs
  { name: 'seriea',           display: 'r/seriea',           subscribers: '240K',  flag: '🇮🇹', description: 'Italian Serie A Calcio',                        tags: ['Serie A'] },
  { name: 'Juve',             display: 'r/Juve',             subscribers: '190K',  flag: '🦓', description: 'Juventus FC Bianconeri',                        tags: ['Serie A'] },
  { name: 'FCInterMilan',     display: 'r/FCInterMilan',     subscribers: '140K',  flag: '🔵', description: 'Inter Milan Nerazzurri',                        tags: ['Serie A'] },
  { name: 'ACMilan',          display: 'r/ACMilan',          subscribers: '160K',  flag: '🔴', description: 'AC Milan Rossoneri',                            tags: ['Serie A'] },
  { name: 'sscnapoli',        display: 'r/sscnapoli',        subscribers: '65K',   flag: '🔵', description: 'SSC Napoli Partenopei',                         tags: ['Serie A'] },
  { name: 'ASRoma',           display: 'r/ASRoma',           subscribers: '75K',   flag: '🟡', description: 'AS Roma Giallorossi',                           tags: ['Serie A'] },

  // French Ligue 1 & Other Leagues
  { name: 'Ligue1',           display: 'r/Ligue1',           subscribers: '130K',  flag: '🇫🇷', description: 'French Ligue 1 McDonald’s',                     tags: ['Ligue 1'] },
  { name: 'psg',              display: 'r/psg',              subscribers: '190K',  flag: '🔴', description: 'Paris Saint-Germain PSG',                       tags: ['Ligue 1', 'Champions League'] },
  { name: 'superlig',         display: 'r/superlig',         subscribers: '110K',  flag: '🇹🇷', description: 'Turkish Super Lig football',                    tags: ['Football'] },
  { name: 'ScottishFootball', display: 'r/ScottishFootball', subscribers: '140K',  flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', description: 'Scottish Premiership & SPFL',                 tags: ['Football'] },
  { name: 'MLS',              display: 'r/MLS',              subscribers: '580K',  flag: '🇺🇸', description: 'Major League Soccer USA & Canada',              tags: ['Football'] },
  { name: 'ussoccer',         display: 'r/ussoccer',         subscribers: '290K',  flag: '🇺🇸', description: 'US National Soccer Teams',                      tags: ['Football'] },
  { name: 'Kenya',            display: 'r/Kenya',            subscribers: '140K',  flag: '🇰🇪', description: 'Kenya — local sport & football news',           tags: ['Football', 'Latest News'] },
  { name: 'test',             display: 'r/test',             subscribers: '∞',     flag: '🧪', description: 'Reddit testing sandbox',                        tags: [] },
]

export const FOOTBALL_SUBREDDITS: FootballSubreddit[] = DISCOVERABLE_SUBREDDITS.slice(0, 18)

// ─── Custom Subreddit Persistence ─────────────────────────────────────────────
const CUSTOM_SUBS_KEY = 'flowerzfc_custom_subreddits'

export function getCustomSubreddits(): FootballSubreddit[] {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_SUBS_KEY) || '[]')
  } catch { return [] }
}

export function saveCustomSubreddit(sub: FootballSubreddit): void {
  const current = getCustomSubreddits()
  const exists = current.some(s => s.name.toLowerCase() === sub.name.toLowerCase())
  if (!exists) {
    const updated = [sub, ...current]
    localStorage.setItem(CUSTOM_SUBS_KEY, JSON.stringify(updated))
  }
}

export function removeCustomSubreddit(name: string): void {
  const current = getCustomSubreddits()
  const filtered = current.filter(s => s.name.toLowerCase() !== name.toLowerCase())
  localStorage.setItem(CUSTOM_SUBS_KEY, JSON.stringify(filtered))
}

export function getAllAvailableSubreddits(): FootballSubreddit[] {
  const custom = getCustomSubreddits()
  const defaultSubs = DISCOVERABLE_SUBREDDITS
  const customNames = new Set(custom.map(s => s.name.toLowerCase()))
  return [...custom, ...defaultSubs.filter(s => !customNames.has(s.name.toLowerCase()))]
}

// ─── Curated Top 3 Articles Per Subreddit Algorithm ────────────────────────────
// Scores articles based on keyword & category relevance for the target subreddit
export function getCuratedTopArticlesForSubreddit(articles: any[], subredditName: string): any[] {
  if (!Array.isArray(articles) || articles.length === 0) return []

  const sub = subredditName.toLowerCase().replace(/^r\//, '').trim()

  const subKeywords: Record<string, string[]> = {
    soccer: ['football', 'goal', 'champions', 'transfer', 'cup', 'league', 'penalty', 'manager', 'referee', 'star', 'deal'],
    premierleague: ['premier league', 'pl', 'arsenal', 'chelsea', 'liverpool', 'man city', 'manchester', 'tottenham', 'newcastle', 'aston villa', 'everton', 'west ham'],
    championsleague: ['champions league', 'ucl', 'uefa', 'madrid', 'bayern', 'barcelona', 'psg', 'inter', 'milan', 'knockout'],
    laliga: ['la liga', 'real madrid', 'barcelona', 'atletico', 'valencia', 'sevilla', 'vinicius', 'bellingham', 'yamal', 'lewandowski', 'mbappe'],
    bundesliga: ['bundesliga', 'bayern', 'dortmund', 'leverkusen', 'kane', 'leipzig', 'stuttgart', 'musiala', 'alonso'],
    seriea: ['serie a', 'juventus', 'inter', 'milan', 'napoli', 'roma', 'lazio', 'atalanta', 'fiorentina'],
    ligue1: ['ligue 1', 'psg', 'paris', 'marseille', 'monaco', 'lyon', 'lille', 'dembele'],
    europaleague: ['europa league', 'uel', 'conference league', 'uefa'],
    arsenal: ['arsenal', 'arteta', 'saka', 'odegaard', 'rice', 'gunners', 'saliba', 'havertz', 'timber'],
    liverpoolfc: ['liverpool', 'slot', 'salah', 'anfield', 'van dijk', 'alexander-arnold', 'diaz', 'szoboszlai', 'mac allister'],
    chelseafc: ['chelsea', 'maresca', 'palmer', 'stamford bridge', 'caicedo', 'enzo', 'jackson', 'madueke'],
    manchesterunited: ['manchester united', 'man utd', 'amorim', 'ten hag', 'rashford', 'fernandes', 'old trafford', 'garnacho', 'mainoo', 'yoro'],
    reddevils: ['manchester united', 'man utd', 'amorim', 'ten hag', 'rashford', 'fernandes', 'old trafford', 'garnacho', 'mainoo'],
    mcfc: ['man city', 'manchester city', 'guardiola', 'haaland', 'de bruyne', 'foden', 'etihad', 'rodri', 'ndiaye', 'grealish'],
    tottenham: ['tottenham', 'spurs', 'postecoglou', 'son', 'maddison', 'kulusevski', 'solanke', 'van de ven'],
    coys: ['tottenham', 'spurs', 'postecoglou', 'son', 'maddison', 'kulusevski', 'solanke'],
    nufc: ['newcastle', 'howe', 'isay', 'guimaraes', 'gordon', 'st james', 'jaissle', 'tonali', 'livramento'],
    everton: ['everton', 'goodison', 'dyche', 'ndiaye', 'calvert-lewin', 'pickford', 'bramley'],
    realmadrid: ['real madrid', 'madrid', 'ancelotti', 'mbappe', 'vinicius', 'bellingham', 'bernabeu', 'rodrygo', 'valverde'],
    barca: ['barcelona', 'barca', 'flick', 'yamal', 'lewandowski', 'pedri', 'gavi', 'camp nou', 'raphinha'],
    fcbayern: ['bayern', 'kompany', 'kane', 'musiala', 'muller', 'allianz', 'neuer', 'kimmich'],
    borussiadortmund: ['dortmund', 'bvb', 'sahis', 'gittens', 'guirassy', 'adeyemi', 'signal iduna'],
    juve: ['juventus', 'juve', 'motta', 'vlahovic', 'koopmeiners', 'yildiz', 'allianz stadium'],
    fcintermilan: ['inter', 'inter milan', 'inzaghi', 'lautaro', 'thuram', 'barella', 'san siro'],
    acmilan: ['ac milan', 'milan', 'fonseca', 'leao', 'pulisic', 'theo', 'morata'],
    psg: ['psg', 'paris', 'enrique', 'dembele', 'barcola', 'vitinha', 'parc des princes'],
  }

  const keywords = subKeywords[sub] || [sub]

  // Score each article
  const scored = articles.map(art => {
    const title = (art.title || '').toLowerCase()
    const cat = (art.category || '').toLowerCase()
    const body = ((art as any).body || (art as any).summary || '').toLowerCase()

    let score = 0
    keywords.forEach(kw => {
      if (title.includes(kw)) score += 15
      if (cat.includes(kw)) score += 8
      if (body.includes(kw)) score += 3
    })

    return { article: art, score }
  })

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score)

  const topMatches = scored.filter(s => s.score > 0).map(s => s.article)
  const result: any[] = [...topMatches.slice(0, 3)]

  // If fewer than 3 scored matches, backfill with most recent articles
  if (result.length < 3) {
    const existingIds = new Set(result.map(a => a.id))
    for (const art of articles) {
      if (!existingIds.has(art.id)) {
        result.push(art)
        if (result.length === 3) break
      }
    }
  }

  return result.slice(0, 3)
}

// ─── Reddit Post Record ───────────────────────────────────────────────────────
export interface RedditPost {
  id: string
  article_id: string
  article_title: string
  article_url: string
  subreddit: string
  custom_title: string | null
  flair: string | null
  status: 'pending' | 'posted' | 'failed' | 'scheduled'
  reddit_permalink: string | null
  error_message: string | null
  schedule_at: string | null
  posted_at: string | null
  created_at: string
}

// ─── Auto-Rule ────────────────────────────────────────────────────────────────
export interface RedditAutoRule {
  id: string
  articleTagPattern: string    // e.g. "Premier League"
  subreddit: string            // e.g. "PremierLeague"
  titleTemplate: string        // e.g. "📰 {title} | FlowerZFC"
  enabled: boolean
}

const RULES_KEY = 'flowerzfc_reddit_rules'
const JOINED_KEY = 'flowerzfc_reddit_joined'

export function getAutoRules(): RedditAutoRule[] {
  try {
    return JSON.parse(localStorage.getItem(RULES_KEY) || '[]')
  } catch { return [] }
}

export function saveAutoRules(rules: RedditAutoRule[]): void {
  localStorage.setItem(RULES_KEY, JSON.stringify(rules))
}

export function getJoinedSubreddits(): string[] {
  try {
    return JSON.parse(localStorage.getItem(JOINED_KEY) || '[]')
  } catch { return [] }
}

export function markSubredditJoined(name: string): void {
  const current = getJoinedSubreddits()
  if (!current.includes(name)) {
    localStorage.setItem(JOINED_KEY, JSON.stringify([...current, name]))
  }
}

// ─── Clean SEO Article Slug Generator ─────────────────────────────────────────
// Generates human-readable, professional URL slugs from article titles:
// e.g. "Man City join Liverpool in race..." -> "man-city-join-liverpool-in-race"
export function generateArticleSlug(title: string, fallbackId?: string): string {
  if (!title || typeof title !== 'string') {
    return fallbackId ? String(fallbackId).replace(/[^a-z0-9]/gi, '-').toLowerCase() : 'football-news'
  }
  const clean = title
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9\s-]/g, '')                     // strip punctuation
    .trim()
    .replace(/\s+/g, '-')                             // spaces to dashes
    .replace(/-+/g, '-')                             // collapse multiple dashes
    .slice(0, 80)                                    // limit length
    .replace(/-$/, '')                               // trim trailing dash

  return clean || (fallbackId ? String(fallbackId).replace(/[^a-z0-9]/gi, '-').toLowerCase() : 'football-news')
}

// ─── Catchy Reddit Body Text Generator ────────────────────────────────────────
// Generates natural, human-written text for Reddit with zero spam triggers
export function generateRedditCatchyBody(opts: {
  title: string
  category?: string
  summary?: string
  articleUrl?: string
  subreddit?: string
  preset?: 'analysis' | 'fan' | 'debate' | 'clean' | 'natural' | 'quote' | 'short'
  includeLink?: boolean
}): string {
  const { title, summary = '', articleUrl = '', subreddit = '', preset = 'natural', includeLink = false } = opts
  const sub = subreddit.toLowerCase().replace(/^r\//, '').trim()
  const cleanSummary = summary.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  const excerpt = cleanSummary.length > 30 ? cleanSummary : `${title}. Key developments and talking points following the latest announcements.`

  const isTacticsSub = ['footballtactics', 'tactics', 'bootroom', 'football'].includes(sub)
  const isClubSub = ['liverpoolfc', 'gunners', 'arsenal', 'reddevils', 'manchesterunited', 'chelseafc', 'mcfc', 'coys', 'tottenham', 'nufc', 'everton', 'realmadrid', 'barca', 'fcbayern', 'juve', 'acmilan', 'fcintermilan', 'psg'].includes(sub)

  let paragraphs: string[] = []

  if (preset === 'analysis' || (preset === 'natural' && isTacticsSub)) {
    // In-depth tactical questions to pass r/footballtactics and r/football moderation rules
    paragraphs = [
      excerpt.slice(0, 320) + (excerpt.length > 320 ? '...' : ''),
      '',
      `From a tactical standpoint: How do you see this impacting the team's spacing, transition phases, and pressing structure over 90 minutes? Does this tactical shift make sense against teams playing a low block?`,
    ]
  } else if (preset === 'fan' || (preset === 'natural' && isClubSub)) {
    // Authentic club supporter perspective (no corporate voice)
    paragraphs = [
      excerpt.slice(0, 280) + (excerpt.length > 280 ? '...' : ''),
      '',
      `Curious to hear how other fans are viewing this. Given our current squad depth and upcoming fixtures, does this change how we should set up our starting XI?`,
    ]
  } else if (preset === 'debate') {
    // Balanced debate angle for general football subreddits
    paragraphs = [
      excerpt.slice(0, 280) + (excerpt.length > 280 ? '...' : ''),
      '',
      `What's your take on how this situation is being handled? Is this the right move in the long run or are expectations unrealistic?`,
    ]
  } else if (preset === 'clean' || preset === 'short') {
    // Pure concise summary with 0 fluff (100% immune to automod rules)
    paragraphs = [
      excerpt.slice(0, 300) + (excerpt.length > 300 ? '...' : ''),
    ]
  } else if (preset === 'quote') {
    paragraphs = [
      `"${excerpt.slice(0, 260)}..."`,
      '',
      `How do you evaluate this move considering the current phase of the season?`,
    ]
  } else {
    // Standard natural discussion prompt
    paragraphs = [
      excerpt.slice(0, 280) + (excerpt.length > 280 ? '...' : ''),
      '',
      `How do you see this playing out over the coming weeks?`,
    ]
  }

  // Only append link if explicitly requested (Reddit link posts already link to the site in the post header)
  if (includeLink && articleUrl) {
    const cleanUrl = articleUrl.split('?')[0]
    paragraphs.push('', `Source: ${cleanUrl}`)
  }

  return paragraphs.join('\n')
}

// ─── Deep-link builder ───────────────────────────────────────────────────────
// Opens Reddit's native submit page — NO API REQUIRED.
// Reddit pre-fills the URL, title, and body text from the query string.
export function buildRedditSubmitUrl(opts: {
  subreddit: string
  articleUrl: string
  title: string
  bodyText?: string
  flair?: string
  type?: 'link' | 'text'
}): string {
  // Always sanitize URL to remove client-side hash fragments (which break Reddit scraper)
  let cleanUrl = opts.articleUrl.replace('/#/', '/')
  if (!cleanUrl.startsWith('http')) {
    cleanUrl = `https://djflowerz.co.ke${cleanUrl.startsWith('/') ? cleanUrl : '/' + cleanUrl}`
  }

  const base = `https://www.reddit.com/r/${opts.subreddit}/submit`
  const params = new URLSearchParams({
    url: cleanUrl,
    title: opts.title,
    type: opts.type || 'link',
  })
  if (opts.bodyText && opts.bodyText.trim()) {
    params.set('text', opts.bodyText.trim())
  }
  if (opts.flair && opts.flair.trim()) {
    params.set('flair', opts.flair.trim())
    params.set('flair_name', opts.flair.trim())
    params.set('flair_text', opts.flair.trim())
  }
  return `${base}?${params.toString()}`
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────
export async function getRedditPosts(): Promise<RedditPost[]> {
  const { data } = await supabase
    .from('reddit_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)
  return (data as RedditPost[]) || []
}

export async function createRedditPost(post: Omit<RedditPost, 'id' | 'created_at'>): Promise<RedditPost | null> {
  const { data, error } = await supabase
    .from('reddit_posts')
    .upsert({ ...post, id: `rp_${Date.now()}_${Math.random().toString(36).slice(2,8)}` }, {
      onConflict: 'article_id,subreddit',
      ignoreDuplicates: false,
    })
    .select()
    .single()
  if (error) {
    console.error('[Reddit] createRedditPost error:', error.message)
    return null
  }
  return data as RedditPost
}

export async function updateRedditPost(id: string, updates: Partial<RedditPost>): Promise<void> {
  await supabase.from('reddit_posts').update(updates).eq('id', id)
}

export async function deleteRedditPost(id: string): Promise<void> {
  await supabase.from('reddit_posts').delete().eq('id', id)
}

// ─── Open-and-track helper ────────────────────────────────────────────────────
// Opens the Reddit submit deep-link in a new tab and creates a "pending"
// tracking record in Supabase.
export async function openRedditPost(opts: {
  articleId: string
  articleTitle: string
  articleUrl: string
  subreddit: string
  customTitle?: string
  bodyText?: string
  flair?: string
  scheduleAt?: string
}): Promise<{ submitUrl: string; record: RedditPost | null }> {
  const title = opts.customTitle || opts.articleTitle
  const submitUrl = buildRedditSubmitUrl({
    subreddit: opts.subreddit,
    articleUrl: opts.articleUrl,
    title,
    bodyText: opts.bodyText,
    flair: opts.flair,
  })

  const record = await createRedditPost({
    article_id: opts.articleId,
    article_title: opts.articleTitle,
    article_url: opts.articleUrl,
    subreddit: opts.subreddit,
    custom_title: opts.customTitle || null,
    flair: opts.flair || null,
    status: opts.scheduleAt ? 'scheduled' : 'pending',
    reddit_permalink: null,
    error_message: null,
    schedule_at: opts.scheduleAt || null,
    posted_at: null,
  })

  if (!opts.scheduleAt) {
    window.open(submitUrl, '_blank', 'noopener,noreferrer')
  }

  return { submitUrl, record }
}

// ─── Apply auto-rules to an article ──────────────────────────────────────────
export async function applyAutoRulesToArticle(article: {
  id: string
  title: string
  url: string
  category: string
  tags?: string
}): Promise<void> {
  const rules = getAutoRules().filter(r => r.enabled)
  for (const rule of rules) {
    const matchesTags =
      article.category.toLowerCase().includes(rule.articleTagPattern.toLowerCase()) ||
      (article.tags || '').toLowerCase().includes(rule.articleTagPattern.toLowerCase())

    if (matchesTags) {
      const title = rule.titleTemplate
        .replace('{title}', article.title)
        .replace('{category}', article.category)

      await openRedditPost({
        articleId: article.id,
        articleTitle: article.title,
        articleUrl: article.url,
        subreddit: rule.subreddit,
        customTitle: title,
      })
    }
  }
}

// ─── RSS feed URL for this site ───────────────────────────────────────────────
export const SITE_RSS_URL = 'https://djflowerz.co.ke/rss.xml'

export function buildIFTTTInstructions(): string {
  return `
1. Go to https://ifttt.com and sign in.
2. Click "Create" → "If This" → Search "RSS Feed" → "New feed item".
3. Enter Feed URL: ${SITE_RSS_URL}
4. Click "Then That" → Search "Reddit" → "Submit a link".
5. Set Subreddit: soccer  |  Title: {{EntryTitle}}  |  URL: {{EntryUrl}}
6. Save. IFTTT will auto-post new articles to Reddit automatically!
`
}
