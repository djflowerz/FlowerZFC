/**
 * FlowerZFC Email Service — Powered by Plunk
 * Sender: noreply@djflowerz.co.ke  |  Admin: support@djflowerz.co.ke
 */

const PLUNK_API = 'https://next-api.useplunk.com/v1/send'
const PLUNK_SECRET = 'sk_ed5a930204333ba7cfb101808546e622b5111881aaf012af187303b1a5d14a08'
const FROM_EMAIL = 'noreply@djflowerz.co.ke'
const FROM_NAME = 'FlowerZFC'
const BRAND_GREEN = '#00b341'
const SITE_URL = 'https://www.djflowerz.co.ke'
const ADMIN_EMAIL = 'support@djflowerz.co.ke'

// ─── Base email wrapper ────────────────────────────────────────────────────────
function baseTemplate(preheader: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#0a0a14;font-family:Arial,sans-serif;color:#fff;}
a{color:${BRAND_GREEN};text-decoration:none;}
.btn{display:inline-block;padding:13px 30px;background:${BRAND_GREEN};color:#fff!important;border-radius:10px;font-weight:900;font-size:14px;text-decoration:none;}
.btn-ghost{display:inline-block;padding:11px 26px;border:2px solid ${BRAND_GREEN};color:${BRAND_GREEN}!important;border-radius:10px;font-weight:700;font-size:13px;text-decoration:none;}
</style>
</head>
<body>
<span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a14;padding:28px 12px;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">
  <tr><td style="background:#0d0d1a;border-radius:14px 14px 0 0;padding:22px 32px;border-bottom:2px solid ${BRAND_GREEN};">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td><span style="font-size:20px;font-weight:900;color:#fff;">⚽ <span style="color:${BRAND_GREEN};">FlowerZ</span>FC</span></td>
      <td align="right"><span style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:2px;">Global Football &amp; Media</span></td>
    </tr></table>
  </td></tr>
  <tr><td style="background:#131320;padding:32px;">${body}</td></tr>
  <tr><td style="background:#0d0d1a;border-radius:0 0 14px 14px;padding:20px 32px;border-top:1px solid #1e1e32;">
    <p style="font-size:11px;color:#6b7280;margin-bottom:6px;">
      <a href="${SITE_URL}" style="color:${BRAND_GREEN};">djflowerz.co.ke</a> &nbsp;·&nbsp;
      <a href="${SITE_URL}/#/shop" style="color:${BRAND_GREEN};">Shop</a> &nbsp;·&nbsp;
      <a href="${SITE_URL}/#/news" style="color:${BRAND_GREEN};">News</a> &nbsp;·&nbsp;
      <a href="${SITE_URL}/#/scores" style="color:${BRAND_GREEN};">Live Scores</a>
    </p>
    <p style="font-size:10px;color:#4b5563;">📞 (+254) 712 293 303 &nbsp;·&nbsp; 💬 (+254) 789 783 258 &nbsp;·&nbsp; ✉️ support@djflowerz.co.ke</p>
    <p style="font-size:10px;color:#374151;margin-top:6px;">© 2025 FlowerZFC. All rights reserved.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

// ─── Core send function ────────────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string, replyTo?: string): Promise<boolean> {
  // 1. Try serverless Cloudflare Pages Function endpoint first (no CORS, secure)
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        subject,
        body: html,
        from: FROM_EMAIL,
        name: FROM_NAME,
        ...(replyTo ? { replyTo } : {}),
      }),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.success !== false) return true
    }
  } catch {
    // Fallback below
  }

  // 2. Direct API fallback
  try {
    const res = await fetch('https://next-api.useplunk.com/v1/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PLUNK_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        subject,
        body: html,
        from: FROM_EMAIL,
        name: FROM_NAME,
        ...(replyTo ? { replyTo } : {}),
      }),
    })
    const data = await res.json()
    if (!data.success) console.warn('[EmailService]', data)
    return data.success === true
  } catch (err) {
    console.warn('[EmailService] send failed:', err)
    return false
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. ORDER CONFIRMATION
// ═══════════════════════════════════════════════════════════════════════════════
export async function sendOrderConfirmation(params: {
  to: string
  customerName: string
  orderId: string
  items: Array<{ name: string; qty: number; price: number; size?: string }>
  total: number
  shippingAddress?: string
  isDigital?: boolean
}) {
  const { to, customerName, orderId, items, total, shippingAddress, isDigital } = params

  const rows = items.map(i => `
    <tr>
      <td style="padding:9px 0;border-bottom:1px solid #1e1e32;color:#e5e7eb;font-size:13px;">${i.name}${i.size ? ` <span style="color:#6b7280;">(${i.size})</span>` : ''}</td>
      <td style="padding:9px 0;border-bottom:1px solid #1e1e32;color:#9ca3af;font-size:13px;text-align:center;">x${i.qty}</td>
      <td style="padding:9px 0;border-bottom:1px solid #1e1e32;color:${BRAND_GREEN};font-size:13px;font-weight:700;text-align:right;">KES ${(i.price * i.qty).toLocaleString()}</td>
    </tr>`).join('')

  const body = `
    <div style="margin-bottom:22px;">
      <div style="display:inline-block;background:rgba(0,179,65,0.1);border:1px solid rgba(0,179,65,0.3);border-radius:8px;padding:5px 14px;margin-bottom:14px;">
        <span style="color:${BRAND_GREEN};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">ORDER CONFIRMED</span>
      </div>
      <h1 style="font-size:24px;font-weight:900;color:#fff;margin-bottom:8px;">Thanks, ${customerName}! Your order is in.</h1>
      <p style="color:#9ca3af;font-size:14px;line-height:1.65;">${isDigital ? 'Your digital item is ready.' : "We're preparing your order for G4S delivery."}</p>
    </div>
    <div style="background:#0c0c14;border:1px solid #1e1e32;border-radius:10px;padding:13px 18px;margin-bottom:20px;">
      <p style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Order #</p>
      <p style="color:#fff;font-size:15px;font-weight:700;font-family:monospace;">${orderId}</p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <th style="text-align:left;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;padding-bottom:8px;border-bottom:1px solid #1e1e32;">Item</th>
        <th style="text-align:center;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;padding-bottom:8px;border-bottom:1px solid #1e1e32;">Qty</th>
        <th style="text-align:right;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;padding-bottom:8px;border-bottom:1px solid #1e1e32;">Price</th>
      </tr>
      ${rows}
      <tr>
        <td colspan="2" style="padding-top:12px;font-size:14px;font-weight:700;color:#fff;">Total</td>
        <td style="padding-top:12px;font-size:18px;font-weight:900;color:${BRAND_GREEN};text-align:right;">KES ${total.toLocaleString()}</td>
      </tr>
    </table>
    ${shippingAddress && !isDigital ? `
    <div style="background:#0c0c14;border:1px solid #1e1e32;border-radius:10px;padding:13px 18px;margin-bottom:20px;">
      <p style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Shipping To</p>
      <p style="color:#e5e7eb;font-size:13px;line-height:1.6;">${shippingAddress}</p>
      <p style="color:#6b7280;font-size:11px;margin-top:6px;">G4S Courier · KES 400 · 3-5 business days</p>
    </div>` : ''}
    <div style="text-align:center;margin:8px 0 20px;">
      <a href="${SITE_URL}/#/account" class="btn">View My Order</a>
    </div>
    <p style="color:#6b7280;font-size:12px;text-align:center;">Questions? <a href="https://wa.me/254789783258" style="color:${BRAND_GREEN};">WhatsApp (+254) 789 783 258</a></p>`

  return sendEmail(to, `Order Confirmed - #${orderId} | FlowerZFC`, baseTemplate(`Order #${orderId} confirmed - thank you, ${customerName}!`, body))
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. WELCOME EMAIL
// ═══════════════════════════════════════════════════════════════════════════════
export async function sendWelcomeEmail(params: { to: string; name: string }) {
  const { to, name } = params
  const perks = [
    { icon: '📺', t: 'Live Scores', d: 'Real-time scores from 50+ leagues worldwide' },
    { icon: '🛍️', t: 'Official Store', d: 'Authentic kits, training gear &amp; merch' },
    { icon: '🎵', t: 'DJ Mixes', d: 'Afrobeats &amp; football vibes, exclusively on FlowerZFC' },
    { icon: '📰', t: 'Football News', d: 'Transfers, analysis &amp; match reports' },
  ]
  const body = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:50px;margin-bottom:10px;">⚽</div>
      <h1 style="font-size:26px;font-weight:900;color:#fff;margin-bottom:8px;">Welcome, ${name}!</h1>
      <p style="color:#9ca3af;font-size:14px;line-height:1.7;max-width:380px;margin:0 auto;">You're now part of East Africa's #1 football &amp; media community.</p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${perks.map(p => `<tr><td style="padding:10px 0;border-bottom:1px solid #1e1e32;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:24px;padding-right:14px;vertical-align:middle;">${p.icon}</td>
          <td><p style="color:#fff;font-size:13px;font-weight:700;margin-bottom:2px;">${p.t}</p><p style="color:#6b7280;font-size:12px;">${p.d}</p></td>
        </tr></table>
      </td></tr>`).join('')}
    </table>
    <div style="text-align:center;margin-bottom:14px;"><a href="${SITE_URL}" class="btn">Explore FlowerZFC</a></div>
    <div style="text-align:center;"><a href="${SITE_URL}/#/shop" class="btn-ghost">Browse the Store</a></div>`

  return sendEmail(to, `Welcome to FlowerZFC, ${name}!`, baseTemplate(`Welcome ${name}! You're now part of FlowerZFC.`, body))
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. NEWSLETTER WELCOME
// ═══════════════════════════════════════════════════════════════════════════════
export async function sendNewsletterWelcome(params: { to: string; name?: string }) {
  const displayName = params.name || 'Football Fan'
  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:44px;margin-bottom:10px;">📬</div>
      <h1 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:8px;">You're subscribed!</h1>
      <p style="color:#9ca3af;font-size:14px;line-height:1.7;">Hey ${displayName}, welcome to the <strong style="color:#fff;">FlowerZFC Newsletter</strong>.</p>
    </div>
    <div style="background:#0c0c14;border:1px solid rgba(0,179,65,0.2);border-radius:10px;padding:18px 22px;margin-bottom:22px;">
      <p style="color:${BRAND_GREEN};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">What's coming your way:</p>
      ${['🔴 Live match alerts &amp; goal notifications', '⚽ Weekly match previews &amp; predictions', '💰 Transfer window news &amp; rumours', '🛍️ Store deals &amp; early access launches', '🎵 New DJ mix drops'].map(i =>
        `<p style="color:#e5e7eb;font-size:13px;margin-bottom:6px;">${i}</p>`
      ).join('')}
    </div>
    <div style="text-align:center;"><a href="${SITE_URL}" class="btn">Go to FlowerZFC</a></div>`

  return sendEmail(params.to, "You're subscribed to FlowerZFC!", baseTemplate("Welcome to the FlowerZFC newsletter.", body))
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. AD INQUIRY CONFIRMATION — to advertiser
// ═══════════════════════════════════════════════════════════════════════════════
export async function sendAdvertiseConfirmation(params: {
  to: string; name: string; company?: string; packageSelected?: string; budget?: string
}) {
  const { to, name, company, packageSelected, budget } = params
  const body = `
    <div style="margin-bottom:22px;">
      <div style="display:inline-block;background:rgba(0,179,65,0.1);border:1px solid rgba(0,179,65,0.3);border-radius:8px;padding:5px 14px;margin-bottom:14px;">
        <span style="color:${BRAND_GREEN};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">INQUIRY RECEIVED</span>
      </div>
      <h1 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:8px;">Thanks, ${name}!</h1>
      <p style="color:#9ca3af;font-size:14px;line-height:1.65;">We've received your advertising inquiry and will respond within <strong style="color:#fff;">24 hours</strong>.</p>
    </div>
    ${company || packageSelected || budget ? `
    <div style="background:#0c0c14;border:1px solid #1e1e32;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <p style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Your Inquiry</p>
      ${company ? `<p style="color:#e5e7eb;font-size:13px;margin-bottom:5px;">Company: ${company}</p>` : ''}
      ${packageSelected ? `<p style="color:#e5e7eb;font-size:13px;margin-bottom:5px;">Package: <strong style="color:${BRAND_GREEN};">${packageSelected}</strong></p>` : ''}
      ${budget ? `<p style="color:#e5e7eb;font-size:13px;">Budget: <strong style="color:#fff;">${budget}</strong></p>` : ''}
    </div>` : ''}
    <div style="background:#0c0c14;border:1px solid rgba(0,179,65,0.15);border-radius:10px;padding:14px 18px;margin-bottom:22px;">
      <p style="color:${BRAND_GREEN};font-size:12px;font-weight:700;margin-bottom:6px;">Our Reach</p>
      <p style="color:#9ca3af;font-size:12px;line-height:1.6;">1.2M+ monthly visitors · 68% mobile · 45% East Africa · Core age 18-34</p>
    </div>
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:10px;"><a href="https://wa.me/254789783258" class="btn">WhatsApp Us</a></td>
      <td><a href="${SITE_URL}/#/advertise" class="btn-ghost">View Ad Packages</a></td>
    </tr></table>`

  return sendEmail(to, 'Ad Inquiry Received - FlowerZFC', baseTemplate(`Thanks ${name}! Your ad inquiry is received.`, body))
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. ADMIN ALERT — New Order
// ═══════════════════════════════════════════════════════════════════════════════
export async function notifyAdminNewOrder(params: {
  orderId: string; customerName: string; customerEmail: string; customerPhone?: string
  items: Array<{ name: string; qty: number; price: number; size?: string }>
  total: number; shippingAddress?: string; paymentMethod?: string
}) {
  const { orderId, customerName, customerEmail, customerPhone, items, total, shippingAddress, paymentMethod } = params
  const itemList = items.map(i =>
    `<p style="color:#e5e7eb;font-size:13px;margin-bottom:4px;">• ${i.name}${i.size ? ` (${i.size})` : ''} x${i.qty} — <strong style="color:${BRAND_GREEN};">KES ${(i.price * i.qty).toLocaleString()}</strong></p>`
  ).join('')

  const body = `
    <div style="background:rgba(0,179,65,0.08);border:1px solid rgba(0,179,65,0.3);border-radius:10px;padding:14px 20px;margin-bottom:20px;">
      <p style="color:${BRAND_GREEN};font-weight:900;font-size:17px;">New Order — #${orderId}</p>
    </div>
    <div style="background:#0c0c14;border:1px solid #1e1e32;border-radius:10px;padding:14px 18px;margin-bottom:14px;">
      <p style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Customer</p>
      <p style="color:#fff;font-size:14px;font-weight:700;margin-bottom:3px;">${customerName}</p>
      <p style="color:#9ca3af;font-size:12px;margin-bottom:2px;"><a href="mailto:${customerEmail}" style="color:${BRAND_GREEN};">${customerEmail}</a></p>
      ${customerPhone ? `<p style="color:#9ca3af;font-size:12px;"><a href="https://wa.me/${customerPhone.replace(/\D/g,'')}" style="color:${BRAND_GREEN};">${customerPhone}</a></p>` : ''}
    </div>
    <div style="background:#0c0c14;border:1px solid #1e1e32;border-radius:10px;padding:14px 18px;margin-bottom:14px;">
      <p style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Items</p>
      ${itemList}
      <p style="color:#fff;font-size:15px;font-weight:900;margin-top:10px;padding-top:10px;border-top:1px solid #1e1e32;">Total: <span style="color:${BRAND_GREEN};">KES ${total.toLocaleString()}</span></p>
    </div>
    ${shippingAddress ? `<div style="background:#0c0c14;border:1px solid #1e1e32;border-radius:10px;padding:13px 18px;margin-bottom:14px;"><p style="color:#6b7280;font-size:10px;text-transform:uppercase;margin-bottom:6px;">Ship To</p><p style="color:#e5e7eb;font-size:13px;">${shippingAddress}</p></div>` : ''}
    ${paymentMethod ? `<div style="background:#0c0c14;border:1px solid #1e1e32;border-radius:10px;padding:13px 18px;margin-bottom:20px;"><p style="color:#6b7280;font-size:10px;text-transform:uppercase;margin-bottom:6px;">Payment</p><p style="color:${BRAND_GREEN};font-size:13px;font-weight:700;">${paymentMethod}</p></div>` : ''}
    <div style="text-align:center;"><a href="${SITE_URL}/#/admin" class="btn">Open Admin Dashboard</a></div>`

  return sendEmail(ADMIN_EMAIL, `New Order #${orderId} — KES ${total.toLocaleString()} from ${customerName}`, baseTemplate(`New order from ${customerName}`, body))
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. ADMIN ALERT — New Ad Inquiry
// ═══════════════════════════════════════════════════════════════════════════════
export async function notifyAdminAdInquiry(params: {
  name: string; email: string; phone?: string; company?: string
  packageSelected?: string; budget?: string; message?: string
}) {
  const { name, email, phone, company, packageSelected, budget, message } = params
  const body = `
    <div style="background:rgba(0,179,65,0.08);border:1px solid rgba(0,179,65,0.3);border-radius:10px;padding:14px 20px;margin-bottom:20px;">
      <p style="color:${BRAND_GREEN};font-weight:900;font-size:17px;">New Ad Inquiry</p>
    </div>
    <div style="background:#0c0c14;border:1px solid #1e1e32;border-radius:10px;padding:14px 18px;margin-bottom:14px;">
      <p style="color:#fff;font-size:14px;font-weight:700;margin-bottom:3px;">${name}</p>
      ${company ? `<p style="color:#9ca3af;font-size:12px;margin-bottom:2px;">${company}</p>` : ''}
      <p style="color:#9ca3af;font-size:12px;margin-bottom:2px;"><a href="mailto:${email}" style="color:${BRAND_GREEN};">${email}</a></p>
      ${phone ? `<p style="color:#9ca3af;font-size:12px;"><a href="https://wa.me/${phone.replace(/\D/g,'')}" style="color:${BRAND_GREEN};">${phone}</a></p>` : ''}
    </div>
    ${packageSelected ? `<div style="background:#0c0c14;border:1px solid #1e1e32;border-radius:10px;padding:12px 18px;margin-bottom:12px;"><p style="color:#6b7280;font-size:10px;text-transform:uppercase;margin-bottom:5px;">Package</p><p style="color:${BRAND_GREEN};font-size:13px;font-weight:700;">${packageSelected}</p></div>` : ''}
    ${budget ? `<div style="background:#0c0c14;border:1px solid #1e1e32;border-radius:10px;padding:12px 18px;margin-bottom:12px;"><p style="color:#6b7280;font-size:10px;text-transform:uppercase;margin-bottom:5px;">Budget</p><p style="color:#fff;font-size:13px;font-weight:700;">${budget}</p></div>` : ''}
    ${message ? `<div style="background:#0c0c14;border:1px solid #1e1e32;border-radius:10px;padding:12px 18px;margin-bottom:20px;"><p style="color:#6b7280;font-size:10px;text-transform:uppercase;margin-bottom:6px;">Message</p><p style="color:#e5e7eb;font-size:13px;line-height:1.7;">${message}</p></div>` : ''}
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:10px;"><a href="mailto:${email}" class="btn">Reply to ${name}</a></td>
      ${phone ? `<td><a href="https://wa.me/${phone.replace(/\D/g,'')}" class="btn-ghost">WhatsApp</a></td>` : ''}
    </tr></table>`

  return sendEmail(ADMIN_EMAIL, `New Ad Inquiry from ${name}${company ? ` (${company})` : ''}`, baseTemplate(`Ad inquiry from ${name}`, body), email)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. SHIPPING UPDATE
// ═══════════════════════════════════════════════════════════════════════════════
export async function sendShippingUpdate(params: {
  to: string; customerName: string; orderId: string; trackingNumber?: string
  status: 'processing' | 'shipped' | 'out_for_delivery' | 'delivered'
}) {
  const { to, customerName, orderId, trackingNumber, status } = params
  const cfgMap = {
    processing:       { e: '📦', l: 'Being Packed',       c: '#f59e0b', m: "Your order is being carefully packed and will be with G4S courier soon." },
    shipped:          { e: '🚚', l: 'Shipped!',            c: '#3b82f6', m: "Your order is on its way! G4S will deliver within 3-5 business days." },
    out_for_delivery: { e: '🏃', l: 'Out for Delivery',   c: BRAND_GREEN, m: "Your order is out for delivery today. Please be available." },
    delivered:        { e: '✅', l: 'Delivered!',          c: BRAND_GREEN, m: "Your order has been delivered. We hope you love it!" },
  }
  const cfg = cfgMap[status]
  const body = `
    <div style="text-align:center;margin-bottom:26px;">
      <div style="font-size:50px;margin-bottom:10px;">${cfg.e}</div>
      <div style="display:inline-block;background:rgba(0,179,65,0.1);border:1px solid rgba(0,179,65,0.25);border-radius:8px;padding:5px 14px;margin-bottom:12px;">
        <span style="color:${cfg.c};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">${cfg.l}</span>
      </div>
      <h1 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:8px;">Order Update, ${customerName}!</h1>
      <p style="color:#9ca3af;font-size:14px;line-height:1.7;max-width:380px;margin:0 auto;">${cfg.m}</p>
    </div>
    <div style="background:#0c0c14;border:1px solid #1e1e32;border-radius:10px;padding:14px 18px;margin-bottom:22px;text-align:center;">
      <p style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Order #</p>
      <p style="color:#fff;font-size:14px;font-weight:700;font-family:monospace;">${orderId}</p>
      ${trackingNumber ? `<p style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-top:10px;margin-bottom:4px;">G4S Tracking #</p><p style="color:${BRAND_GREEN};font-size:14px;font-weight:700;font-family:monospace;">${trackingNumber}</p>` : ''}
    </div>
    <div style="text-align:center;margin-bottom:14px;"><a href="${SITE_URL}/#/account" class="btn">Track My Order</a></div>
    <p style="color:#6b7280;font-size:12px;text-align:center;">Questions? <a href="https://wa.me/254789783258" style="color:${BRAND_GREEN};">(+254) 789 783 258</a></p>`

  return sendEmail(to, `${cfg.e} ${cfg.l} — Order #${orderId} | FlowerZFC`, baseTemplate(cfg.m, body))
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. PASSWORD RESET
// ═══════════════════════════════════════════════════════════════════════════════
export async function sendPasswordReset(params: { to: string; name: string; resetLink: string }) {
  const { to, name, resetLink } = params
  const body = `
    <div style="text-align:center;margin-bottom:26px;">
      <div style="font-size:44px;margin-bottom:10px;">🔑</div>
      <h1 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:8px;">Reset Your Password</h1>
      <p style="color:#9ca3af;font-size:14px;line-height:1.7;">Hi ${name}, we received a request to reset your FlowerZFC password.</p>
    </div>
    <div style="text-align:center;margin-bottom:24px;"><a href="${resetLink}" class="btn">Reset My Password</a></div>
    <div style="background:#0c0c14;border:1px solid #1e1e32;border-radius:10px;padding:13px 18px;">
      <p style="color:#f59e0b;font-size:12px;font-weight:700;margin-bottom:4px;">This link expires in 1 hour</p>
      <p style="color:#9ca3af;font-size:12px;">If you didn't request this, you can safely ignore this email.</p>
    </div>`

  return sendEmail(to, 'Reset Your FlowerZFC Password', baseTemplate('Reset your password — link valid for 1 hour.', body))
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. BROADCAST NEWSLETTER (Admin Broadcast Engine)
// ═══════════════════════════════════════════════════════════════════════════════
export async function sendBroadcastNewsletter(params: {
  subject: string
  bodyText: string
  bannerUrl?: string
  recipients: string[]
}): Promise<{ sent: number; failed: number }> {
  const { subject, bodyText, bannerUrl, recipients } = params
  let sent = 0
  let failed = 0

  const paragraphs = bodyText
    .split('\n')
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p style="color:#e5e7eb;font-size:14px;line-height:1.7;margin-bottom:14px;">${p}</p>`)
    .join('')

  const htmlBody = `
    ${bannerUrl ? `
    <div style="margin-bottom:24px;border-radius:12px;overflow:hidden;border:1px solid #1e1e32;">
      <img src="${bannerUrl}" alt="${subject}" style="width:100%;height:auto;display:block;max-height:260px;object-fit:cover;" />
    </div>` : ''}
    <h1 style="font-size:24px;font-weight:900;color:#fff;margin-bottom:16px;line-height:1.2;">${subject}</h1>
    <div style="margin-bottom:28px;">
      ${paragraphs}
    </div>
    <div style="text-align:center;margin-bottom:16px;">
      <a href="${SITE_URL}" class="btn">Read on FlowerZFC →</a>
    </div>`

  const fullHtml = baseTemplate(subject, htmlBody)

  // Send in batches of 5
  for (const email of recipients) {
    if (!email || !email.includes('@')) continue
    const ok = await sendEmail(email, subject, fullHtml)
    if (ok) sent++
    else failed++
  }

  return { sent, failed }
}

export async function sendTestNewsletter(params: {
  subject: string
  bodyText: string
  bannerUrl?: string
  testEmail?: string
}): Promise<boolean> {
  const { subject, bodyText, bannerUrl, testEmail = ADMIN_EMAIL } = params
  const paragraphs = bodyText
    .split('\n')
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p style="color:#e5e7eb;font-size:14px;line-height:1.7;margin-bottom:14px;">${p}</p>`)
    .join('')

  const htmlBody = `
    <div style="display:inline-block;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:6px;padding:4px 10px;margin-bottom:12px;">
      <span style="color:#f59e0b;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">🧪 TEST PREVIEW</span>
    </div>
    ${bannerUrl ? `
    <div style="margin-bottom:24px;border-radius:12px;overflow:hidden;border:1px solid #1e1e32;">
      <img src="${bannerUrl}" alt="${subject}" style="width:100%;height:auto;display:block;max-height:260px;object-fit:cover;" />
    </div>` : ''}
    <h1 style="font-size:24px;font-weight:900;color:#fff;margin-bottom:16px;line-height:1.2;">${subject}</h1>
    <div style="margin-bottom:28px;">
      ${paragraphs}
    </div>
    <div style="text-align:center;">
      <a href="${SITE_URL}" class="btn">Read on FlowerZFC →</a>
    </div>`

  return sendEmail(testEmail, `[TEST] ${subject}`, baseTemplate(`Test: ${subject}`, htmlBody))
}

