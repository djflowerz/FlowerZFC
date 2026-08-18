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
    return list.filter(a => !deleted.includes(a.id) && !DUMMY_IDS.includes(a.id))
  } catch {
    return []
  }
}

export function getArticle(id: string): StoredArticle | null {
  try {
    if (!id || getDeletedArticleIds().includes(id)) return null
    const articles = getAllArticles()
    return articles.find(a =>
      a.id === id ||
      a.slug === id ||
      a.id.toLowerCase() === id.toLowerCase() ||
      (a.slug && a.slug.toLowerCase() === id.toLowerCase()) ||
      a.id.includes(id) ||
      id.includes(a.id)
    ) ?? null
  } catch {
    return null
  }
}

export function saveArticle(article: StoredArticle): void {
  try {
    saveArticles([article])
  } catch {
    // Silent — never expose storage errors
  }
}

export function saveArticles(newArticles: StoredArticle[]): void {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    const current: StoredArticle[] = raw ? JSON.parse(raw) : []
    newArticles.forEach(na => {
      const idx = current.findIndex(a => a.id === na.id || (na.slug && a.slug === na.slug))
      if (idx >= 0) {
        current[idx] = na
      } else {
        current.unshift(na)
      }
    })
    localStorage.setItem(STORE_KEY, JSON.stringify(current))
  } catch {
    // Silent
  }
}

export function deleteArticle(id: string): void {
  deleteArticles([id])
}

export function deleteArticles(ids: string[]): void {
  try {
    const idSet = new Set(ids)
    const raw = localStorage.getItem(STORE_KEY)
    const current: StoredArticle[] = raw ? JSON.parse(raw) : []
    const remaining = current.filter(a => !idSet.has(a.id))
    localStorage.setItem(STORE_KEY, JSON.stringify(remaining))

    const deleted = getDeletedArticleIds()
    const updatedDeleted = Array.from(new Set([...deleted, ...ids]))
    localStorage.setItem(DELETED_KEY, JSON.stringify(updatedDeleted))
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
