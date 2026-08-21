/**
 * FlowerZFC Email Engine — Comprehensive Suite Powered by Plunk
 * Sender: noreply@djflowerz.co.ke  |  Admin: support@djflowerz.co.ke
 * Design: Dark theme (#0a0a14, #131320), #00b341 emerald accent, #f36c45 live accent, #c9f35a lime accent.
 */

const PLUNK_API = 'https://next-api.useplunk.com/v1/send'
const PLUNK_SECRET = 'sk_ed5a930204333ba7cfb101808546e622b5111881aaf012af187303b1a5d14a08'
const FROM_EMAIL = 'noreply@djflowerz.co.ke'
const FROM_NAME = 'FlowerZFC'
const BRAND_GREEN = '#00b341'
const BRAND_LIME = '#c9f35a'
const BRAND_ORANGE = '#f36c45'
const SITE_URL = 'https://www.djflowerz.co.ke'
const ADMIN_EMAIL = 'support@djflowerz.co.ke'

// ─── Base email wrapper ────────────────────────────────────────────────────────
function baseTemplate(preheader: string, body: string): string {
  const year = new Date().getFullYear()
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#0a0a14;font-family:Arial,sans-serif;color:#fff;-webkit-font-smoothing:antialiased;}
a{color:${BRAND_GREEN};text-decoration:none;}
.btn{display:inline-block;padding:13px 30px;background:${BRAND_GREEN};color:#fff!important;border-radius:10px;font-weight:900;font-size:14px;text-decoration:none;letter-spacing:0.5px;}
.btn-orange{display:inline-block;padding:13px 30px;background:${BRAND_ORANGE};color:#fff!important;border-radius:10px;font-weight:900;font-size:14px;text-decoration:none;}
.btn-ghost{display:inline-block;padding:11px 26px;border:2px solid ${BRAND_GREEN};color:${BRAND_GREEN}!important;border-radius:10px;font-weight:700;font-size:13px;text-decoration:none;}
.card{background:#0c0c14;border:1px solid #1e1e32;border-radius:12px;padding:18px;margin-bottom:20px;}
</style>
</head>
<body style="background:#0a0a14;margin:0;padding:0;">
<span style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</span>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a14;padding:28px 12px;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">
  <tr><td style="background:#0d0d1a;border-radius:14px 14px 0 0;padding:22px 32px;border-bottom:2px solid ${BRAND_GREEN};">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td><span style="font-size:22px;font-weight:900;color:#fff;letter-spacing:0.5px;">⚽ <span style="color:${BRAND_GREEN};">FlowerZ</span>FC</span></td>
      <td align="right"><span style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:2px;font-weight:bold;">Global Football &amp; Media</span></td>
    </tr></table>
  </td></tr>
  <tr><td style="background:#131320;padding:32px 30px;border-left:1px solid #1e1e32;border-right:1px solid #1e1e32;">${body}</td></tr>
  <tr><td style="background:#0d0d1a;border-radius:0 0 14px 14px;padding:22px 32px;border:1px solid #1e1e32;border-top:none;">
    <p style="font-size:11px;color:#9ca3af;margin-bottom:8px;">
      <a href="${SITE_URL}" style="color:${BRAND_GREEN};font-weight:bold;">djflowerz.co.ke</a> &nbsp;·&nbsp;
      <a href="${SITE_URL}/#/shop" style="color:${BRAND_GREEN};">Shop</a> &nbsp;·&nbsp;
      <a href="${SITE_URL}/#/news" style="color:${BRAND_GREEN};">News</a> &nbsp;·&nbsp;
      <a href="${SITE_URL}/#/scores" style="color:${BRAND_GREEN};">Live Scores</a> &nbsp;·&nbsp;
      <a href="${SITE_URL}/#/mixes" style="color:${BRAND_GREEN};">Mixes</a>
    </p>
    <p style="font-size:10px;color:#6b7280;line-height:1.5;">📞 (+254) 712 293 303 &nbsp;·&nbsp; 💬 WhatsApp: (+254) 789 783 258 &nbsp;·&nbsp; ✉️ support@djflowerz.co.ke</p>
    <p style="font-size:10px;color:#4b5563;margin-top:8px;">© ${year} FlowerZFC. All rights reserved. Nairobi, Kenya.</p>
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
      headers: { 'Content-Type': 'application/json' },
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
    const res = await fetch(PLUNK_API, {
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
// 1. ACCOUNT & AUTHENTICATION
// ═══════════════════════════════════════════════════════════════════════════════

export async function sendWelcomeEmail(params: { to: string; name?: string }) {
  const firstName = params.name || 'Football Fan'
  const body = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:44px;margin-bottom:10px;">⚽</div>
      <h1 style="font-size:24px;font-weight:900;color:#fff;margin-bottom:8px;">Welcome to FlowerZFC!</h1>
      <p style="color:#9ca3af;font-size:14px;line-height:1.6;">Hey ${firstName}, welcome to FlowerZFC — Global Football &amp; Media.</p>
    </div>
    <div class="card">
      <p style="color:#e5e7eb;font-size:13px;line-height:1.7;margin-bottom:12px;">Your account is now ready, and you're officially part of the FlowerZFC community. You'll be able to stay connected with:</p>
      <div style="font-size:13px;color:#d1d5db;line-height:2;">
        <div>⚽ Football news &amp; updates</div>
        <div>🔴 Live scores &amp; match alerts</div>
        <div>🏆 Match previews &amp; predictions</div>
        <div>💰 Transfer news &amp; rumours</div>
        <div>🎵 DJ Flowerz mixes &amp; exclusive content</div>
        <div>🛍️ Store releases &amp; special offers</div>
      </div>
    </div>
    <div style="text-align:center;margin:28px 0 16px 0;">
      <a href="${SITE_URL}" class="btn">GO TO FLOWERZFC →</a>
    </div>
    <p style="color:#6b7280;font-size:12px;text-align:center;">We're glad to have you with us.<br/><strong>FlowerZFC</strong> · Football • Media • Entertainment</p>`

  return sendEmail(params.to, 'Welcome to FlowerZFC! ⚽', baseTemplate('Welcome to FlowerZFC — your football home.', body))
}

export async function sendVerifyEmail(params: { to: string; name?: string; verifyLink: string; expiryTime?: string }) {
  const firstName = params.name || 'there'
  const expiry = params.expiryTime || '24 hours'
  const body = `
    <div style="text-align:center;margin-bottom:26px;">
      <div style="font-size:44px;margin-bottom:10px;">✉️</div>
      <h1 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:8px;">Verify Your Email Address</h1>
      <p style="color:#9ca3af;font-size:14px;line-height:1.6;">Hey ${firstName}, thanks for joining FlowerZFC. Please verify your email address to activate your account and keep your account secure.</p>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${params.verifyLink}" class="btn">VERIFY MY EMAIL →</a>
    </div>
    <div class="card">
      <p style="color:#f59e0b;font-size:12px;font-weight:bold;margin-bottom:4px;">⏱️ Link expires in ${expiry}</p>
      <p style="color:#9ca3af;font-size:12px;">If you didn't create this account, you can safely ignore this email.</p>
    </div>`

  return sendEmail(params.to, 'Verify Your FlowerZFC Email Address', baseTemplate('Verify your email to activate your FlowerZFC account.', body))
}

export async function sendPasswordReset(params: { to: string; name?: string; resetLink: string; expiryTime?: string }) {
  const firstName = params.name || 'there'
  const expiry = params.expiryTime || '1 hour'
  const body = `
    <div style="text-align:center;margin-bottom:26px;">
      <div style="font-size:44px;margin-bottom:10px;">🔑</div>
      <h1 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:8px;">Reset Your Password</h1>
      <p style="color:#9ca3af;font-size:14px;line-height:1.6;">Hey ${firstName}, we received a request to reset the password for your FlowerZFC account.</p>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${params.resetLink}" class="btn">RESET MY PASSWORD →</a>
    </div>
    <div class="card">
      <p style="color:#f59e0b;font-size:12px;font-weight:bold;margin-bottom:4px;">⏱️ This link expires in ${expiry}</p>
      <p style="color:#9ca3af;font-size:12px;">If you didn't request a password reset, no action is required. Your password will remain unchanged.</p>
    </div>`

  return sendEmail(params.to, 'Reset Your FlowerZFC Password', baseTemplate('Reset your password — link valid for 1 hour.', body))
}

export async function sendPasswordChanged(params: { to: string; name?: string; date: string; time: string; device?: string }) {
  const firstName = params.name || 'there'
  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:40px;margin-bottom:8px;">✅</div>
      <h1 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:6px;">Password Changed Successfully</h1>
      <p style="color:#9ca3af;font-size:13px;">Hey ${firstName}, your FlowerZFC account password was successfully changed.</p>
    </div>
    <div class="card">
      <div style="font-size:13px;color:#d1d5db;line-height:1.9;">
        <div><strong>Date:</strong> ${params.date}</div>
        <div><strong>Time:</strong> ${params.time}</div>
        <div><strong>Device:</strong> ${params.device || 'Web Browser'}</div>
      </div>
    </div>
    <p style="color:#9ca3af;font-size:12px;margin-bottom:16px;">If you made this change, no further action is needed. If you didn't change your password, please secure your account immediately.</p>
    <div style="text-align:center;">
      <a href="${SITE_URL}/#/account/settings" class="btn-orange">SECURE MY ACCOUNT →</a>
    </div>`

  return sendEmail(params.to, 'Your FlowerZFC Password Was Changed', baseTemplate('Security notice: Your password was updated.', body))
}

export async function sendNewLoginDetected(params: { to: string; name?: string; date: string; time: string; device?: string; location?: string }) {
  const firstName = params.name || 'there'
  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:40px;margin-bottom:8px;">🔐</div>
      <h1 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:6px;">New Login Detected</h1>
      <p style="color:#9ca3af;font-size:13px;">Hey ${firstName}, we detected a new login to your FlowerZFC account.</p>
    </div>
    <div class="card">
      <div style="font-size:13px;color:#d1d5db;line-height:1.9;">
        <div><strong>Date:</strong> ${params.date}</div>
        <div><strong>Time:</strong> ${params.time}</div>
        <div><strong>Device:</strong> ${params.device || 'Browser'}</div>
        <div><strong>Location:</strong> ${params.location || 'Kenya'}</div>
      </div>
    </div>
    <p style="color:#9ca3af;font-size:12px;margin-bottom:16px;">If this was you, you can ignore this email. If you don't recognize this activity, secure your account immediately.</p>
    <div style="text-align:center;">
      <a href="${SITE_URL}/#/account/settings" class="btn-orange">SECURE MY ACCOUNT →</a>
    </div>`

  return sendEmail(params.to, 'New Login Detected 🔐 | FlowerZFC Security', baseTemplate('New login detected on your account.', body))
}

export async function sendEmailAddressChanged(params: { to: string; name?: string; newEmail: string }) {
  const firstName = params.name || 'there'
  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:40px;margin-bottom:8px;">📧</div>
      <h1 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:6px;">Email Address Changed</h1>
      <p style="color:#9ca3af;font-size:13px;">Hey ${firstName}, the email address associated with your FlowerZFC account has been changed.</p>
    </div>
    <div class="card">
      <p style="color:#9ca3af;font-size:12px;margin-bottom:4px;">Your new email address is:</p>
      <p style="color:#fff;font-size:15px;font-weight:bold;">${params.newEmail}</p>
    </div>
    <p style="color:#9ca3af;font-size:12px;margin-bottom:16px;">If you made this change, no further action is required. If you didn't authorize this change, please contact FlowerZFC Support immediately.</p>
    <div style="text-align:center;">
      <a href="${SITE_URL}/#/contact" class="btn">CONTACT SUPPORT →</a>
    </div>`

  return sendEmail(params.to, 'Your FlowerZFC Email Address Was Changed', baseTemplate('Security notice: Email address updated.', body))
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. NEWSLETTER & FOOTBALL ALERTS
// ═══════════════════════════════════════════════════════════════════════════════

export async function sendNewsletterWelcome(params: { to: string; name?: string }) {
  const firstName = params.name || 'Football Fan'
  const body = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:44px;margin-bottom:10px;">🎉</div>
      <h1 style="font-size:24px;font-weight:900;color:#fff;margin-bottom:8px;">You're officially subscribed!</h1>
      <p style="color:#9ca3af;font-size:14px;line-height:1.6;">Hey ${firstName}, welcome to the FlowerZFC Newsletter.</p>
    </div>
    <div class="card">
      <p style="color:#e5e7eb;font-size:13px;line-height:1.7;margin-bottom:12px;">From now on, you'll get the latest football stories, match updates, transfer news, predictions, and exclusive FlowerZFC content:</p>
      <div style="font-size:13px;color:#d1d5db;line-height:2;">
        <div>🔴 Live match alerts</div>
        <div>⚽ Match previews &amp; predictions</div>
        <div>💰 Transfer news &amp; rumours</div>
        <div>🏆 Football stories &amp; updates</div>
        <div>🎵 New DJ Flowerz mixes</div>
        <div>🛍️ Store deals &amp; exclusive launches</div>
      </div>
    </div>
    <div style="text-align:center;margin:28px 0 16px 0;">
      <a href="${SITE_URL}" class="btn">EXPLORE FLOWERZFC →</a>
    </div>
    <p style="color:#6b7280;font-size:12px;text-align:center;">Welcome to the family.<br/><strong>FlowerZFC</strong> · Football • Media • Entertainment</p>`

  return sendEmail(params.to, "You're officially subscribed! 🎉 | FlowerZFC", baseTemplate('Welcome to the FlowerZFC Newsletter family.', body))
}

export async function sendWeeklyDigest(params: {
  to: string
  name?: string
  stories: Array<{ title: string; summary: string }>
  matches: Array<{ match: string; time: string }>
}) {
  const firstName = params.name || 'Football Fan'
  const storyList = (params.stories || []).map(s => `
    <div style="margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid #1e1e32;">
      <h3 style="font-size:15px;font-weight:bold;color:#fff;margin-bottom:4px;">${s.title}</h3>
      <p style="font-size:12px;color:#9ca3af;line-height:1.5;">${s.summary}</p>
    </div>`).join('')

  const matchList = (params.matches || []).map(m => `
    <div style="font-size:13px;color:#d1d5db;margin-bottom:6px;">⚽ <strong>${m.match}</strong> — <span style="color:${BRAND_GREEN};">${m.time}</span></div>`).join('')

  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <h1 style="font-size:24px;font-weight:900;color:#fff;margin-bottom:6px;">⚽ This Week in Football</h1>
      <p style="color:#9ca3af;font-size:13px;">Hey ${firstName}, here are the biggest football stories you need to know this week.</p>
    </div>
    <div class="card">
      <div style="font-size:11px;font-weight:900;color:${BRAND_GREEN};text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">🔥 Top Stories</div>
      ${storyList}
    </div>
    <div class="card">
      <div style="font-size:11px;font-weight:900;color:${BRAND_ORANGE};text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">📅 Coming Up</div>
      ${matchList}
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${SITE_URL}/#/news" class="btn">READ MORE ON FLOWERZFC →</a>
    </div>`

  return sendEmail(params.to, '⚽ This Week in Football | FlowerZFC Weekly', baseTemplate('Top stories, fixture schedules, and tactical previews.', body))
}

export async function sendMatchAlert(params: {
  to: string
  homeTeam: string
  awayTeam: string
  competition: string
  kickoffTime: string
  venue: string
}) {
  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <span style="background:${BRAND_ORANGE};color:#fff;padding:4px 10px;border-radius:6px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1px;">🔴 MATCH ALERT</span>
      <h1 style="font-size:26px;font-weight:900;color:#fff;margin:12px 0 6px 0;">${params.homeTeam} vs ${params.awayTeam}</h1>
      <p style="color:#9ca3af;font-size:13px;">The match is about to begin.</p>
    </div>
    <div class="card">
      <div style="font-size:13px;color:#d1d5db;line-height:1.9;">
        <div><strong>Competition:</strong> ${params.competition}</div>
        <div><strong>Kickoff:</strong> ${params.kickoffTime}</div>
        <div><strong>Venue:</strong> ${params.venue}</div>
      </div>
      <div style="margin-top:14px;padding-top:12px;border-top:1px solid #1e1e32;text-align:center;font-size:14px;font-weight:bold;color:#fff;">
        ${params.homeTeam} 🏠 &nbsp;vs&nbsp; ${params.awayTeam} ✈️
      </div>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${SITE_URL}/#/scores" class="btn">VIEW LIVE SCORES →</a>
    </div>`

  return sendEmail(params.to, `🔴 Match Alert: ${params.homeTeam} vs ${params.awayTeam}`, baseTemplate(`Kickoff alert: ${params.homeTeam} vs ${params.awayTeam}`, body))
}

export async function sendFullTimeSummary(params: {
  to: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  competition: string
  venue: string
  matchSummary: string
  keyMoments?: string
}) {
  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <span style="background:#20221f;border:1px solid #3e413c;color:${BRAND_LIME};padding:4px 10px;border-radius:6px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1px;">⚽ FULL TIME</span>
      <h1 style="font-size:28px;font-weight:900;color:#fff;margin:12px 0 4px 0;">${params.homeTeam} ${params.homeScore} – ${params.awayScore} ${params.awayTeam}</h1>
      <p style="color:#9ca3af;font-size:12px;">${params.competition} · ${params.venue}</p>
    </div>
    <div class="card">
      <div style="font-size:11px;font-weight:900;color:${BRAND_GREEN};text-transform:uppercase;margin-bottom:8px;">Match Summary</div>
      <p style="font-size:13px;color:#d1d5db;line-height:1.6;margin-bottom:12px;">${params.matchSummary}</p>
      ${params.keyMoments ? `
      <div style="font-size:11px;font-weight:900;color:${BRAND_ORANGE};text-transform:uppercase;margin:12px 0 6px 0;">Key Moments</div>
      <p style="font-size:12px;color:#9ca3af;line-height:1.5;">${params.keyMoments}</p>` : ''}
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${SITE_URL}/#/scores" class="btn">VIEW MATCH DETAILS →</a>
    </div>`

  return sendEmail(params.to, `⚽ Full Time: ${params.homeTeam} ${params.homeScore}–${params.awayScore} ${params.awayTeam}`, baseTemplate(`Full time result and match summary.`, body))
}

export async function sendTransferAlert(params: {
  to: string
  playerName: string
  oldClub: string
  newClub: string
  transferStatus: string
  transferSummary: string
}) {
  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <span style="background:${BRAND_GREEN};color:#000;padding:4px 10px;border-radius:6px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1px;">🚨 TRANSFER ALERT</span>
      <h1 style="font-size:26px;font-weight:900;color:#fff;margin:12px 0 6px 0;">${params.playerName}</h1>
      <p style="color:#9ca3af;font-size:13px;">A major transfer update has landed.</p>
    </div>
    <div class="card">
      <div style="font-size:13px;color:#d1d5db;line-height:1.9;">
        <div><strong>Player:</strong> ${params.playerName}</div>
        <div><strong>From:</strong> ${params.oldClub}</div>
        <div><strong>To:</strong> ${params.newClub}</div>
        <div><strong>Status:</strong> <span style="color:${BRAND_GREEN};font-weight:bold;">${params.transferStatus}</span></div>
      </div>
      <div style="margin-top:14px;padding-top:12px;border-top:1px solid #1e1e32;">
        <p style="font-size:13px;color:#e5e7eb;line-height:1.6;">${params.transferSummary}</p>
      </div>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${SITE_URL}/#/transfers" class="btn">READ THE FULL STORY →</a>
    </div>`

  return sendEmail(params.to, `🚨 Transfer Alert: ${params.playerName} to ${params.newClub}`, baseTemplate(`Major transfer update: ${params.playerName}`, body))
}

export async function sendMatchPreview(params: {
  to: string
  homeTeam: string
  awayTeam: string
  competition: string
  date: string
  kickoffTime: string
  venue: string
  prediction: string
  confidence: number
  analysis: string
}) {
  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <span style="background:#20221f;border:1px solid #3e413c;color:${BRAND_LIME};padding:4px 10px;border-radius:6px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1px;">🔮 MATCH PREVIEW</span>
      <h1 style="font-size:26px;font-weight:900;color:#fff;margin:12px 0 6px 0;">${params.homeTeam} vs ${params.awayTeam}</h1>
      <p style="color:#9ca3af;font-size:13px;">One match. Two teams. Who takes the win?</p>
    </div>
    <div class="card">
      <div style="font-size:11px;font-weight:900;color:${BRAND_GREEN};text-transform:uppercase;margin-bottom:8px;">📊 Match Information</div>
      <div style="font-size:12px;color:#d1d5db;line-height:1.8;margin-bottom:12px;">
        <div><strong>Competition:</strong> ${params.competition}</div>
        <div><strong>Date:</strong> ${params.date} &nbsp;·&nbsp; <strong>Kickoff:</strong> ${params.kickoffTime}</div>
        <div><strong>Venue:</strong> ${params.venue}</div>
      </div>
      <div style="background:#131320;border:1px solid #1e1e32;border-radius:8px;padding:12px;margin-top:10px;">
        <div style="font-size:11px;font-weight:900;color:${BRAND_ORANGE};text-transform:uppercase;margin-bottom:4px;">🔥 Our Prediction (${params.confidence}% Confidence)</div>
        <p style="font-size:14px;font-weight:bold;color:#fff;margin-bottom:6px;">${params.prediction}</p>
        <p style="font-size:12px;color:#9ca3af;line-height:1.5;">${params.analysis}</p>
      </div>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${SITE_URL}/#/scores" class="btn">VIEW FULL PREVIEW →</a>
    </div>`

  return sendEmail(params.to, `🔮 Match Preview: ${params.homeTeam} vs ${params.awayTeam}`, baseTemplate(`Tactical preview and AI prediction for ${params.homeTeam} vs ${params.awayTeam}`, body))
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. STORE & ORDERS
// ═══════════════════════════════════════════════════════════════════════════════

export async function sendOrderConfirmation(params: {
  to: string
  name: string
  orderId: string
  items: Array<{ name: string; size?: string; qty: number; price: number }>
  total: number
  currency?: string
  paymentMethod?: string
  shippingAddress?: string
}) {
  const { to, name, orderId, items, total, currency = 'KES', paymentMethod = 'Paystack / Card', shippingAddress } = params
  const rows = items.map(i => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #1e1e32;color:#fff;font-size:13px;">
        <strong>${i.name}</strong>${i.size ? ` <span style="color:#9ca3af;">(${i.size})</span>` : ''}
      </td>
      <td align="center" style="padding:10px 0;border-bottom:1px solid #1e1e32;color:#9ca3af;font-size:13px;">×${i.qty}</td>
      <td align="right" style="padding:10px 0;border-bottom:1px solid #1e1e32;color:${BRAND_GREEN};font-weight:bold;font-size:13px;">${currency} ${(i.price * i.qty).toLocaleString()}</td>
    </tr>`).join('')

  const body = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:44px;margin-bottom:10px;">🎉</div>
      <h1 style="font-size:24px;font-weight:900;color:#fff;margin-bottom:8px;">Order Confirmed!</h1>
      <p style="color:#9ca3af;font-size:14px;">Thanks for shopping with FlowerZFC, ${name}. Your order is now being processed.</p>
    </div>
    <div class="card">
      <div style="display:flex;justify-content:space-between;margin-bottom:14px;font-size:13px;color:#9ca3af;">
        <span>Order <strong>#${orderId}</strong></span>
        <span>Payment: <strong>${paymentMethod}</strong></span>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
        <tr>
          <td style="font-size:15px;font-weight:900;color:#fff;">Total</td>
          <td align="right" style="font-size:18px;font-weight:900;color:${BRAND_GREEN};">${currency} ${total.toLocaleString()}</td>
        </tr>
      </table>
    </div>
    ${shippingAddress ? `
    <div class="card">
      <p style="font-size:11px;font-weight:900;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Delivery Address (G4S Kenya Tracked)</p>
      <p style="font-size:13px;color:#fff;">${shippingAddress}</p>
    </div>` : ''}
    <div style="text-align:center;margin:28px 0 16px 0;">
      <a href="${SITE_URL}/#/account/orders" class="btn">VIEW MY ORDER →</a>
    </div>
    <p style="color:#6b7280;font-size:12px;text-align:center;">We'll send you another email when your order is on its way.</p>`

  return sendEmail(to, `Order Confirmed #${orderId} 🎉 | FlowerZFC`, baseTemplate(`Your order #${orderId} is confirmed. Total: ${currency} ${total.toLocaleString()}`, body))
}

export async function sendPaymentReceived(params: {
  to: string
  name?: string
  orderId: string
  amount: number
  currency?: string
  paymentMethod?: string
  transactionId?: string
}) {
  const firstName = params.name || 'there'
  const cur = params.currency || 'KES'
  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:40px;margin-bottom:8px;">✅</div>
      <h1 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:6px;">Payment Received</h1>
      <p style="color:#9ca3af;font-size:13px;">Hey ${firstName}, your payment has been successfully received.</p>
    </div>
    <div class="card">
      <div style="font-size:13px;color:#d1d5db;line-height:1.9;">
        <div><strong>Order:</strong> #${params.orderId}</div>
        <div><strong>Amount:</strong> <span style="color:${BRAND_GREEN};font-weight:bold;">${cur} ${params.amount.toLocaleString()}</span></div>
        <div><strong>Payment Method:</strong> ${params.paymentMethod || 'Paystack'}</div>
        <div><strong>Transaction ID:</strong> ${params.transactionId || params.orderId}</div>
        <div><strong>Date:</strong> ${new Date().toLocaleDateString('en-GB')}</div>
      </div>
    </div>
    <p style="color:#9ca3af;font-size:12px;margin-bottom:16px;">Your order is now being processed.</p>
    <div style="text-align:center;">
      <a href="${SITE_URL}/#/account/orders" class="btn">VIEW ORDER →</a>
    </div>`

  return sendEmail(params.to, `Payment Received ✅ — Order #${params.orderId}`, baseTemplate(`Payment of ${cur} ${params.amount} received.`, body))
}

export async function sendPaymentFailed(params: {
  to: string
  name?: string
  orderId: string
  amount: number
  currency?: string
}) {
  const firstName = params.name || 'there'
  const cur = params.currency || 'KES'
  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:40px;margin-bottom:8px;">⚠️</div>
      <h1 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:6px;">Payment Failed</h1>
      <p style="color:#9ca3af;font-size:13px;">Hey ${firstName}, unfortunately, we couldn't complete the payment for your FlowerZFC order.</p>
    </div>
    <div class="card">
      <div style="font-size:13px;color:#d1d5db;line-height:1.9;">
        <div><strong>Order:</strong> #${params.orderId}</div>
        <div><strong>Amount:</strong> ${cur} ${params.amount.toLocaleString()}</div>
      </div>
    </div>
    <div style="text-align:center;margin:24px 0 12px 0;">
      <a href="${SITE_URL}/#/checkout" class="btn-orange">TRY PAYMENT AGAIN →</a>
    </div>
    <div style="text-align:center;">
      <a href="${SITE_URL}/#/contact" class="btn-ghost">CONTACT SUPPORT →</a>
    </div>`

  return sendEmail(params.to, `Payment Failed ⚠️ — Order #${params.orderId}`, baseTemplate(`Payment could not be completed for #${params.orderId}.`, body))
}

export async function sendOrderPrepared(params: {
  to: string
  name?: string
  orderId: string
  total: number
  currency?: string
  itemsSummary: string
}) {
  const firstName = params.name || 'there'
  const cur = params.currency || 'KES'
  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:40px;margin-bottom:8px;">📦</div>
      <h1 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:6px;">Your Order Is Being Prepared</h1>
      <p style="color:#9ca3af;font-size:13px;">Hey ${firstName}, good news — your FlowerZFC order #${params.orderId} is now being packaged.</p>
    </div>
    <div class="card">
      <p style="font-size:13px;color:#fff;margin-bottom:6px;">${params.itemsSummary}</p>
      <p style="font-size:14px;font-weight:bold;color:${BRAND_GREEN};">Total: ${cur} ${params.total.toLocaleString()}</p>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${SITE_URL}/#/account/orders" class="btn">TRACK MY ORDER →</a>
    </div>`

  return sendEmail(params.to, `Your Order #${params.orderId} Is Being Prepared 📦`, baseTemplate(`Order #${params.orderId} is now being prepared for shipping.`, body))
}

export async function sendShippingUpdate(params: {
  to: string
  name: string
  orderId: string
  status: 'Processing' | 'Shipped' | 'Fulfilled'
  trackingCode?: string
  courier?: string
  deliveryDate?: string
}) {
  const { to, name, orderId, status, trackingCode, courier = 'G4S Kenya Tracked', deliveryDate } = params
  const body = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:44px;margin-bottom:10px;">🚚</div>
      <h1 style="font-size:24px;font-weight:900;color:#fff;margin-bottom:8px;">Your Order Is On The Way!</h1>
      <p style="color:#9ca3af;font-size:14px;">Hey ${name}, your FlowerZFC order #${orderId} has shipped.</p>
    </div>
    <div class="card">
      <div style="font-size:13px;color:#d1d5db;line-height:1.9;">
        <div><strong>Courier:</strong> ${courier}</div>
        <div><strong>Tracking Number:</strong> <span style="font-family:monospace;color:${BRAND_GREEN};font-weight:bold;">${trackingCode || orderId}</span></div>
        <div><strong>Estimated Delivery:</strong> ${deliveryDate || '2-3 Business Days'}</div>
      </div>
    </div>
    <div style="text-align:center;margin:28px 0 16px 0;">
      <a href="${SITE_URL}/#/account/orders" class="btn">TRACK MY PACKAGE →</a>
    </div>`

  return sendEmail(to, `Your Order #${orderId} Has Shipped! 🚚 | FlowerZFC`, baseTemplate(`Order #${orderId} is on the way via ${courier}.`, body))
}

export async function sendOrderDelivered(params: {
  to: string
  name?: string
  orderId: string
}) {
  const firstName = params.name || 'there'
  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:40px;margin-bottom:8px;">🎉</div>
      <h1 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:6px;">Order Delivered</h1>
      <p style="color:#9ca3af;font-size:13px;">Hey ${firstName}, your FlowerZFC order #${params.orderId} has been delivered. We hope you enjoy your purchase!</p>
    </div>
    <div class="card" style="text-align:center;">
      <p style="font-size:14px;font-weight:bold;color:#fff;margin-bottom:4px;">We'd love to hear from you</p>
      <p style="font-size:12px;color:#9ca3af;">How was your experience with your new gear?</p>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${SITE_URL}/#/account/orders" class="btn">LEAVE A REVIEW →</a>
    </div>`

  return sendEmail(params.to, `Order #${params.orderId} Delivered 🎉 | FlowerZFC`, baseTemplate(`Order #${params.orderId} was delivered successfully.`, body))
}

export async function sendOrderCancelled(params: {
  to: string
  name?: string
  orderId: string
  total: number
  currency?: string
  reason?: string
}) {
  const firstName = params.name || 'there'
  const cur = params.currency || 'KES'
  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:40px;margin-bottom:8px;">🚫</div>
      <h1 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:6px;">Order Cancelled</h1>
      <p style="color:#9ca3af;font-size:13px;">Hey ${firstName}, your FlowerZFC order #${params.orderId} has been cancelled.</p>
    </div>
    <div class="card">
      <div style="font-size:13px;color:#d1d5db;line-height:1.8;">
        <div><strong>Order Total:</strong> ${cur} ${params.total.toLocaleString()}</div>
        <div><strong>Reason:</strong> ${params.reason || 'Customer request / Out of stock'}</div>
      </div>
      <p style="font-size:11px;color:#9ca3af;margin-top:10px;">If a refund is applicable, we'll process it according to our refund policy.</p>
    </div>
    <div style="text-align:center;">
      <a href="${SITE_URL}/#/contact" class="btn-ghost">CONTACT SUPPORT →</a>
    </div>`

  return sendEmail(params.to, `Order #${params.orderId} Cancelled | FlowerZFC`, baseTemplate(`Order #${params.orderId} cancellation update.`, body))
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. DIGITAL PRODUCTS & DOWNLOADS
// ═══════════════════════════════════════════════════════════════════════════════

export async function sendDownloadReady(params: {
  to: string
  name?: string
  productName: string
  orderId: string
  downloadUrl: string
  expiryDate?: string
  amount: number
  currency?: string
}) {
  const firstName = params.name || 'there'
  const cur = params.currency || 'KES'
  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:40px;margin-bottom:8px;">🎧</div>
      <h1 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:6px;">Your Download Is Ready</h1>
      <p style="color:#9ca3af;font-size:13px;">Hey ${firstName}, your purchase is ready for instant download.</p>
    </div>
    <div class="card">
      <h3 style="font-size:16px;font-weight:bold;color:#fff;margin-bottom:6px;">${params.productName}</h3>
      <div style="font-size:12px;color:#9ca3af;line-height:1.8;">
        <div>Order: #${params.orderId}</div>
        <div>Purchased: ${new Date().toLocaleDateString('en-GB')}</div>
        <div>Amount: ${cur} ${params.amount.toLocaleString()}</div>
        ${params.expiryDate ? `<div>Link expires: ${params.expiryDate}</div>` : ''}
      </div>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${params.downloadUrl}" class="btn">DOWNLOAD NOW →</a>
    </div>`

  return sendEmail(params.to, `Your Download Is Ready 🎧 — ${params.productName}`, baseTemplate(`Download link for ${params.productName}`, body))
}

export async function sendDownloadExpiringSoon(params: {
  to: string
  name?: string
  productName: string
  downloadUrl: string
  expiryDate: string
}) {
  const firstName = params.name || 'there'
  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:40px;margin-bottom:8px;">⏳</div>
      <h1 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:6px;">Download Link Expires Soon</h1>
      <p style="color:#9ca3af;font-size:13px;">Hey ${firstName}, your download link for ${params.productName} will expire soon.</p>
    </div>
    <div class="card">
      <p style="font-size:13px;color:#f59e0b;font-weight:bold;margin-bottom:4px;">Expires: ${params.expiryDate}</p>
      <p style="font-size:12px;color:#9ca3af;">Make sure you download your purchase before the link expires.</p>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${params.downloadUrl}" class="btn">DOWNLOAD NOW →</a>
    </div>`

  return sendEmail(params.to, `Your Download Link Expires Soon ⏳ — ${params.productName}`, baseTemplate(`Download link expiring for ${params.productName}`, body))
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. DJ MIXES & MUSIC CONTENT
// ═══════════════════════════════════════════════════════════════════════════════

export async function sendNewMixAlert(params: {
  to: string
  name?: string
  mixTitle: string
  genre?: string
  duration?: string
  episode?: string
  mixUrl?: string
}) {
  const firstName = params.name || 'there'
  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <span style="background:${BRAND_GREEN};color:#000;padding:4px 10px;border-radius:6px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1px;">🔥 NEW DJ FLOWERZ MIX</span>
      <h1 style="font-size:24px;font-weight:900;color:#fff;margin:12px 0 6px 0;">${params.mixTitle}</h1>
      <p style="color:#9ca3af;font-size:13px;">Hey ${firstName}, a brand-new mix has landed.</p>
    </div>
    <div class="card">
      <div style="font-size:13px;color:#d1d5db;line-height:1.9;">
        <div>🎵 <strong>DJ:</strong> DJ Flowerz</div>
        <div>🔥 <strong>Genre:</strong> ${params.genre || 'Afrobeats & Amapiano'}</div>
        <div>⏱️ <strong>Duration:</strong> ${params.duration || '60 mins'}</div>
        ${params.episode ? `<div>📀 <strong>Episode:</strong> ${params.episode}</div>` : ''}
      </div>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${params.mixUrl || `${SITE_URL}/#/mixes`}" class="btn">LISTEN NOW →</a>
    </div>`

  return sendEmail(params.to, `🔥 New DJ Flowerz Mix Is Out Now! — ${params.mixTitle}`, baseTemplate(`New high-energy mix drop: ${params.mixTitle}`, body))
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. REFUNDS
// ═══════════════════════════════════════════════════════════════════════════════

export async function sendRefundInitiated(params: {
  to: string
  name?: string
  orderId: string
  refundAmount: number
  currency?: string
  paymentMethod?: string
}) {
  const firstName = params.name || 'there'
  const cur = params.currency || 'KES'
  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:40px;margin-bottom:8px;">💰</div>
      <h1 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:6px;">Refund Initiated</h1>
      <p style="color:#9ca3af;font-size:13px;">Hey ${firstName}, we've initiated your refund for order #${params.orderId}.</p>
    </div>
    <div class="card">
      <div style="font-size:13px;color:#d1d5db;line-height:1.8;">
        <div><strong>Refund Amount:</strong> ${cur} ${params.refundAmount.toLocaleString()}</div>
        <div><strong>Payment Method:</strong> ${params.paymentMethod || 'Paystack'}</div>
        <div><strong>Refund Date:</strong> ${new Date().toLocaleDateString('en-GB')}</div>
      </div>
      <p style="font-size:11px;color:#9ca3af;margin-top:10px;">The time it takes for funds to appear depends on your payment provider (usually 2-5 business days).</p>
    </div>
    <div style="text-align:center;">
      <a href="${SITE_URL}/#/account/orders" class="btn">VIEW ORDER →</a>
    </div>`

  return sendEmail(params.to, `Refund Initiated 💰 — Order #${params.orderId}`, baseTemplate(`Refund initiated for #${params.orderId}.`, body))
}

export async function sendRefundCompleted(params: {
  to: string
  name?: string
  orderId: string
  refundAmount: number
  currency?: string
  transactionId?: string
}) {
  const firstName = params.name || 'there'
  const cur = params.currency || 'KES'
  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:40px;margin-bottom:8px;">✅</div>
      <h1 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:6px;">Refund Completed</h1>
      <p style="color:#9ca3af;font-size:13px;">Hey ${firstName}, your refund has been successfully processed.</p>
    </div>
    <div class="card">
      <div style="font-size:13px;color:#d1d5db;line-height:1.8;">
        <div><strong>Order:</strong> #${params.orderId}</div>
        <div><strong>Refund Amount:</strong> ${cur} ${params.refundAmount.toLocaleString()}</div>
        <div><strong>Transaction ID:</strong> ${params.transactionId || params.orderId}</div>
      </div>
    </div>`

  return sendEmail(params.to, `Refund Completed ✅ — Order #${params.orderId}`, baseTemplate(`Refund completed for #${params.orderId}.`, body))
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. CUSTOMER SUPPORT & CONTACT FORM
// ═══════════════════════════════════════════════════════════════════════════════

export async function sendSupportTicketReceived(params: {
  to: string
  name?: string
  ticketId: string
  subject: string
}) {
  const firstName = params.name || 'there'
  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:40px;margin-bottom:8px;">📩</div>
      <h1 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:6px;">We've Got Your Message</h1>
      <p style="color:#9ca3af;font-size:13px;">Hey ${firstName}, thanks for contacting FlowerZFC. We've received your support request.</p>
    </div>
    <div class="card">
      <p style="font-size:12px;color:#9ca3af;margin-bottom:4px;">Ticket <strong>#${params.ticketId}</strong></p>
      <p style="font-size:14px;font-weight:bold;color:#fff;">${params.subject}</p>
    </div>
    <p style="color:#9ca3af;font-size:12px;margin-bottom:16px;">Our support team will review your request and get back to you as soon as possible.</p>`

  return sendEmail(params.to, `Support Request Received 📩 [#${params.ticketId}]`, baseTemplate(`Support ticket #${params.ticketId} received.`, body))
}

export async function sendContactFormReceived(params: {
  to: string
  name?: string
  subject: string
  referenceId: string
}) {
  const firstName = params.name || 'there'
  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:40px;margin-bottom:8px;">📩</div>
      <h1 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:6px;">Message Received</h1>
      <p style="color:#9ca3af;font-size:13px;">Hey ${firstName}, thanks for contacting FlowerZFC. We've received your message and our team will review it.</p>
    </div>
    <div class="card">
      <div style="font-size:13px;color:#d1d5db;line-height:1.8;">
        <div><strong>Subject:</strong> ${params.subject}</div>
        <div><strong>Reference:</strong> ${params.referenceId}</div>
      </div>
    </div>
    <div style="text-align:center;">
      <a href="${SITE_URL}" class="btn">VISIT FLOWERZFC →</a>
    </div>`

  return sendEmail(params.to, `Message Received 📩 [Ref: ${params.referenceId}] | FlowerZFC`, baseTemplate(`We received your message [Ref: ${params.referenceId}].`, body))
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. PROMOTIONS & MARKETING
// ═══════════════════════════════════════════════════════════════════════════════

export async function sendExclusiveOffer(params: {
  to: string
  name?: string
  offerTitle: string
  offerDescription: string
  couponCode: string
  expiryDate: string
}) {
  const firstName = params.name || 'there'
  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <span style="background:${BRAND_GREEN};color:#000;padding:4px 10px;border-radius:6px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1px;">🛍️ EXCLUSIVE OFFER</span>
      <h1 style="font-size:24px;font-weight:900;color:#fff;margin:12px 0 6px 0;">${params.offerTitle}</h1>
      <p style="color:#9ca3af;font-size:13px;">Hey ${firstName}, because you're part of the FlowerZFC community, we've got something special for you.</p>
    </div>
    <div class="card" style="text-align:center;">
      <p style="font-size:13px;color:#d1d5db;margin-bottom:12px;">${params.offerDescription}</p>
      <div style="background:#131320;border:2px dashed ${BRAND_GREEN};border-radius:8px;padding:12px;display:inline-block;margin-bottom:10px;">
        <span style="font-family:monospace;font-size:18px;font-weight:900;color:${BRAND_GREEN};letter-spacing:2px;">${params.couponCode}</span>
      </div>
      <p style="font-size:11px;color:#f59e0b;">Offer ends: ${params.expiryDate}</p>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${SITE_URL}/#/shop" class="btn">SHOP NOW →</a>
    </div>`

  return sendEmail(params.to, `🛍️ Exclusive Offer: ${params.offerTitle} | FlowerZFC`, baseTemplate(`Special offer for you with coupon ${params.couponCode}`, body))
}

export async function sendAbandonedCartReminder(params: {
  to: string
  name?: string
  cartItems: string
  cartTotal: number
  currency?: string
}) {
  const firstName = params.name || 'there'
  const cur = params.currency || 'KES'
  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:40px;margin-bottom:8px;">🛒</div>
      <h1 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:6px;">You Left Something Behind</h1>
      <p style="color:#9ca3af;font-size:13px;">Hey ${firstName}, looks like you left something in your FlowerZFC cart.</p>
    </div>
    <div class="card">
      <p style="font-size:13px;color:#fff;margin-bottom:6px;">${params.cartItems}</p>
      <p style="font-size:14px;font-weight:bold;color:${BRAND_GREEN};">Cart Total: ${cur} ${params.cartTotal.toLocaleString()}</p>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${SITE_URL}/#/checkout" class="btn">RETURN TO MY CART →</a>
    </div>`

  return sendEmail(params.to, 'You Left Something in Your Cart 🛒 | FlowerZFC', baseTemplate('Complete your purchase at FlowerZFC.', body))
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. ADMIN NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export async function notifyAdminNewOrder(params: {
  orderId: string
  customerName: string
  customerEmail: string
  items: Array<{ name: string; size?: string; qty: number; price: number }>
  total: number
  currency?: string
}) {
  const { orderId, customerName, customerEmail, items, total, currency = 'KES' } = params
  const rows = items.map(i => `
    <tr>
      <td style="padding:6px 0;border-bottom:1px solid #1e1e32;color:#fff;font-size:12px;">${i.name}${i.size ? ` (${i.size})` : ''}</td>
      <td align="center" style="padding:6px 0;border-bottom:1px solid #1e1e32;color:#9ca3af;font-size:12px;">×${i.qty}</td>
      <td align="right" style="padding:6px 0;border-bottom:1px solid #1e1e32;color:${BRAND_GREEN};font-weight:bold;font-size:12px;">${currency} ${(i.price * i.qty).toLocaleString()}</td>
    </tr>`).join('')

  const body = `
    <div style="margin-bottom:18px;">
      <span style="background:${BRAND_GREEN};color:#000;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:900;text-transform:uppercase;">NEW ORDER</span>
      <h1 style="font-size:20px;font-weight:900;color:#fff;margin-top:8px;">Order #${orderId}</h1>
    </div>
    <div class="card">
      <div style="font-size:13px;color:#d1d5db;line-height:1.8;">
        <div><strong>Customer:</strong> ${customerName}</div>
        <div><strong>Email:</strong> ${customerEmail}</div>
        <div><strong>Total:</strong> <span style="color:${BRAND_GREEN};font-weight:bold;">${currency} ${total.toLocaleString()}</span></div>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">${rows}</table>
    </div>
    <div style="text-align:center;">
      <a href="${SITE_URL}/#/admin" class="btn">VIEW ORDER IN ADMIN →</a>
    </div>`

  return sendEmail(ADMIN_EMAIL, `🛍️ New Order #${orderId} (${currency} ${total.toLocaleString()}) — ${customerName}`, baseTemplate(`New order #${orderId} from ${customerName}`, body))
}

export async function notifyAdminAdInquiry(params: {
  businessName: string
  contactName: string
  email: string
  phone?: string
  planName: string
  budget?: string
  startDate?: string
  notes?: string
}) {
  const { businessName, contactName, email, phone, planName, budget, startDate, notes } = params
  const body = `
    <div style="margin-bottom:18px;">
      <span style="background:${BRAND_ORANGE};color:#fff;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:900;text-transform:uppercase;">AD INQUIRY</span>
      <h1 style="font-size:20px;font-weight:900;color:#fff;margin-top:8px;">New Campaign from ${businessName}</h1>
    </div>
    <div class="card">
      <div style="font-size:13px;color:#d1d5db;line-height:1.9;">
        <div><strong>Business:</strong> ${businessName}</div>
        <div><strong>Contact:</strong> ${contactName}</div>
        <div><strong>Email:</strong> ${email}</div>
        ${phone ? `<div><strong>Phone:</strong> ${phone}</div>` : ''}
        <div><strong>Placement:</strong> ${planName}</div>
        ${budget ? `<div><strong>Budget:</strong> ${budget}</div>` : ''}
        ${startDate ? `<div><strong>Start:</strong> ${startDate}</div>` : ''}
        ${notes ? `<div><strong>Notes:</strong> ${notes}</div>` : ''}
      </div>
    </div>
    <div style="text-align:center;">
      <a href="${SITE_URL}/#/admin" class="btn">OPEN ADMIN DASHBOARD →</a>
    </div>`

  return sendEmail(ADMIN_EMAIL, `📢 New Ad Inquiry: ${businessName} (${planName})`, baseTemplate(`Ad inquiry from ${businessName}`, body))
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. ADVERTISING SUITE (Advertiser lifecycle)
// ═══════════════════════════════════════════════════════════════════════════════

export async function sendAdvertiseConfirmation(params: {
  to: string
  name: string
  businessName: string
  planName: string
  budget?: string
  startDate?: string
}) {
  const { to, name, businessName, planName, budget, startDate } = params
  const body = `
    <div style="text-align:center;margin-bottom:26px;">
      <div style="font-size:44px;margin-bottom:10px;">📢</div>
      <h1 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:8px;">Advertising Request Received</h1>
      <p style="color:#9ca3af;font-size:14px;">Hey ${name}, thanks for your interest in advertising with FlowerZFC.</p>
    </div>
    <div class="card">
      <div style="font-size:13px;color:#d1d5db;line-height:1.9;">
        <div><strong>Business:</strong> ${businessName}</div>
        <div><strong>Placement:</strong> ${planName}</div>
        ${budget ? `<div><strong>Budget:</strong> ${budget}</div>` : ''}
        ${startDate ? `<div><strong>Start Date:</strong> ${startDate}</div>` : ''}
      </div>
    </div>
    <p style="color:#9ca3af;font-size:12px;text-align:center;margin-bottom:16px;">We'll review your campaign details and get back to you within 24 hours.</p>
    <div style="text-align:center;">
      <a href="${SITE_URL}/#/advertise" class="btn">VIEW ADVERTISING PORTAL →</a>
    </div>`

  return sendEmail(to, `Advertising Request Received 📢 — ${businessName} | FlowerZFC`, baseTemplate(`We received your ad inquiry for ${businessName}.`, body))
}

export async function sendAdCampaignApproved(params: {
  to: string
  name?: string
  campaignName: string
  businessName: string
  placement: string
  startDate: string
  endDate: string
}) {
  const firstName = params.name || 'there'
  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:40px;margin-bottom:8px;">🎉</div>
      <h1 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:6px;">Campaign Approved</h1>
      <p style="color:#9ca3af;font-size:13px;">Hey ${firstName}, great news — your advertising campaign has been approved and is ready to run on FlowerZFC.</p>
    </div>
    <div class="card">
      <div style="font-size:13px;color:#d1d5db;line-height:1.9;">
        <div><strong>Campaign:</strong> ${params.campaignName}</div>
        <div><strong>Business:</strong> ${params.businessName}</div>
        <div><strong>Placement:</strong> ${params.placement}</div>
        <div><strong>Schedule:</strong> ${params.startDate} → ${params.endDate}</div>
      </div>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${SITE_URL}/#/advertise" class="btn">VIEW CAMPAIGN →</a>
    </div>`

  return sendEmail(params.to, `Your Campaign Is Approved 🎉 — ${params.campaignName}`, baseTemplate(`Ad campaign approved for ${params.campaignName}`, body))
}

export async function sendAdCampaignLive(params: {
  to: string
  name?: string
  campaignName: string
  placement: string
  startDate: string
  endDate: string
}) {
  const firstName = params.name || 'there'
  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:40px;margin-bottom:8px;">🚀</div>
      <h1 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:6px;">Your Campaign Is Live</h1>
      <p style="color:#9ca3af;font-size:13px;">Hey ${firstName}, your advertising campaign is officially live on FlowerZFC.</p>
    </div>
    <div class="card">
      <div style="font-size:13px;color:#d1d5db;line-height:1.9;">
        <div><strong>Campaign:</strong> ${params.campaignName}</div>
        <div><strong>Placement:</strong> ${params.placement}</div>
        <div><strong>Schedule:</strong> ${params.startDate} → ${params.endDate}</div>
      </div>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${SITE_URL}/#/advertise" class="btn">VIEW PERFORMANCE →</a>
    </div>`

  return sendEmail(params.to, `Your Campaign Is Live 🚀 — ${params.campaignName}`, baseTemplate(`Ad campaign live on FlowerZFC: ${params.campaignName}`, body))
}

// ═══════════════════════════════════════════════════════════════════════════════
// 11. BROADCAST NEWSLETTER (Admin Broadcast Engine)
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
