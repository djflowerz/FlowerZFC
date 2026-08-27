export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url)
  let target = url.searchParams.get('url') || ''

  if (!target) {
    return new Response('Missing url parameter', { status: 400 })
  }

  // Safely decode if double-encoded or encoded by proxy chain
  while (target.includes('%3A') || target.includes('%2F') || target.includes('%25')) {
    try {
      const next = decodeURIComponent(target)
      if (next === target) break
      target = next
    } catch { break }
  }

  if (!target.startsWith('http://') && !target.startsWith('https://')) {
    if (target.startsWith('//')) {
      target = 'https:' + target
    } else {
      return new Response('Invalid URL scheme', { status: 400 })
    }
  }

  try {
    const upstream = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': 'https://www.livescore.com/',
      },
    })

    const headers = new Headers(upstream.headers)
    headers.set('Access-Control-Allow-Origin', '*')
    headers.set('Cache-Control', 'public, max-age=604800, immutable')
    headers.set('Content-Type', upstream.headers.get('content-type') || 'image/jpeg')

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    })
  } catch (err: any) {
    return new Response('Failed to proxy image', { status: 502 })
  }
}
