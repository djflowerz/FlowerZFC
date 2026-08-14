// Content Ingestion & Context Transformer Engine
// Connects directly to LiveScore Contentful API feed (space: u47hn5mzoiuo).
// Categories exactly match livescore.com/en/news/ navigation:
//   - Latest News (Home)      → /en/news/
//   - Football                → /en/news/football/
//     ↳ Premier League        → /en/news/football/premier-league/
//     ↳ Champions League      → /en/news/football/champions-league/
//     ↳ Europa League         → /en/news/football/europa-league/
//     ↳ Conference League     → /en/news/football/conference-league/
//     ↳ La Liga               → /en/news/football/la-liga/
//     ↳ Bundesliga            → /en/news/football/bundesliga/
//     ↳ Serie A               → /en/news/football/serie-a/
//     ↳ Ligue 1               → /en/news/football/ligue-1/
//     (other football)        → Football
//   - Predictions             → /en/news/predictions/
//   - Daily News Roundups     → /en/news/daily-roundup/
//   - NFL                     → /en/news/nfl/
//   - NBA                     → /en/news/nba/
//   - Golf                    → /en/news/golf/
//   - Horse Racing            → /en/news/horse-racing/
//   - Cricket                 → /en/news/cricket/
//   - Promotions              → /en/news/promos/  ← EXCLUDED

export interface IngestedPost {
  id: string
  sourceUrl: string
  sourceTitle: string
  sourceBody: string
  sourceImage: string
  sourceDate: string       // YYYY-MM-DD
  sourceSection: string    // e.g. "Daily News Roundups", "Football / Premier League"
  timestampMs: number
  transformedTitle: string
  transformedBody: string
  category: string         // Exact LiveScore top-level or sub-category label
  author: string
  status: 'Pending' | 'Approved' | 'Rejected'
  detectedAt: string       // Human readable time "HH:MM" or "Xh ago"
}

const CONTENTFUL_URL =
  'https://cdn.contentful.com/spaces/u47hn5mzoiuo/environments/master/entries' +
  '?access_token=BajQyLYH7tgna4_YpZXm_9TEpTTy7E7GJbm8w5JeWhM' +
  '&content_type=article&limit=100&order=-sys.createdAt'

let cachedIngestedPosts: IngestedPost[] = []

// ─── Category Resolver ─────────────────────────────────────────────────────
// Derives the exact category label from the article slug or URL path,
// mirroring the navigation on livescore.com/en/news/.
function resolveCategoryFromSlug(slug: string): { category: string; section: string } {
  const s = slug.toLowerCase()

  // Promotions — always excluded before calling this
  if (/promo|fanduel|underdog|prophetx|betmgm|draftkings|caesars|fan-duel|bet-mgm/.test(s))
    return { category: 'Promotions', section: 'Promotions' }

  // Football sub-leagues (order matters — most specific first)
  if (s.includes('premier-league') || s.includes('premier_league'))
    return { category: 'Premier League', section: 'Football / Premier League' }
  if (s.includes('champions-league') || s.includes('ucl') || s.includes('champions_league'))
    return { category: 'Champions League', section: 'Football / Champions League' }
  if (s.includes('europa-league') || s.includes('uel') || s.includes('europa_league'))
    return { category: 'Europa League', section: 'Football / Europa League' }
  if (s.includes('conference-league') || s.includes('uecl') || s.includes('conference_league'))
    return { category: 'Conference League', section: 'Football / Conference League' }
  if (s.includes('la-liga') || s.includes('laliga') || s.includes('la_liga'))
    return { category: 'La Liga', section: 'Football / La Liga' }
  if (s.includes('bundesliga'))
    return { category: 'Bundesliga', section: 'Football / Bundesliga' }
  if (s.includes('serie-a') || s.includes('serie_a') || s.includes('seriea'))
    return { category: 'Serie A', section: 'Football / Serie A' }
  if (s.includes('ligue-1') || s.includes('ligue_1') || s.includes('ligue1'))
    return { category: 'Ligue 1', section: 'Football / Ligue 1' }
  if (s.includes('super-cup') || s.includes('super_cup') || s.includes('supercup'))
    return { category: 'UEFA Super Cup', section: 'Football / UEFA Super Cup' }
  if (s.includes('world-cup') || s.includes('world_cup') || s.includes('worldcup'))
    return { category: 'World Cup', section: 'Football / World Cup' }

  // Other top-level categories
  if (s.includes('daily-roundup') || s.includes('daily_roundup') || s.includes('roundup'))
    return { category: 'Daily News Roundups', section: 'Daily News Roundups' }
  if (s.includes('prediction'))
    return { category: 'Predictions', section: 'Predictions' }
  if (s.includes('/nfl/') || s.startsWith('nfl-') || s.includes('-nfl-'))
    return { category: 'NFL', section: 'NFL' }
  if (s.includes('/nba/') || s.startsWith('nba-') || s.includes('-nba-'))
    return { category: 'NBA', section: 'NBA' }
  if (s.includes('golf') || s.includes('pga'))
    return { category: 'Golf', section: 'Golf' }
  if (s.includes('horse-racing') || s.includes('horse_racing') || s.includes('racing'))
    return { category: 'Horse Racing', section: 'Horse Racing' }
  if (s.includes('cricket') || s.includes('/ipl/') || s.includes('test-match'))
    return { category: 'Cricket', section: 'Cricket' }
  if (s.includes('mlb') || s.includes('baseball'))
    return { category: 'MLB', section: 'MLB' }
  if (s.includes('tennis') || s.includes('wimbledon') || s.includes('atp') || s.includes('wta'))
    return { category: 'Tennis', section: 'Tennis' }

  // General football catch-all
  if (s.includes('football') || s.includes('soccer') || s.includes('fc-') || s.includes('-fc'))
    return { category: 'Football', section: 'Football' }

  // Default to Latest News (Home)
  return { category: 'Latest News', section: 'Latest News' }
}

