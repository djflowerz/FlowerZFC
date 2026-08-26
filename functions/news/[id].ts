interface Env {
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_ANON_KEY?: string
}

const DEFAULT_SUPABASE_URL = "https://ogdxnqzhqvvhrrvrqoup.supabase.co"
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nZHhucXpocXZ2aHJydnJxb3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMzM0MjEsImV4cCI6MjA4NTkwOTQyMX0.pFxUc7Dv5o63_5dFQpakGZFeaBVDqywsJ7RNXDMAl6c"

function cleanText(str: string): string {
  return (str || '')
    .replace(/<[^>]*>/g, '')
    .replace(/"/g, '&quot;')
    .replace(/\s+/g, ' ')
    .trim()
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, params, env, next } = context
  const id = params.id as string
  const reqUrl = new URL(request.url)

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

  // 1. Try querying Supabase
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

  // 2. Fallbacks from query params if article is newly ingested / not yet in DB
  const queryTitle = reqUrl.searchParams.get('title')
  const queryImg = reqUrl.searchParams.get('img')

  const titleRaw = article?.title || queryTitle || 'FlowerZFC Football News'
  const title = `${cleanText(titleRaw)} — FlowerZFC`

  const descRaw = article?.summary || article?.body || 'Read the full story, match reactions, player updates, and live coverage on FlowerZFC.'
  const description = cleanText(descRaw).slice(0, 200)

  // Valid image with HTTPS & proxy for external hosts without CORS
  let rawImage = article?.image_url || queryImg || 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1200&h=630&fit=crop&auto=format'
  if (rawImage.startsWith('//')) {
    rawImage = 'https:' + rawImage
  }

  const image = rawImage.includes('livescore.com')
    ? `https://djflowerz.co.ke/api/img-proxy?url=${encodeURIComponent(rawImage)}`
    : rawImage

  const canonicalUrl = `https://djflowerz.co.ke/news/${article?.slug || id}`

  // Clean, single-source Open Graph & Twitter Card tags
  const rewriter = new HTMLRewriter()
    .on('title', {
      element(element) {
        element.setInnerContent(title)
      },
    })
    // Remove any conflicting or duplicate OG / Twitter tags from base template
    .on('meta[property^="og:"], meta[name^="twitter:"], meta[name="description"], link[rel="canonical"]', {
      element(element) {
        element.remove()
      },
    })
    .on('head', {
      element(element) {
        element.append(
          `
    <link rel="canonical" href="${canonicalUrl}" />
    <meta name="description" content="${description}" />
    <meta property="og:site_name" content="FlowerzFC" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${cleanText(titleRaw)}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:secure_url" content="${image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${cleanText(titleRaw)}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
`,
          { html: true }
        )
      },
    })

  return rewriter.transform(response)
}
