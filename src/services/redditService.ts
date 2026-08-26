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

export const FOOTBALL_SUBREDDITS: FootballSubreddit[] = [
  { name: 'soccer',          display: 'r/soccer',          subscribers: '5M+',   flag: '⚽', description: 'General world football',          tags: ['Football', 'Latest News', 'Transfers'] },
  { name: 'PremierLeague',   display: 'r/PremierLeague',   subscribers: '1.2M',  flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', description: 'English Premier League',          tags: ['Premier League'] },
  { name: 'championsleague', display: 'r/championsleague', subscribers: '600K',  flag: '🏆', description: 'UEFA Champions League',            tags: ['Champions League'] },
  { name: 'LaLiga',          display: 'r/LaLiga',          subscribers: '350K',  flag: '🇪🇸', description: 'Spanish La Liga',                  tags: ['La Liga'] },
  { name: 'Bundesliga',      display: 'r/Bundesliga',      subscribers: '320K',  flag: '🇩🇪', description: 'German Bundesliga',                tags: ['Bundesliga'] },
  { name: 'seriea',          display: 'r/seriea',          subscribers: '220K',  flag: '🇮🇹', description: 'Italian Serie A',                  tags: ['Serie A'] },
  { name: 'Ligue1',          display: 'r/Ligue1',          subscribers: '120K',  flag: '🇫🇷', description: 'French Ligue 1',                   tags: ['Ligue 1'] },
  { name: 'EuropaLeague',    display: 'r/EuropaLeague',    subscribers: '200K',  flag: '🟠', description: 'UEFA Europa League',               tags: ['Europa League'] },
  { name: 'football',        display: 'r/football',        subscribers: '900K',  flag: '🌍', description: 'UK-focused football discussion',   tags: ['Football', 'Predictions'] },
  { name: 'AFCsoccer',       display: 'r/AFCsoccer',       subscribers: '180K',  flag: '🌏', description: 'Asian Football Confederation',     tags: ['Football'] },
  { name: 'dailyfootball',   display: 'r/dailyfootball',   subscribers: '50K',   flag: '📰', description: 'Daily football news & analysis',   tags: ['Latest News', 'Daily News Roundups'] },
  { name: 'footballtactics',  display: 'r/footballtactics', subscribers: '120K',  flag: '🧠', description: 'Football tactics & analysis',      tags: ['Predictions', 'Football'] },
  { name: 'Arsenal',         display: 'r/Arsenal',         subscribers: '750K',  flag: '🔴', description: 'Arsenal FC',                       tags: ['Premier League'] },
  { name: 'LiverpoolFC',     display: 'r/LiverpoolFC',     subscribers: '850K',  flag: '🔴', description: 'Liverpool FC',                     tags: ['Premier League'] },
  { name: 'chelseafc',       display: 'r/chelseafc',       subscribers: '500K',  flag: '🔵', description: 'Chelsea FC',                       tags: ['Premier League'] },
  { name: 'ManchesterUnited',display: 'r/ManchesterUnited',subscribers: '720K',  flag: '🔴', description: 'Manchester United',                tags: ['Premier League'] },
  { name: 'MCFC',            display: 'r/MCFC',            subscribers: '400K',  flag: '🔵', description: 'Manchester City',                  tags: ['Premier League'] },
  { name: 'Tottenham',       display: 'r/Tottenham',       subscribers: '300K',  flag: '⚪', description: 'Tottenham Hotspur',               tags: ['Premier League'] },
  { name: 'Kenya',           display: 'r/Kenya',           subscribers: '120K',  flag: '🇰🇪', description: 'Kenya — post local football news', tags: ['Football', 'Latest News'] },
  { name: 'test',            display: 'r/test',            subscribers: '∞',     flag: '🧪', description: 'Reddit sandbox — test posts here first', tags: [] },
]

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

// ─── Deep-link builder ───────────────────────────────────────────────────────
// Opens Reddit's native submit page — NO API REQUIRED.
// Reddit pre-fills the URL and title from the query string.
export function buildRedditSubmitUrl(opts: {
  subreddit: string
  articleUrl: string
  title: string
  type?: 'link' | 'text'
}): string {
  const base = `https://www.reddit.com/r/${opts.subreddit}/submit`
  const params = new URLSearchParams({
    url: opts.articleUrl,
    title: opts.title,
    type: opts.type || 'link',
  })
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
// tracking record in Supabase. The admin must mark it "posted" manually
// (or we detect via Reddit's URL in the new tab — handled in UI).
export async function openRedditPost(opts: {
  articleId: string
  articleTitle: string
  articleUrl: string
  subreddit: string
  customTitle?: string
  flair?: string
  scheduleAt?: string
}): Promise<{ submitUrl: string; record: RedditPost | null }> {
  const title = opts.customTitle || opts.articleTitle
  const submitUrl = buildRedditSubmitUrl({
    subreddit: opts.subreddit,
    articleUrl: opts.articleUrl,
    title,
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