// ─── Promo Exclusion ────────────────────────────────────────────────────────
function isPromotionalPost(title: string, slug: string): boolean {
  const t = title.toLowerCase()
  const s = slug.toLowerCase()
  const promoTerms = [
    'promo code', 'promo for', 'livescore2', 'fanduel', 'underdog promo',
    'prophetx', 'betmgm', 'draftkings', 'caesars', 'claim $', 'free bet',
    'bonus code', 'bet resets', '/promos/', 'sign-up offer', 'betting offer',
  ]
  return promoTerms.some(kw => t.includes(kw) || s.includes(kw))
}

// ─── Context Transformer ────────────────────────────────────────────────────
export function transformContentContext(
  title: string,
  body: string,
): { title: string; body: string } {
  let t = (title || '')
    .replace(/LiveScore\s*(Exclusive|Report|Match Summary|Preview)?:?\s*/gi, '')
    .replace(/\bLiveScore\b/gi, 'FlowerZFC')
    .trim()

  let b = (body || '')
    .replace(/LiveScore reports that/gi, 'FlowerZFC media understands that')
    .replace(/according to LiveScore/gi, 'as FlowerZFC can confirm')
    .replace(/Read more on LiveScore/gi, 'Follow FlowerZFC for more')
    .replace(/Read the full match details on LiveScore/gi, 'Follow FlowerZFC for complete coverage')
    .replace(/\bLiveScore\b/gi, 'FlowerZFC')
    .trim()

  // Add FlowerZFC prefix if missing
  if (!t.toLowerCase().includes('flowerzfc') && !t.includes(' - ') && !t.includes(': ')) {
    t = `FlowerZFC Bulletin: ${t}`
  }

  return { title: t, body: b }
}

// ─── Main Fetcher ────────────────────────────────────────────────────────────
export async function fetchLiveIngestedPosts(): Promise<IngestedPost[]> {
  try {
    const res = await fetch(CONTENTFUL_URL)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()

    // Build assets map (id → CDN URL)
    const assetsMap: Record<string, string> = {}
    if (data.includes && Array.isArray(data.includes.Asset)) {
      data.includes.Asset.forEach((ast: any) => {
        if (ast.sys?.id && ast.fields?.file?.url) {
          let url: string = ast.fields.file.url
          if (url.startsWith('//')) url = 'https:' + url
          assetsMap[ast.sys.id] = url
        }
      })
    }

    const posts: IngestedPost[] = []

    if (data.items && Array.isArray(data.items)) {
      data.items.forEach((item: any) => {
        const fields = item.fields || {}
        const rawTitle: string = fields.title || 'Sports Headline'
        const slug: string = fields.slug || item.sys?.id || ''
        const url = `https://www.livescore.com/en/news/${slug}`

        // Skip promotions
        if (isPromotionalPost(rawTitle, url)) return

        const rawBody: string =
          typeof fields.body === 'string'
            ? fields.body
            : fields.summary || fields.description || fields.seoDescription || ''

        const createdAt: string = item.sys?.createdAt || new Date().toISOString()
        const dateStr = createdAt.slice(0, 10)
        const timestampMs = new Date(createdAt).getTime()

        // Image
        let imgUrl =
          'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&h=450&fit=crop'
        const mainImageId = fields.mainImage?.sys?.id
        if (mainImageId && assetsMap[mainImageId]) {
          imgUrl = assetsMap[mainImageId]
        }

        // Category & section derived from slug/URL path (exact LiveScore nav)
        const { category, section } = resolveCategoryFromSlug(`${url} ${slug}`)

        const transformed = transformContentContext(rawTitle, rawBody)
        const now = Date.now()
        const diffMs = now - timestampMs
        const diffH = Math.floor(diffMs / 3600000)
        const diffM = Math.floor(diffMs / 60000)
        const detectedAt =
          diffH > 0 ? `${diffH}h ago` : diffM > 0 ? `${diffM}m ago` : 'Just now'

        posts.push({
          id: `ing-${item.sys?.id || slug}`,
          sourceUrl: url,
          sourceTitle: rawTitle,
          sourceBody: rawBody,
          sourceImage: imgUrl,
          sourceDate: dateStr,
          sourceSection: section,
          timestampMs,
          transformedTitle: transformed.title,
          transformedBody: transformed.body,
          category,
          author: fields.authorName || 'FlowerZFC Newsdesk',
          status: 'Pending',
          detectedAt,
        })
      })
    }

    // Sort: newest first
    posts.sort((a, b) => b.timestampMs - a.timestampMs)

    if (posts.length > 0) {
      cachedIngestedPosts = posts
      return posts
    }
  } catch {
    // Network error — fall through to cache or fallback
  }

  if (cachedIngestedPosts.length > 0) return cachedIngestedPosts
  return getFallbackPosts()
}

// ─── Fallback (demo) posts ────────────────────────────────────────────────────
function getFallbackPosts(): IngestedPost[] {
  return []
}

export function getIngestedPosts(): IngestedPost[] {
  return cachedIngestedPosts.length > 0 ? cachedIngestedPosts : []
}

export function filterPostsByDate(posts: IngestedPost[], dateStr: string): IngestedPost[] {
  if (!dateStr) return posts
  return posts.filter(p => p.sourceDate === dateStr)
}

export async function downloadImageAsset(
  imageUrl: string,
  filename = 'flowerzfc-article-image.jpg',
) {
  try {
    const response = await fetch(imageUrl, { mode: 'cors' })
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
  } catch {
    const a = document.createElement('a')
    a.href = imageUrl
    a.target = '_blank'
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }
}
