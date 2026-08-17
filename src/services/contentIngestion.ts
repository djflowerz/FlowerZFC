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
// Rules:
//  1. Title: Keep 100% identical to source. ONLY remove/replace the word "LiveScore" 
//     and similar references. Do NOT restructure, rename, or reword anything else.
//  2. Body: Same rule — keep original wording, only strip LiveScore brand references.
//  3. Author: Always "Admin"
export function transformContentContext(
  title: string,
  body: string,
): { title: string; body: string } {
  // Strip LiveScore brand references from title — keep everything else identical
  const t = (title || '')
    .replace(/\blivescore\b/gi, '')       // remove bare "livescore" word
    .replace(/\s{2,}/g, ' ')              // collapse double spaces
    .trim()

  // Strip LiveScore brand references from body — keep everything else intact
  const b = (body || '')
    .replace(/\blivescore\.com\b/gi, 'our platform')
    .replace(/\blivescore\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  return { title: t, body: b }
}

const FOOTBALL_IMAGES = [
  'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1400&h=700&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1400&h=700&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1400&h=700&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=1400&h=700&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=1400&h=700&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=1400&h=700&fit=crop&auto=format',
]

// ─── Get today YYYY-MM-DD in local time ──────────────────────────────────────
function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ─── Main Fetcher ─────────────────────────────────────────────────────────────
// Fetches ALL 100 articles from Contentful (no date filter here — date filtering
// is done in filterPostsByDate so the scanner can show any date the admin picks).
export async function fetchLiveIngestedPosts(): Promise<IngestedPost[]> {
  try {
    const res = await fetch(CONTENTFUL_URL)
    if (res.ok) {
      const data = await res.json()
      const entries: any[] = data.items || []
      const assets = new Map<string, string>()

      // Build asset map for image resolution
      if (data.includes?.Asset) {
        for (const asset of data.includes.Asset) {
          if (asset.sys?.id && asset.fields?.file?.url) {
            const u: string = asset.fields.file.url
            assets.set(asset.sys.id, u.startsWith('http') ? u : `https:${u}`)
          }
        }
      }

      const parsed: IngestedPost[] = []

      for (let idx = 0; idx < entries.length; idx++) {
        const item = entries[idx]
        const f = item.fields || {}
        const title: string = f.title || f.headline || f.name || ''
        const slug: string  = f.slug  || title.toLowerCase().replace(/[^a-z0-9]+/g, '-')

        if (!title || isPromotionalPost(title, slug)) continue

        const body: string = f.body || f.content || f.summary || f.teaser || title

        // Image: try Contentful asset first, then rotate football fallbacks
        const imgId = f.mainImage?.sys?.id || f.image?.sys?.id || f.heroImage?.sys?.id
                    || f.thumbnail?.sys?.id || f.photo?.sys?.id  || f.media?.sys?.id
        const imageUrl = (imgId ? assets.get(imgId) : null) || FOOTBALL_IMAGES[idx % FOOTBALL_IMAGES.length]

        // Date from Contentful sys.createdAt  (ISO string → "YYYY-MM-DD")
        const rawDate: string  = item.sys?.createdAt || new Date().toISOString()
        const sourceDate: string = rawDate.slice(0, 10)           // "YYYY-MM-DD"
        const timestampMs: number = new Date(rawDate).getTime()

        const { category, section } = resolveCategoryFromSlug(slug)
        const transformed = transformContentContext(title, body)

        parsed.push({
          id: item.sys?.id || `ls_${timestampMs}_${idx}`,
          sourceUrl: `https://www.livescore.com/en/news/${slug}/`,
          sourceTitle: title,
          sourceBody:  body,
          sourceImage: imageUrl,
          sourceDate,
          sourceSection: section,
          timestampMs,
          transformedTitle: transformed.title,
          transformedBody:  transformed.body,
          category,
          author: 'Admin',    // always Admin
          status: 'Pending',
          detectedAt: new Date(timestampMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        })
      }

      if (parsed.length > 0) {
        cachedIngestedPosts = parsed
        return parsed
      }
    }
  } catch (err) {
    console.error('[FlowerZFC] Contentful fetch error:', err)
  }

  // Network fallback — return empty so scanner shows "no posts for date" message
  cachedIngestedPosts = []
  return []
}

export function getIngestedPosts(): IngestedPost[] {
  return cachedIngestedPosts
}

// ─── Date Filter ──────────────────────────────────────────────────────────────
// If dateStr is blank → filter to today.
// Returns all posts whose sourceDate matches the selected date.
// Does NOT fall back to showing everything when no match — shows empty state instead
// so the admin sees the correct "no posts on this date" message.
export function filterPostsByDate(posts: IngestedPost[], dateStr: string): IngestedPost[] {
  const target = dateStr || todayLocal()
  return posts.filter(p => p.sourceDate === target)
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

