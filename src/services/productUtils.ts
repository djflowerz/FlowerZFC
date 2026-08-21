/**
 * Product URL Slug & Matching Utilities
 * Generates SEO-friendly product links (e.g. /shop/arsenal-home-jersey-2024-p1787224444764)
 */

export function slugify(text: string): string {
  return (text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getProductSlug(product: { id: string | number; name?: string }): string {
  if (!product) return ''
  const nameSlug = slugify(product.name || '')
  const idStr = String(product.id || '').trim()
  if (nameSlug && idStr) {
    return `${nameSlug}-${idStr}`
  }
  return idStr || nameSlug || 'item'
}

export function getProductPath(product: { id: string | number; name?: string }): string {
  return `/shop/${getProductSlug(product)}`
}

export function matchProduct<T extends { id: string | number; name?: string }>(products: T[], rawParam?: string): T | undefined {
  if (!rawParam || !products || products.length === 0) return undefined
  const param = decodeURIComponent(rawParam).toLowerCase().trim()

  // 1. Direct ID match
  const byId = products.find(p => String(p.id).toLowerCase() === param)
  if (byId) return byId

  // 2. Slug ending with -{id}
  for (const p of products) {
    const idStr = String(p.id).toLowerCase()
    if (param.endsWith(`-${idStr}`) || param.endsWith(`-${idStr}/`)) {
      return p
    }
  }

  // 3. Name slug match
  for (const p of products) {
    const fullSlug = getProductSlug(p).toLowerCase()
    if (fullSlug === param) return p
    const nameSlug = slugify(p.name || '').toLowerCase()
    if (nameSlug === param) return p
  }

  return undefined
}
