export const onRequest = async (context: any) => {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Accept',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    })
  }

  const url = new URL(context.request.url)
  let pathParam = url.searchParams.get('path') || ''
  
  if (!pathParam) {
    pathParam = url.pathname.replace(/^\/api\/livescore/, '')
  }

  if (pathParam && !pathParam.startsWith('/')) {
    pathParam = '/' + pathParam
  }

  // Preserve other query parameters
  const queryParams = new URLSearchParams()
  for (const [k, v] of url.searchParams.entries()) {
    if (k !== 'path') queryParams.append(k, v)
  }
  const extraQuery = queryParams.toString()
  if (extraQuery) {
    pathParam += (pathParam.includes('?') ? '&' : '?') + extraQuery
  }

  if (!pathParam || pathParam === '/') {
    return new Response(JSON.stringify({ error: 'Missing path' }), {
      status: 400,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    })
  }

  const targetUrl = `https://prod-cdn-public-api.livescore.com${pathParam}`

  try {
    const upstreamRes = await fetch(targetUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://www.livescore.com',
        'Referer': 'https://www.livescore.com/',
      },
    })

    const body = await upstreamRes.text()
    return new Response(body, {
      status: upstreamRes.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=15, s-maxage=15',
      },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Upstream fetch failed' }), {
      status: 502,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    })
  }
}
