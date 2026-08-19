export const onRequest = async (context: any) => {
  const url = new URL(context.request.url)
  const pathParam = url.searchParams.get('path') || url.pathname.replace(/^\/api\//, '/')
  const targetUrl = `https://prod-cdn-public-api.livescore.com${pathParam.startsWith('/') ? pathParam : '/' + pathParam}`

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
        'Cache-Control': 'public, max-age=15',
      },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Upstream fetch failed' }), {
      status: 502,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    })
  }
}
