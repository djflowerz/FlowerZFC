// Netlify serverless function: /api/rss
// Generates a live RSS 2.0 feed from the FlowerZFC Supabase articles table.
// Used by IFTTT, Zapier, and feed readers to auto-post new content to Reddit.
//
// Route: GET /.netlify/functions/rss  (maps to /rss.xml via netlify.toml redirect)

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

const SITE_URL = 'https://djflowerz.co.ke'
const SITE_TITLE = 'FlowerZFC — Football News & Live Scores'
const SITE_DESC = 'Latest football news, live scores, transfers, analysis and match previews from across the globe.'

function escapeXml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export const handler = async () => {
  const headers = {
    'Content-Type': 'application/rss+xml; charset=utf-8',
    'Cache-Control': 'public, max-age=300, s-maxage=300',
    'Access-Control-Allow-Origin': '*',
  }

  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY)
    const { data: articles, error } = await sb
      .from('articles')
      .select('id, title, slug, category, author, body, image_url, published_at, tags')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(50)

    if (error) throw new Error(error.message)

    const items = (articles || []).map((a: any) => {
      const pubDate = new Date(a.published_at || Date.now()).toUTCString()
      const articleUrl = `${SITE_URL}/#/news/${a.slug || a.id}`
      const imgTag = a.image_url
        ? `<enclosure url="${escapeXml(a.image_url)}" type="image/jpeg" length="0" />`
        : ''
      const bodySnippet = (a.body || '').replace(/<[^>]+>/g, '').slice(0, 400)

      return `
    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${escapeXml(articleUrl)}</link>
      <guid isPermaLink="true">${escapeXml(articleUrl)}</guid>
      <description>${escapeXml(bodySnippet)}…</description>
      <category>${escapeXml(a.category || 'Football')}</category>
      <author>admin@djflowerz.co.ke (${escapeXml(a.author || 'Admin')})</author>
      <pubDate>${pubDate}</pubDate>
      ${imgTag}
    </item>`
    }).join('')

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(SITE_DESC)}</description>
    <language>en-gb</language>
    <managingEditor>admin@djflowerz.co.ke (FlowerZFC Admin)</managingEditor>
    <webMaster>admin@djflowerz.co.ke</webMaster>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>5</ttl>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${SITE_URL}/logo.png</url>
      <title>${escapeXml(SITE_TITLE)}</title>
      <link>${SITE_URL}</link>
    </image>
    ${items}
  </channel>
</rss>`

    return { statusCode: 200, headers, body: rss }
  } catch (err: any) {
    // Fallback minimal feed on error — never leak credentials
    const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>FlowerZFC</title><link>${SITE_URL}</link><description>Feed temporarily unavailable</description></channel></rss>`
    return { statusCode: 200, headers, body: fallback }
  }
}
