export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Accept, User-Agent',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
      body: '',
    }
  }

  let reqPath = event.queryStringParameters?.path || ''
  if (!reqPath && event.path) {
    reqPath = event.path
      .replace(/^\/\.netlify\/functions\/livescore/, '')
      .replace(/^\/api\/livescore/, '')
  }

  // Ensure path begins with slash
  if (reqPath && !reqPath.startsWith('/')) {
    reqPath = '/' + reqPath
  }

  // Append other query params if any
  const otherParams: string[] = []
  if (event.queryStringParameters) {
    for (const [k, v] of Object.entries(event.queryStringParameters)) {
      if (k !== 'path') {
        otherParams.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      }
    }
  }

  if (otherParams.length > 0) {
    const separator = reqPath.includes('?') ? '&' : '?'
    reqPath = reqPath + separator + otherParams.join('&')
  }

  if (!reqPath || reqPath === '/') {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Missing path parameter' }),
    }
  }

  const targetUrl = `https://prod-cdn-public-api.livescore.com${reqPath}`

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://www.livescore.com',
        'Referer': 'https://www.livescore.com/',
      },
    })

    if (!res.ok) {
      return {
        statusCode: res.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: `LiveScore upstream HTTP ${res.status}` }),
      }
    }

    const data = await res.text()
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=15, s-maxage=15',
      },
      body: data,
    }
  } catch (err: any) {
    return {
      statusCode: 502,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: err?.message || 'Upstream fetch failed' }),
    }
  }
}
