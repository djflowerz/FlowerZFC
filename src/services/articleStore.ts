/**
 * articleStore.ts
 * localStorage-backed store that bridges Admin.tsx (writer) and Article.tsx (reader).
 * Admin-created/edited articles are saved here; Article.tsx reads here first,
 * falling back to its hardcoded ARTICLES_DATABASE.
 *
 * SECURITY: All errors are swallowed silently — storage failures must never
 * surface stack traces or internal details to the browser console.
 */

export interface StoredArticle {
  id: string
  title: string
  slug: string
  category: string
  author: string
  excerpt?: string
  body: string
  imageUrl: string
  imageAlt?: string
  imageCaption?: string
  status: string
  date: string
  scheduled: string
  views: string
  likes: number
  tags: string

  // Football-Specific Elements
  matchId?: string
  teamTags?: string
  playerTags?: string
  mediaEmbeds?: string
  isLiveBlog?: boolean

  // SEO & Discovery
  metaTitle?: string
  metaDescription: string
  focusKeywords?: string
}

const STORE_KEY = 'flz_articles_v1'
const DELETED_KEY = 'flz_deleted_articles_v1'

export function getDeletedArticleIds(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const DUMMY_IDS = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8']

export function getAllArticles(): StoredArticle[] {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    const list = raw ? (JSON.parse(raw) as StoredArticle[]) : []
    const deleted = getDeletedArticleIds()
    return list.filter(a => !deleted.includes(a.id) && !DUMMY_IDS.includes(a.id) && !a.id.startsWith('ing-'))
  } catch {
    return []
  }
}

export function getArticle(id: string): StoredArticle | null {
  try {
    if (getDeletedArticleIds().includes(id)) return null
    return getAllArticles().find(a => a.id === id) ?? null
  } catch {
    return null
  }
}

export function saveArticle(article: StoredArticle): void {
  try {
    const articles = getAllArticles()
    const idx = articles.findIndex(a => a.id === article.id)
    if (idx >= 0) articles[idx] = article
    else articles.push(article)
    localStorage.setItem(STORE_KEY, JSON.stringify(articles))
  } catch {
    // Silent — never expose storage errors
  }
}

export function deleteArticle(id: string): void {
  try {
    const articles = getAllArticles().filter(a => a.id !== id)
    localStorage.setItem(STORE_KEY, JSON.stringify(articles))
    const deleted = getDeletedArticleIds()
    if (!deleted.includes(id)) {
      localStorage.setItem(DELETED_KEY, JSON.stringify([...deleted, id]))
    }
  } catch {
    // Silent
  }
}

export function clearArticleStore(): void {
  try {
    localStorage.removeItem(STORE_KEY)
  } catch {
    // Silent
  }
}
