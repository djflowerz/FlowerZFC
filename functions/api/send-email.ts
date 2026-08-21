export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

export const onRequestPost = async (context: any) => {
  try {
    const payload = await context.request.json()
    const secretKey = context.env?.PLUNK_SECRET_KEY || 'sk_ed5a930204333ba7cfb101808546e622b5111881aaf012af187303b1a5d14a08'

    const res = await fetch('https://next-api.useplunk.com/v1/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: payload.to,
        subject: payload.subject,
        body: payload.body,
        from: payload.from || 'FlowerZFC <noreply@djflowerz.co.ke>',
        ...(payload.replyTo ? { replyTo: payload.replyTo } : {}),
      }),
    })

    const data = await res.json()

    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err?.message || 'Server email error' }), {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    })
  }
}
