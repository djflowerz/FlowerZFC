interface Env {
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_ANON_KEY?: string
}

const DEFAULT_SUPABASE_URL = "https://ogdxnqzhqvvhrrvrqoup.supabase.co"
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nZHhucXpocXZ2aHJydnJxb3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMzM0MjEsImV4cCI6MjA4NTkwOTQyMX0.pFxUc7Dv5o63_5dFQpakGZFeaBVDqywsJ7RNXDMAl6c"

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, params, env, next } = context
  const id = params.id as string

  // Fetch the base SPA HTML response
  const response = await next()

  if (!id) {
    return response
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('text/html')) {
    return response
  }

  const supabaseUrl = env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL
  const supabaseKey = env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY

  let article: any = null

  try {
    const encodedId = encodeURIComponent(id)
    const apiRes = await fetch(
      `${supabaseUrl}/rest/v1/articles?or=(id.eq.${encodedId},slug.eq.${encodedId})&select=id,slug,title,summary,body,image_url,category,author,published_at&limit=1`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Accept: 'application/json',
        },
      }
    )

    if (apiRes.ok) {
      const data = await apiRes.json()
      if (Array.isArray(data) && data.length > 0) {
        article = data[0]
      }
    }
  } catch (err) {
    console.error('Error fetching article for OpenGraph:', err)
  }

  const title = article?.title ? `${article.title} — FlowerzFC` : 'FlowerzFC Football News'
  const rawDescription = article?.summary || article?.body || 'Read the full story, match reactions, and live coverage on FlowerzFC.'
  const description = rawDescription.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 200)
  const image = article?.image_url || 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1200&h=630&fit=crop&auto=format'
  const canonicalUrl = `https://djflowerz.co.ke/news/${article?.slug || id}`

  const rewriter = new HTMLRewriter()
    .on('title', {
      element(element) {
        element.setInnerContent(title)
      },
    })
    .on('head', {
      element(element) {
        element.append(
          `
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="og:site_name" content="FlowerzFC" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
    <meta name="description" content="${escapeHtml(description)}" />
`,
          { html: true }
        )
      },
    })

  return rewriter.transform(response)
}
