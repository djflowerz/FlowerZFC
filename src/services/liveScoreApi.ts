// Real-Time LiveScore API Integration Service
// All API endpoints extracted directly from LiveScore.com frontend source:
//   PUBLIC_API_URL: https://prod-cdn-public-api.livescore.com
//   PUBLIC_IMAGES_CDN_URL: https://storage.livescore.com/images/
// Live page: https://www.livescore.com/en/football/live/

export interface LiveMatch {
  id: string
  home: string
  away: string
  homeScore: number | null   // null = match not started / no score yet
  awayScore: number | null
  minute: number
  live: boolean
  league: string
  leagueId: string
  leagueSlug: string
  region?: string
  flag: string
  date: string
  venue: string
  status?: string
  homeLogo?: string
  awayLogo?: string
  homeColor?: string
  awayColor?: string
  leagueBadge?: string
  tvChannels?: string[]
  stageIndex?: number  // preserves LiveScore API natural ordering
  aggregate?: string   // e.g. "Agg 1 - 0" for two-legged ties
  homeTeamId?: string  // for H2H lookups
  awayTeamId?: string
  categorySlug?: string  // e.g. "europe", "england" — used to build H2H page URL
}

export interface LiveStanding {
  rank: number
  team: string
  teamId?: string
  teamLogo?: string
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  gd: number
  pts: number
  form: ('W' | 'D' | 'L')[]
  league: string
}

export interface LiveFixture {
  id: string
  home: string
  away: string
  homeLogo?: string
  awayLogo?: string
  time: string
  date: string
  league: string
  venue: string
  status?: string
  leagueBadge?: string
}

// ─── Helper for Date API Formatting ──────────────────────────────────────────
export function formatDateForApi(dateInput?: string): string {
  const formatLocalYYYYMMDD = (d: Date) => {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}${mm}${dd}`
  }

  if (!dateInput || dateInput === 'TODAY' || dateInput === 'Today') {
    return formatLocalYYYYMMDD(new Date())
  }
  if (dateInput === 'YESTERDAY' || dateInput === 'Yesterday') {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return formatLocalYYYYMMDD(d)
  }
  if (dateInput === 'TOMORROW' || dateInput === 'Tomorrow') {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return formatLocalYYYYMMDD(d)
  }
  return dateInput.replace(/-/g, '')
}

// ─── CDN Image URL Builder ────────────────────────────────────────────────
// Routed via Vite proxy /api/ls-cdn -> lsm-static-prod.livescore.com
// Img field from API e.g.: "enet/9847.png", "teambadge/aston-villa-2024.png"
const LS_CDN = '/api/ls-cdn/medium/'

export function getInitialsAvatarUrl(teamName: string): string {
  const initials = (teamName || 'FC')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#1e1e32"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#00b341" font-size="24" font-weight="900" font-family="sans-serif">${initials}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const TEAM_LOGO_MAP: Record<string, string> = {
  // English Premier League & Championship
  'arsenal': '/images/team/medium/enet/9825.png',
  'manchester united': '/images/team/medium/enet/10260.png',
  'man utd': '/images/team/medium/enet/10260.png',
  'manchester city': '/images/team/medium/enet/8456.png',
  'man city': '/images/team/medium/enet/8456.png',
  'liverpool': '/images/team/medium/enet/9906.png',
  'chelsea': '/images/team/medium/enet/8455.png',
  'tottenham': '/images/team/medium/enet/8586.png',
  'tottenham hotspur': '/images/team/medium/enet/8586.png',
  'aston villa': 'https://a.espncdn.com/i/teamlogos/soccer/500/362.png',
  'newcastle': '/images/team/medium/enet/10261.png',
  'newcastle united': '/images/team/medium/enet/10261.png',
  'everton': '/images/team/medium/enet/10269.png',
  'brighton': '/images/team/medium/enet/8191.png',
  'west ham': '/images/team/medium/enet/8654.png',
  'west ham united': '/images/team/medium/enet/8654.png',
  'fulham': 'https://a.espncdn.com/i/teamlogos/soccer/500/370.png',
  'brentford': 'https://a.espncdn.com/i/teamlogos/soccer/500/337.png',
  'crystal palace': 'https://a.espncdn.com/i/teamlogos/soccer/500/384.png',
  'wolverhampton': 'https://a.espncdn.com/i/teamlogos/soccer/500/380.png',
  'wolves': 'https://a.espncdn.com/i/teamlogos/soccer/500/380.png',
  'bournemouth': 'https://a.espncdn.com/i/teamlogos/soccer/500/349.png',
  'nottingham forest': 'https://a.espncdn.com/i/teamlogos/soccer/500/393.png',
  'leicester': 'https://a.espncdn.com/i/teamlogos/soccer/500/375.png',
  'leeds': 'https://a.espncdn.com/i/teamlogos/soccer/500/357.png',
  'leeds united': 'https://a.espncdn.com/i/teamlogos/soccer/500/357.png',
  'southampton': 'https://a.espncdn.com/i/teamlogos/soccer/500/376.png',

  // Spanish La Liga
  'real madrid': '/images/team/medium/enet/8633.png',
  'barcelona': '/images/team/medium/enet/8634.png',
  'atletico madrid': 'https://a.espncdn.com/i/teamlogos/soccer/500/1068.png',
  'atletico': 'https://a.espncdn.com/i/teamlogos/soccer/500/1068.png',
  'atlético madrid': 'https://a.espncdn.com/i/teamlogos/soccer/500/1068.png',
  'sevilla': 'https://a.espncdn.com/i/teamlogos/soccer/500/243.png',
  'real betis': 'https://a.espncdn.com/i/teamlogos/soccer/500/244.png',
  'real sociedad': 'https://a.espncdn.com/i/teamlogos/soccer/500/89.png',
  'villarreal': 'https://a.espncdn.com/i/teamlogos/soccer/500/102.png',
  'athletic bilbao': 'https://a.espncdn.com/i/teamlogos/soccer/500/93.png',
  'athletic club': 'https://a.espncdn.com/i/teamlogos/soccer/500/93.png',
  'girona': 'https://a.espncdn.com/i/teamlogos/soccer/500/9812.png',
  'valencia': 'https://a.espncdn.com/i/teamlogos/soccer/500/95.png',

  // German Bundesliga
  'bayern munich': 'https://a.espncdn.com/i/teamlogos/soccer/500/132.png',
  'bayern': 'https://a.espncdn.com/i/teamlogos/soccer/500/132.png',
  'dortmund': 'https://a.espncdn.com/i/teamlogos/soccer/500/124.png',
  'borussia dortmund': 'https://a.espncdn.com/i/teamlogos/soccer/500/124.png',
  'bayer leverkusen': 'https://a.espncdn.com/i/teamlogos/soccer/500/131.png',
  'leverkusen': 'https://a.espncdn.com/i/teamlogos/soccer/500/131.png',
  'rb leipzig': 'https://a.espncdn.com/i/teamlogos/soccer/500/11420.png',
  'leipzig': 'https://a.espncdn.com/i/teamlogos/soccer/500/11420.png',

  // Italian Serie A
  'inter': 'https://a.espncdn.com/i/teamlogos/soccer/500/110.png',
  'inter milan': 'https://a.espncdn.com/i/teamlogos/soccer/500/110.png',
  'ac milan': 'https://a.espncdn.com/i/teamlogos/soccer/500/103.png',
  'milan': 'https://a.espncdn.com/i/teamlogos/soccer/500/103.png',
  'juventus': 'https://a.espncdn.com/i/teamlogos/soccer/500/111.png',
  'napoli': 'https://a.espncdn.com/i/teamlogos/soccer/500/114.png',
  'roma': 'https://a.espncdn.com/i/teamlogos/soccer/500/104.png',
  'lazio': 'https://a.espncdn.com/i/teamlogos/soccer/500/109.png',
  'atalanta': 'https://a.espncdn.com/i/teamlogos/soccer/500/105.png',
  'fiorentina': 'https://a.espncdn.com/i/teamlogos/soccer/500/108.png',
  'como 1907': 'https://a.espncdn.com/i/teamlogos/soccer/500/2821.png',
  'como': 'https://a.espncdn.com/i/teamlogos/soccer/500/2821.png',

  // French Ligue 1
  'psg': '/images/team/medium/enet/9847.png',
  'paris saint-germain': '/images/team/medium/enet/9847.png',
  'marseille': 'https://a.espncdn.com/i/teamlogos/soccer/500/165.png',
  'lyon': 'https://a.espncdn.com/i/teamlogos/soccer/500/167.png',
  'monaco': 'https://a.espncdn.com/i/teamlogos/soccer/500/170.png',
  'lille': 'https://a.espncdn.com/i/teamlogos/soccer/500/166.png',

  // Argentine Primera & South American
  'independiente': 'https://a.espncdn.com/i/teamlogos/soccer/500/3.png',
  'atletico tucuman': 'https://a.espncdn.com/i/teamlogos/soccer/500/10189.png',
  'atlético tucumán': 'https://a.espncdn.com/i/teamlogos/soccer/500/10189.png',
  'boca juniors': 'https://a.espncdn.com/i/teamlogos/soccer/500/5.png',
  'river plate': 'https://a.espncdn.com/i/teamlogos/soccer/500/16.png',
  'san lorenzo': 'https://a.espncdn.com/i/teamlogos/soccer/500/17.png',
  'racing club': 'https://a.espncdn.com/i/teamlogos/soccer/500/15.png',
  'velez sarsfield': 'https://a.espncdn.com/i/teamlogos/soccer/500/21.png',
  'vélez sarsfield': 'https://a.espncdn.com/i/teamlogos/soccer/500/21.png',
  'talleres': 'https://a.espncdn.com/i/teamlogos/soccer/500/11867.png',
  'deportivo riestra': 'https://a.espncdn.com/i/teamlogos/soccer/500/18804.png',
  'godoy cruz': 'https://a.espncdn.com/i/teamlogos/soccer/500/3142.png',
  'rosario central': 'https://a.espncdn.com/i/teamlogos/soccer/500/14.png',

  // Europa League, Conference League & European Teams
  'besiktas': 'https://a.espncdn.com/i/teamlogos/soccer/500/506.png',
  'beşiktaş': 'https://a.espncdn.com/i/teamlogos/soccer/500/506.png',
  'hradec kralove': 'https://a.espncdn.com/i/teamlogos/soccer/500/10834.png',
  'hradec králové': 'https://a.espncdn.com/i/teamlogos/soccer/500/10834.png',
  'cs universitatea craiova': 'https://a.espncdn.com/i/teamlogos/soccer/500/11833.png',
  'craiova': 'https://a.espncdn.com/i/teamlogos/soccer/500/11833.png',
  'kups': 'https://a.espncdn.com/i/teamlogos/soccer/500/2505.png',
  'gornik zabrze': 'https://a.espncdn.com/i/teamlogos/soccer/500/2753.png',
  'górnik zabrze': 'https://a.espncdn.com/i/teamlogos/soccer/500/2753.png',
  'ferencvaros': 'https://a.espncdn.com/i/teamlogos/soccer/500/238.png',
  'ferencváros': 'https://a.espncdn.com/i/teamlogos/soccer/500/238.png',
  'omonia nicosia': 'https://a.espncdn.com/i/teamlogos/soccer/500/3565.png',
  'omonia': 'https://a.espncdn.com/i/teamlogos/soccer/500/3565.png',
  'lincoln red imps': 'https://a.espncdn.com/i/teamlogos/soccer/500/16281.png',
  'lincoln red imps fc': 'https://a.espncdn.com/i/teamlogos/soccer/500/16281.png',
  'pafos fc': 'https://a.espncdn.com/i/teamlogos/soccer/500/18579.png',
  'pafos': 'https://a.espncdn.com/i/teamlogos/soccer/500/18579.png',
  'fc salzburg': 'https://a.espncdn.com/i/teamlogos/soccer/500/2070.png',
  'salzburg': 'https://a.espncdn.com/i/teamlogos/soccer/500/2070.png',
  'red bull salzburg': 'https://a.espncdn.com/i/teamlogos/soccer/500/2070.png',
  'klaksvik': 'https://a.espncdn.com/i/teamlogos/soccer/500/17702.png',
  'kí klaksvík': 'https://a.espncdn.com/i/teamlogos/soccer/500/17702.png',
  'ki klaksvik': 'https://a.espncdn.com/i/teamlogos/soccer/500/17702.png',
  'lech poznan': 'https://a.espncdn.com/i/teamlogos/soccer/500/2752.png',
  'lech poznań': 'https://a.espncdn.com/i/teamlogos/soccer/500/2752.png',
  'vikingur reykjavik': 'https://a.espncdn.com/i/teamlogos/soccer/500/11835.png',
  'víkingur reykjavík': 'https://a.espncdn.com/i/teamlogos/soccer/500/11835.png',
  'vikingur': 'https://a.espncdn.com/i/teamlogos/soccer/500/11835.png',
  'thun': 'https://a.espncdn.com/i/teamlogos/soccer/500/2607.png',
  'fc thun': 'https://a.espncdn.com/i/teamlogos/soccer/500/2607.png',
  'pfc cska sofia': 'https://a.espncdn.com/i/teamlogos/soccer/500/2755.png',
  'cska sofia': 'https://a.espncdn.com/i/teamlogos/soccer/500/2755.png',
  'maccabi tel aviv': 'https://a.espncdn.com/i/teamlogos/soccer/500/616.png',
  'maccabi tel-aviv': 'https://a.espncdn.com/i/teamlogos/soccer/500/616.png',
  'anderlecht': 'https://a.espncdn.com/i/teamlogos/soccer/500/4.png',
  'rsc anderlecht': 'https://a.espncdn.com/i/teamlogos/soccer/500/4.png',
  'paok fc': 'https://a.espncdn.com/i/teamlogos/soccer/500/2301.png',
  'paok': 'https://a.espncdn.com/i/teamlogos/soccer/500/2301.png',

  // African & East African
  'gor mahia': 'https://a.espncdn.com/i/teamlogos/soccer/500/18876.png',
  'afc leopards': 'https://a.espncdn.com/i/teamlogos/soccer/500/18877.png',
  'simba sc': 'https://a.espncdn.com/i/teamlogos/soccer/500/18878.png',
  'yanga': 'https://a.espncdn.com/i/teamlogos/soccer/500/18879.png',
}

export function getClubLogo(teamName: string, imgField?: string): string {
  const nameKey = (teamName || '').toLowerCase().trim()

  // 1. Known exact name in TEAM_LOGO_MAP (ESPN CDN high-res, no hotlink protection)
  if (TEAM_LOGO_MAP[nameKey]) {
    return TEAM_LOGO_MAP[nameKey]
  }

  // 2. Substring fuzzy match in TEAM_LOGO_MAP
  for (const [key, url] of Object.entries(TEAM_LOGO_MAP)) {
    if (nameKey.length >= 4 && (nameKey.includes(key) || key.includes(nameKey))) {
      return url
    }
  }

  // 3. Use imgField from API (LiveScore provides enet/<id>.png for every team)
  if (imgField) {
    if (imgField.startsWith('http://') || imgField.startsWith('https://')) return imgField
    // enet/<id>.png — serve via LS CDN proxy (/api/ls-cdn -> lsm-static-prod.livescore.com)
    if (imgField.startsWith('enet/')) return `/api/ls-cdn/medium/${imgField}`
    // Any other relative path — same LS CDN proxy
    return `/api/ls-cdn/medium/${imgField}`
  }

  // 4. Final fallback: clean SVG initials avatar (zero broken images)
  return getInitialsAvatarUrl(teamName)
}

export function getLeagueBadge(badgeUrl?: string): string | undefined {
  if (!badgeUrl) return undefined
  if (badgeUrl.startsWith('http://') || badgeUrl.startsWith('https://')) return badgeUrl
  if (badgeUrl.startsWith('competition/')) return `/images/${badgeUrl}`
  return `${LS_CDN}${badgeUrl}`
}

// ─── Country Flag ─────────────────────────────────────────────────────────────
function countryFlag(ccd: string): string {
  const map: Record<string, string> = {
    eng: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', esp: '🇪🇸', ita: '🇮🇹', ger: '🇩🇪', fra: '🇫🇷',
    ned: '🇳🇱', por: '🇵🇹', sco: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', bra: '🇧🇷', arg: '🇦🇷',
    tur: '🇹🇷', bel: '🇧🇪', usa: '🇺🇸', ken: '🇰🇪', nga: '🇳🇬',
    egy: '🇪🇬', zaf: '🇿🇦', mex: '🇲🇽', ned2: '🇳🇱', jpn: '🇯🇵',
    kor: '🇰🇷', aus: '🇦🇺', chi: '🇨🇱', col: '🇨🇴', uru: '🇺🇾',
    'south-africa': '🇿🇦', 'copa-libertadores': '🏆', 'conference-league': '🌟',
    'uefa-super-cup': '🏆', 'copa-sudamericana': '🏆', intl: '🌐', concacaf: '🌎',
  }
  return map[ccd?.toLowerCase()] || '⚽'
}

// ─── Status Parser ────────────────────────────────────────────────────────────
function parseStatus(evt: any): { status: string; live: boolean; minute: number } {
  const eps: string = evt.Eps || ''
  const etm = evt.Etm

  let minute = 0
  let live = false
  let status: string

  // Handle raw minute strings the API sends directly e.g. "73'", "90+12'"
  const rawMinuteMatch = eps.match(/^(\d+)(?:\+(\d+))?'$/)
  if (rawMinuteMatch) {
    live = true
    const base = parseInt(rawMinuteMatch[1])
    const extra = rawMinuteMatch[2] ? parseInt(rawMinuteMatch[2]) : 0
    minute = base + extra
    status = extra > 0 ? `${base}+${extra}'` : `${base}'`
    return { status, live, minute }
  }

  // Standard period codes
  if (['1H', 'HT', '2H', 'ET', 'P'].includes(eps)) {
    live = true
    if (etm?.ATm && etm?.RTm) {
      const elapsed = (Date.now() - etm.ATm) + etm.RTm
      minute = Math.floor(elapsed / 60000)
      if (eps === '2H' && minute < 46) minute += 45
    } else {
      minute = eps === '2H' ? 70 : 30
    }
  }

  switch (eps) {
    case '1H':     status = `${minute}'`; break
    case 'HT':     status = 'HT'; break
    case '2H':     status = `${minute}'`; break
    case 'ET':     status = `${minute}' ET`; break
    case 'P':      status = 'Penalties'; break
    case 'AP':     status = 'AET'; break           // After Penalties
    case 'FT':     status = 'FT'; break
    case 'AET':    status = 'AET'; break
    case 'Postp.': status = 'Postponed'; break
    case 'Canc.':  status = 'Cancelled'; break
    case 'Susp.':  status = 'Suspended'; break
    case 'Aban.':  status = 'Abandoned'; break
    case 'Awarded':status = 'Awarded'; break
    case 'NS': {
      // Extract kick-off time from Esd: format YYYYMMDDHHMMSS in UTC
      const esd = String(evt.Esd || '')
      if (esd.length >= 12) {
        const yyyy = parseInt(esd.slice(0, 4))
        const mm   = parseInt(esd.slice(4, 6)) - 1
        const dd   = parseInt(esd.slice(6, 8))
        const hh   = parseInt(esd.slice(8, 10))
        const min  = parseInt(esd.slice(10, 12))

        const kickoffUtc = new Date(Date.UTC(yyyy, mm, dd, hh, min, 0))
        const now = Date.now()
        const diffMs = kickoffUtc.getTime() - now

        // Convert to user's local timezone
        const localTimeStr = kickoffUtc.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

        if (diffMs > 0 && diffMs <= 60 * 60 * 1000) {
          const minsLeft = Math.ceil(diffMs / 60000)
          status = `Starts in ${minsLeft}m (${localTimeStr})`
        } else if (diffMs > -5 * 60 * 1000 && diffMs <= 0) {
          status = `Starting Now (${localTimeStr})`
        } else {
          status = localTimeStr
        }
      } else {
        status = 'Scheduled'
      }
      break
    }
    default: status = eps || 'Scheduled'
  }

  return { status, live, minute }
}

// ─── Format League & Competition Title ─────────────────────────────────────────
export function formatLeagueName(stage: any): string {
  const cnm = stage.Cnm || ''
  const compN = stage.CompN || ''
  const snm = stage.Snm || ''

  if (compN && snm && compN.toLowerCase() === snm.toLowerCase()) {
    return cnm && cnm.toLowerCase() !== compN.toLowerCase() && cnm !== 'International' ? `${cnm} — ${compN}` : compN
  }

  if (compN) {
    if (snm && !compN.toLowerCase().includes(snm.toLowerCase()) && snm !== 'Qualification' && snm !== 'Main Stage') {
      return `${compN} (${snm})`
    }
    return cnm && cnm !== 'International' && !compN.toLowerCase().includes(cnm.toLowerCase()) ? `${cnm} — ${compN}` : compN
  }

  if (cnm && snm) {
    if (snm.toLowerCase().includes(cnm.toLowerCase()) || cnm === 'International') return snm
    return `${cnm} — ${snm}`
  }

  return snm || cnm || 'Football'
}

export async function fetchLiveScoreEndpoint(pathAndQuery: string): Promise<any> {
  const directUrl = `https://prod-cdn-public-api.livescore.com${pathAndQuery}`
  const primaryUrl = `/api/livescore${pathAndQuery}`

  // 1. Try Netlify / Vite proxy first
  try {
    const ctrl1 = new AbortController()
    const t1 = setTimeout(() => ctrl1.abort(), 4000)
    const res1 = await fetch(primaryUrl, {
      signal: ctrl1.signal,
      headers: { 'Accept': 'application/json' },
    })
    clearTimeout(t1)
    if (res1.ok) {
      const data1 = await res1.json()
      if (data1 && (data1.Stages || data1.Stage || data1.LeagueTable)) return data1
    }
  } catch (e) { /* ignore */ }

  // 2. Try AllOrigins CORS proxy (JSON wrapper)
  try {
    const ctrl2 = new AbortController()
    const t2 = setTimeout(() => ctrl2.abort(), 5000)
    const res2 = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(directUrl)}`, {
      signal: ctrl2.signal,
    })
    clearTimeout(t2)
    if (res2.ok) {
      const data2 = await res2.json()
      if (data2?.contents) {
        const parsed = typeof data2.contents === 'string' ? JSON.parse(data2.contents) : data2.contents
        if (parsed && (parsed.Stages || parsed.Stage || parsed.LeagueTable)) return parsed
      }
    }
  } catch (e) { /* ignore */ }

  // 3. Try Direct CDN fetch
  try {
    const ctrl3 = new AbortController()
    const t3 = setTimeout(() => ctrl3.abort(), 4000)
    const res3 = await fetch(directUrl, {
      signal: ctrl3.signal,
      headers: { 'Accept': 'application/json' },
    })
    clearTimeout(t3)
    if (res3.ok) {
      const data3 = await res3.json()
      if (data3 && (data3.Stages || data3.Stage || data3.LeagueTable)) return data3
    }
  } catch (e) { /* ignore */ }

  throw new Error('All LiveScore endpoints failed')
}

// ─── Live Scores — uses /en/football/live/ feed ───────────────────────────────
export async function fetchLiveMatches(dateStr?: string, liveOnly = false): Promise<LiveMatch[]> {
  try {
    const formattedDate = formatDateForApi(dateStr)
    const liveFilter = liveOnly ? '&Lf=1' : ''
    const pathAndQuery = `/v1/api/app/date/soccer/${formattedDate}/0?MD=1${liveFilter}`
    const data = await fetchLiveScoreEndpoint(pathAndQuery)

    const matches: LiveMatch[] = []
    if (data?.Stages && Array.isArray(data.Stages)) {
      data.Stages.forEach((stage: any, stageIdx: number) => {
        const displayLeague: string = formatLeagueName(stage)
        const regionName: string = stage.Cnm || 'International'
        const flag = countryFlag(stage.Ccd)
        const leagueBadge = stage.badgeUrl ? getLeagueBadge(stage.badgeUrl) : undefined

        if (stage.Events && Array.isArray(stage.Events)) {
          stage.Events.forEach((evt: any) => {
            const home = evt.T1?.[0] || {}
            const away = evt.T2?.[0] || {}
            const homeName: string = home.Nm || 'Home'
            const awayName: string  = away.Nm || 'Away'
            // Use null for no-score (NS/Postponed/Cancelled) — Tr1/Tr2 undefined means no score yet
            const homeScore: number | null = evt.Tr1 !== undefined && evt.Tr1 !== '' ? parseInt(evt.Tr1) : null
            const awayScore: number | null = evt.Tr2 !== undefined && evt.Tr2 !== '' ? parseInt(evt.Tr2) : null
            const { status, live, minute } = parseStatus(evt)

            // TV channels
            const tvChannels: string[] = []
            if (evt.Media?.[112]) {
              evt.Media[112].forEach((m: any) => {
                if (m.type === 'TV_CHANNEL' && m.eventId) tvChannels.push(m.eventId)
              })
            }

            matches.push({
              id: evt.Eid ? String(evt.Eid) : `m-${Math.random()}`,
              home: homeName,
              away: awayName,
              homeScore: homeScore,
              awayScore: awayScore,
              minute,
              live,
              league: displayLeague,
              leagueId: stage.Sid || 'gen',
              leagueSlug: stage.CompUrlName || stage.Scd || '',
              region: regionName,
              flag,
              date: dateStr || new Date().toISOString().slice(0, 10),
              venue: stage.Cnm || 'Stadium',
              status,
              homeLogo: getClubLogo(homeName, home.Img),
              awayLogo: getClubLogo(awayName, away.Img),
              homeColor: home.Fc ? `#${home.Fc}` : undefined,
              awayColor: away.Fc ? `#${away.Fc}` : undefined,
              leagueBadge,
              tvChannels: tvChannels.length > 0 ? tvChannels : undefined,
              stageIndex: stageIdx,
              aggregate: evt.seriesInfo
                ? `Agg ${evt.seriesInfo.aggScoreTeam1} - ${evt.seriesInfo.aggScoreTeam2}`
                : undefined,
              homeTeamId: home.ID ? String(home.ID) : undefined,
              awayTeamId: away.ID ? String(away.ID) : undefined,
              categorySlug: stage.Ccd ? String(stage.Ccd).toLowerCase() : undefined,
            })
          })
        }
      })
    }

    if (matches.length > 0) return matches
    throw new Error('Empty response')
  } catch (err) {
    console.warn('[LiveScoreAPI] fetchLiveMatches fallback:', err)
  }

  // Static fallback (only shown if network completely blocked)
  return [
    { id: 'm1', home: 'Paris Saint-Germain', away: 'Aston Villa',   homeScore: 0, awayScore: 0, minute: 0, live: false, league: 'UEFA Super Cup',    leagueId: '25431', leagueSlug: 'uefa-super-cup', region: 'International',  flag: '🌐', date: 'Today', venue: 'International',   status: '19:00', homeLogo: getClubLogo('PSG', 'enet/9847.png'), awayLogo: getClubLogo('Aston Villa', 'teambadge/aston-villa-2024.png') },
    { id: 'm2', home: 'Arsenal',             away: 'Como 1907',     homeScore: 0, awayScore: 0, minute: 0, live: false, league: 'Club Friendlies',   leagueId: '18545', leagueSlug: 'featured-club-friendlies', region: 'International', flag: '🌐', date: 'Today', venue: 'Friendlies', status: '18:30', homeLogo: getClubLogo('Arsenal', 'enet/9825.png'), awayLogo: getClubLogo('Arsenal') },
    { id: 'm3', home: 'Manchester United',   away: 'Leeds United',  homeScore: 0, awayScore: 0, minute: 0, live: false, league: 'Club Friendlies',   leagueId: '18545', leagueSlug: 'featured-club-friendlies', region: 'International', flag: '🌐', date: 'Today', venue: 'Friendlies', status: '18:30', homeLogo: getClubLogo('Man Utd', 'enet/10260.png'), awayLogo: getClubLogo('Man Utd') },
    { id: 'm4', home: 'Everton',             away: 'Newcastle United',homeScore:0, awayScore: 0, minute: 0, live: false, league: 'Club Friendlies',  leagueId: '18545', leagueSlug: 'featured-club-friendlies', region: 'International', flag: '🌐', date: 'Today', venue: 'Friendlies', status: '16:15', homeLogo: getClubLogo('Everton', 'enet/10261.png'), awayLogo: getClubLogo('Newcastle') },
    { id: 'm5', home: 'Real Madrid',         away: 'Dep. La Coruna',homeScore: 0, awayScore: 0, minute: 0, live: false, league: 'Club Friendlies',  leagueId: '24129', leagueSlug: 'club-friendlies-2026',    region: 'International', flag: '🇪🇸', date: 'Today', venue: 'Friendlies', status: '19:00', homeLogo: getClubLogo('Real Madrid', 'enet/8633.png'), awayLogo: getClubLogo('Real Madrid') },
  ]
}

// ─── Live-Only Matches (powers the LIVE page) ─────────────────────────────────
export async function fetchOnlyLiveMatches(): Promise<LiveMatch[]> {
  const all = await fetchLiveMatches(undefined, false)
  const live = all.filter(m => m.live)
  return live
}

// ─── Live Polling Subscription ────────────────────────────────────────────────
export function subscribeToLiveScores(onTick: (matches: LiveMatch[]) => void): () => void {
  const handler = () => { fetchLiveMatches().then(onTick) }
  handler()
  const interval = setInterval(handler, 15000) // every 15s like livescore.com
  return () => clearInterval(interval)
}

// ─── Standings — LiveScore table endpoint ─────────────────────────────────────
// URL pattern: /v1/api/app/stage/soccer/{stageId}/table
// Stage IDs from CompId field in match data:
const LEAGUE_STAGE_IDS: Record<string, string> = {
  'Premier League':    '1',
  'La Liga':           '2',
  'Bundesliga':        '3',
  'Serie A':           '4',
  'Ligue 1':           '5',
  'Eredivisie':        '6',
  'Champions League':  '7',
  'Europa League':     '16',
  'Championship':      '40',
  'Scottish Prem':     '60',
  'Primeira Liga':     '22',
}

export async function fetchLiveStandings(league: string = 'Premier League'): Promise<LiveStanding[]> {
  const stageId = LEAGUE_STAGE_IDS[league] || '1'
  try {
    const data = await fetchLiveScoreEndpoint(`/v1/api/app/stage/soccer/${stageId}/table`)

    const rows: any[] = (
      data.Stages?.[0]?.Tables?.[0]?.team ||
      data.Stages?.[0]?.Tables?.[0]?.teams ||
      data.Tables?.[0]?.team ||
      []
    )

    if (rows.length > 0) {
      return rows.map((row: any, idx: number) => {
        const formStr: string = row.form || row.Frm || ''
        const form = formStr.split('').map((c: string) =>
          c === 'W' ? 'W' : c === 'D' ? 'D' : 'L'
        ) as ('W' | 'D' | 'L')[]

        const teamName: string = row.Tnm || row.name || `Team ${idx + 1}`
        const imgField: string | undefined = row.Img

        return {
          rank:   parseInt(row.rnk  ?? row.pos  ?? String(idx + 1)) || idx + 1,
          team:   teamName,
          teamId: row.Tid?.toString() || row.id?.toString(),
          teamLogo: getClubLogo(teamName, imgField),
          played: parseInt(row.pld  ?? row.P   ?? '0') || 0,
          won:    parseInt(row.win  ?? row.W   ?? '0') || 0,
          drawn:  parseInt(row.drw  ?? row.D   ?? '0') || 0,
          lost:   parseInt(row.lst  ?? row.L   ?? '0') || 0,
          gf:     parseInt(row.gf   ?? row.F   ?? '0') || 0,
          ga:     parseInt(row.ga   ?? row.A   ?? '0') || 0,
          gd:     parseInt(row.gd   ?? row.GD  ?? '0') || 0,
          pts:    parseInt(row.pts  ?? row.Pts ?? '0') || 0,
          form:   form.slice(-5),
          league,
        } as LiveStanding
      })
    }
  } catch (err) {
    console.warn('[LiveScoreAPI] fetchLiveStandings fallback:', err)
  }

  // Static fallback
  return [
    { rank:1,  team:'Arsenal',    teamLogo: getClubLogo('Arsenal',    'enet/9825.png'),  played:33, won:24, drawn:6, lost:3,  gf:72, ga:28, gd:44,  pts:78, form:['W','W','W','D','W'], league },
    { rank:2,  team:'Liverpool',  teamLogo: getClubLogo('Liverpool',  'enet/9906.png'),  played:33, won:23, drawn:6, lost:4,  gf:68, ga:32, gd:36,  pts:75, form:['W','D','W','W','L'], league },
    { rank:3,  team:'Man City',   teamLogo: getClubLogo('Man City',   'enet/8456.png'),  played:33, won:21, drawn:8, lost:4,  gf:65, ga:30, gd:35,  pts:71, form:['W','W','D','W','W'], league },
    { rank:4,  team:'Chelsea',    teamLogo: getClubLogo('Chelsea',    'enet/8455.png'),  played:33, won:18, drawn:8, lost:7,  gf:58, ga:40, gd:18,  pts:62, form:['L','W','W','D','W'], league },
    { rank:5,  team:'Tottenham',  teamLogo: getClubLogo('Tottenham',  'enet/8586.png'),  played:33, won:16, drawn:10,lost:7,  gf:55, ga:42, gd:13,  pts:58, form:['W','W','D','L','W'], league },
    { rank:6,  team:'Aston Villa',teamLogo: getClubLogo('Aston Villa','teambadge/aston-villa-2024.png'), played:33, won:15, drawn:9, lost:9,  gf:52, ga:44, gd:8,   pts:54, form:['D','W','L','W','W'], league },
    { rank:7,  team:'Newcastle',  teamLogo: getClubLogo('Newcastle',  'enet/10261.png'), played:33, won:14, drawn:8, lost:11, gf:50, ga:45, gd:5,   pts:50, form:['W','L','W','D','W'], league },
    { rank:8,  team:'Man Utd',    teamLogo: getClubLogo('Man Utd',    'enet/10260.png'), played:33, won:12, drawn:7, lost:14, gf:42, ga:48, gd:-6,  pts:43, form:['L','D','W','L','D'], league },
    { rank:9,  team:'Brighton',   teamLogo: getClubLogo('Brighton',   'enet/8191.png'),  played:33, won:11, drawn:9, lost:13, gf:45, ga:50, gd:-5,  pts:42, form:['D','W','L','D','W'], league },
    { rank:10, team:'West Ham',   teamLogo: getClubLogo('West Ham',   'enet/8654.png'),  played:33, won:11, drawn:8, lost:14, gf:40, ga:52, gd:-12, pts:41, form:['L','L','W','D','W'], league },
  ]
}

// ─── Fixtures — Same scores endpoint ─────────────────────────────────────────
export async function fetchLiveFixtures(dateStr?: string): Promise<LiveFixture[]> {
  const matches = await fetchLiveMatches(dateStr)
  return matches.map(m => ({
    id: `f-${m.id}`,
    home: m.home,
    away: m.away,
    homeLogo: m.homeLogo,
    awayLogo: m.awayLogo,
    time: m.status || '20:00',
    date: m.date,
    league: m.league,
    venue: m.venue,
    status: m.status,
    leagueBadge: m.leagueBadge,
  }))
}

// ─── Timezone & Geo Info Helper ───────────────────────────────────────────────
export function getUserTimezoneInfo(): { timezone: string; offsetStr: string } {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    const offsetMin = -new Date().getTimezoneOffset()
    const sign = offsetMin >= 0 ? '+' : '-'
    const hh = String(Math.floor(Math.abs(offsetMin) / 60)).padStart(2, '0')
    const mm = String(Math.abs(offsetMin) % 60).padStart(2, '0')
    return { timezone: tz, offsetStr: `GMT${sign}${hh}:${mm}` }
  } catch {
    return { timezone: 'UTC', offsetStr: 'GMT+00:00' }
  }
}

// ─── LiveScore Catalog Breakdown Analyzer ─────────────────────────────────────
export interface LiveCatalogStats {
  totalRegions: number
  totalCompetitions: number
  totalLeagues: number
  totalMatchesToday: number
  totalTeamsToday: number
  regionsList: string[]
  competitionsList: string[]
}

export async function fetchLiveCatalogStats(dateStr?: string): Promise<LiveCatalogStats> {
  try {
    const formattedDate = dateStr
      ? dateStr.replace(/-/g, '')
      : new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const url = `/api/livescore/v1/api/app/date/soccer/${formattedDate}/0?MD=1`
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Origin': 'https://www.livescore.com',
        'Referer': 'https://www.livescore.com/',
      }
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()

    const regionsSet = new Set<string>()
    const compSet = new Set<string>()
    const leaguesSet = new Set<string>()
    const teamsSet = new Set<string>()
    let totalMatches = 0

    if (data?.Stages && Array.isArray(data.Stages)) {
      data.Stages.forEach((stage: any) => {
        if (stage.Cnm) regionsSet.add(stage.Cnm)
        if (stage.CompN) compSet.add(stage.CompN)
        if (stage.Snm) leaguesSet.add(`${stage.Cnm || ''} - ${stage.Snm}`)
        
        if (stage.Events && Array.isArray(stage.Events)) {
          totalMatches += stage.Events.length
          stage.Events.forEach((evt: any) => {
            if (evt.T1?.[0]?.Nm) teamsSet.add(evt.T1[0].Nm)
            if (evt.T2?.[0]?.Nm) teamsSet.add(evt.T2[0].Nm)
          })
        }
      })
    }

    return {
      totalRegions: regionsSet.size,
      totalCompetitions: compSet.size,
      totalLeagues: leaguesSet.size,
      totalMatchesToday: totalMatches,
      totalTeamsToday: teamsSet.size,
      regionsList: Array.from(regionsSet).sort(),
      competitionsList: Array.from(compSet).sort(),
    }
  } catch {
    return {
      totalRegions: 24,
      totalCompetitions: 45,
      totalLeagues: 68,
      totalMatchesToday: 120,
      totalTeamsToday: 240,
      regionsList: ['England', 'Spain', 'Germany', 'Italy', 'France', 'International', 'CONCACAF', 'CONMEBOL', 'Africa'],
      competitionsList: ['Premier League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1', 'UEFA Champions League', 'UEFA Europa League', 'UEFA Super Cup', 'Leagues Cup', 'Copa Libertadores', 'Copa Sudamericana'],
    }
  }
}

export interface LiveMatchDetails {
  id: string
  referee?: string
  venue?: string
  aggregate?: string
  h2hGroups?: {
    groupTitle: string
    subtitle?: string
    categoryType?: 'h2h' | 'home' | 'away'
    matches: {
      id: string
      date: string
      home: string
      homeScore: number
      away: string
      awayScore: number
      status: string
      homeLogo?: string
      awayLogo?: string
    }[]
  }[]
  summary: {
    min: string
    team: 'home' | 'away' | 'system'
    text: string
    type: 'goal' | 'card' | 'status' | 'assist'
    score?: string
  }[]
  lineups: {
    confirmed: boolean
    homeFormation: string
    awayFormation: string
    homeStarters: { num: number; name: string; pos: string }[]
    awayStarters: { num: number; name: string; pos: string }[]
    benchHome: { num: number; name: string; pos: string }[]
    benchAway: { num: number; name: string; pos: string }[]
    substitutions: { min: string; inNum: number; inName: string; outNum: number; outName: string; side: 'home' | 'away' }[]
    injuries: { num: number; name: string; reason: string; team?: 'home' | 'away' }[]
    coaches: { homeCoach?: string; homeCountry?: string; awayCoach?: string; awayCountry?: string }
  }
  stats?: {
    possessionHome: number
    possessionAway: number
    shotsHome: number
    shotsAway: number
    shotsOnTargetHome: number
    shotsOnTargetAway: number
    cornersHome: number
    cornersAway: number
    foulsHome: number
    foulsAway: number
    yellowCardsHome: number
    yellowCardsAway: number
    redCardsHome: number
    redCardsAway: number
    offsidesHome: number
    offsidesAway: number
  }
}

export async function fetchLiveMatchDetails(matchId: string): Promise<LiveMatchDetails | null> {
  try {
    const incsUrl = `/api/livescore/v1/api/app/incidents/soccer/${matchId}`
    const luUrl = `/api/livescore/v1/api/app/lineups/soccer/${matchId}`
    const infoUrl = `/api/livescore/v1/api/app/info/soccer/${matchId}`
    const statsUrl = `/api/livescore/v1/api/app/statistics/soccer/${matchId}`

    const [incsRes, luRes, infoRes, statsRes] = await Promise.all([
      fetch(incsUrl, { headers: { 'Accept': 'application/json' } }).catch(() => null),
      fetch(luUrl, { headers: { 'Accept': 'application/json' } }).catch(() => null),
      fetch(infoUrl, { headers: { 'Accept': 'application/json' } }).catch(() => null),
      fetch(statsUrl, { headers: { 'Accept': 'application/json' } }).catch(() => null),
    ])

    const incsData = incsRes && incsRes.ok ? await incsRes.json() : null
    const luData = luRes && luRes.ok ? await luRes.json() : null
    const infoData = infoRes && infoRes.ok ? await infoRes.json() : null
    const statsData = statsRes && statsRes.ok ? await statsRes.json() : null

    // Parse Timeline Summary Events
    const summary: LiveMatchDetails['summary'] = []

    const parseSingleIncident = (inc: any, defaultMin?: number, defaultNm?: number) => {
      const minVal = inc.Min ?? defaultMin ?? 0
      const minEx = inc.MinEx ? `+${inc.MinEx}` : ''
      const minStr = `${minVal}${minEx}'`
      const side: 'home' | 'away' = (inc.Nm ?? defaultNm) === 1 ? 'home' : 'away'
      const pName = ((inc.Fn ? `${inc.Fn} ` : '') + (inc.Ln || inc.Pn || inc.Snm || '')).trim()

      let type: 'goal' | 'card' | 'status' | 'assist' = 'status'
      let text = pName

      const it = inc.IT
      if (it === 36) {
        type = 'goal'
        text = `⚽ Goal: ${pName}`
      } else if (it === 37) {
        type = 'goal'
        text = `⚽ Penalty Goal: ${pName}`
      } else if (it === 39) {
        type = 'goal'
        text = `⚽ Own Goal: ${pName}`
      } else if (it === 43 || it === 35) {
        type = 'card'
        text = `🟨 Yellow Card: ${pName}`
      } else if (it === 44) {
        type = 'card'
        text = `🟥 Red Card: ${pName}`
      } else if (it === 45) {
        type = 'card'
        text = `🟨🟥 Second Yellow Card: ${pName}`
      } else if (it === 63) {
        type = 'assist'
        text = `👟 Assist: ${pName}`
      } else if (it === 61) {
        type = 'status'
        text = `🔄 Substitution: ${pName}`
      } else if (pName) {
        text = pName
      }

      if (!text) return

      const scoreStr = inc.Sc ? `${inc.Sc[0]} - ${inc.Sc[1]}` : undefined
      summary.push({
        min: minStr,
        team: side,
        text: scoreStr ? `${text} [${scoreStr}]` : text,
        type,
        score: scoreStr
      })
    }

    if (incsData?.Incs) {
      Object.keys(incsData.Incs).forEach(halfKey => {
        const events = incsData.Incs[halfKey]
        if (Array.isArray(events)) {
          events.forEach((item: any) => {
            if (Array.isArray(item.Incs) && item.Incs.length > 0) {
              item.Incs.forEach((subInc: any) => {
                parseSingleIncident(subInc, item.Min, item.Nm)
              })
            } else if (item.IT || item.Pn || item.Fn || item.Ln) {
              parseSingleIncident(item, item.Min, item.Nm)
            }
          })
        }
      })
    }

    // Parse Lineups (Starters & Substitutes)
    const homeStarters: { num: number; name: string; pos: string }[] = []
    const awayStarters: { num: number; name: string; pos: string }[] = []
    const benchHome: { num: number; name: string; pos: string }[] = []
    const benchAway: { num: number; name: string; pos: string }[] = []
    let homeFormation = ''
    let awayFormation = ''

    // Parse Injuries & Suspensions — stored inside each team's object as Lu[idx].IS
    const injuries: { num: number; name: string; reason: string; team: 'home' | 'away' }[] = []

    // Parse Coaches
    const coaches: { homeCoach?: string; homeCountry?: string; awayCoach?: string; awayCountry?: string } = {}

    if (luData?.Lu && Array.isArray(luData.Lu)) {
      luData.Lu.forEach((teamLu: any, idx: number) => {
        const isHome = idx === 0
        const starters = isHome ? homeStarters : awayStarters
        const bench = isHome ? benchHome : benchAway

        // Formation (Fl field)
        const formation = teamLu.Fl || ''
        if (isHome) homeFormation = formation
        else awayFormation = formation

        // Players — PosA/Pos 10 = Coach, Fp/PosA 1-4 = Starters, Fp undefined / PosA 5 = Substitutes
        if (Array.isArray(teamLu.Ps)) {
          teamLu.Ps.forEach((p: any, pIdx: number) => {
            if (p.Pon === 'COACH' || p.PosA === 10 || p.Pos === 10) {
              const coachName = ((p.Fn ? `${p.Fn} ` : '') + (p.Ln || p.Pn || '')).trim()
              if (isHome) {
                coaches.homeCoach = coachName
                coaches.homeCountry = p.Cn || p.Nat || ''
              } else {
                coaches.awayCoach = coachName
                coaches.awayCountry = p.Cn || p.Nat || ''
              }
              return
            }

            const pName = ((p.Fn ? `${p.Fn} ` : '') + (p.Ln || p.Pn || p.Snm || 'Player')).trim()
            const posMap: Record<number, string> = { 1: 'Goalkeeper', 2: 'Defender', 3: 'Midfielder', 4: 'Forward', 5: 'Substitute' }
            const pos = p.Pon || posMap[p.PosA] || posMap[p.Pos] || 'Player'

            const isStarter = (p.Fp !== undefined) || (p.PosA !== undefined && p.PosA <= 4) || (pIdx < 11 && p.PosA !== 5)

            if (isStarter) {
              starters.push({ num: p.Snu || 0, name: pName, pos })
            } else {
              bench.push({ num: p.Snu || 0, name: pName, pos })
            }
          })
        }

        // Substitutes / Bench (if present in explicit Subs array)
        if (Array.isArray(teamLu.Subs)) {
          teamLu.Subs.forEach((p: any) => {
            const pName = ((p.Fn ? `${p.Fn} ` : '') + (p.Ln || p.Pn || p.Snm || 'Player')).trim()
            const pos = p.Pon || 'Substitute'
            bench.push({ num: p.Snu || 0, name: pName, pos })
          })
        }

        // Injuries & Suspensions — in Lu[idx].IS
        if (Array.isArray(teamLu.IS)) {
          teamLu.IS.forEach((inj: any) => {
            const pName = ((inj.Fn ? `${inj.Fn} ` : '') + (inj.Ln || inj.Pn || inj.Snm || '')).trim()
            injuries.push({
              num: inj.Snu || 0,
              name: pName,
              reason: inj.Rs || 'Injury',
              team: isHome ? 'home' : 'away'
            })
          })
        }
      })
    }

    // Parse Referee
    let referee: string | undefined
    if (infoData?.Refs && Array.isArray(infoData.Refs) && infoData.Refs.length > 0) {
      referee = infoData.Refs[0].Nm
    } else if (luData?.Ref) {
      const ref = luData.Ref
      const refName = ((ref.Fn ? `${ref.Fn} ` : '') + (ref.Ln || ref.Nm || '')).trim()
      if (refName) referee = refName
    } else if (luData?.Officials && Array.isArray(luData.Officials)) {
      const refObj = luData.Officials.find((o: any) => o.type === 'Referee' || o.OfficialType === 1)
      if (refObj) referee = ((refObj.Fn ? `${refObj.Fn} ` : '') + (refObj.Ln || '')).trim()
    }

    // Parse Venue
    let venue: string | undefined
    if (infoData?.Vnm) {
      venue = infoData.Vnm + (infoData.Vcy ? ` (${infoData.Vcy})` : '')
    }

    // Parse Aggregate score from incidents data
    let aggregate: string | undefined
    if (incsData?.Agg) {
      aggregate = `Agg ${incsData.Agg[0]} - ${incsData.Agg[1]}`
    } else if (incsData?.Ta1 !== undefined && incsData?.Ta2 !== undefined) {
      aggregate = `Agg ${incsData.Ta1} - ${incsData.Ta2}`
    }

    // Parse Opta Match Statistics
    let stats: LiveMatchDetails['stats'] = undefined
    if (statsData?.Stat && Array.isArray(statsData.Stat) && statsData.Stat.length >= 2) {
      const hStat = statsData.Stat.find((s: any) => s.Tnb === 1) || statsData.Stat[0]
      const aStat = statsData.Stat.find((s: any) => s.Tnb === 2) || statsData.Stat[1]

      const pssHome = hStat.Pss !== undefined ? hStat.Pss : 50
      const pssAway = aStat.Pss !== undefined ? aStat.Pss : (100 - pssHome)
      const shOnHome = hStat.Shon || 0
      const shOnAway = aStat.Shon || 0
      const shOffHome = hStat.Shof || 0
      const shOffAway = aStat.Shof || 0
      const shWdHome = hStat.Shwd || 0
      const shWdAway = aStat.Shwd || 0
      const shBlHome = hStat.Shbl || 0
      const shBlAway = aStat.Shbl || 0

      const shotsHome = shOnHome + shOffHome + shWdHome + shBlHome
      const shotsAway = shOnAway + shOffAway + shWdAway + shBlAway

      stats = {
        possessionHome: pssHome,
        possessionAway: pssAway,
        shotsHome,
        shotsAway,
        shotsOnTargetHome: shOnHome,
        shotsOnTargetAway: shOnAway,
        cornersHome: hStat.Cos || 0,
        cornersAway: aStat.Cos || 0,
        foulsHome: hStat.Fls || 0,
        foulsAway: aStat.Fls || 0,
        yellowCardsHome: hStat.Ycs || 0,
        yellowCardsAway: aStat.Ycs || 0,
        redCardsHome: hStat.Rcs || 0,
        redCardsAway: aStat.Rcs || 0,
        offsidesHome: hStat.Ofs || 0,
        offsidesAway: aStat.Ofs || 0,
      }
    }

    return {
      id: matchId,
      referee: referee || undefined,
      venue: venue || undefined,
      aggregate,
      summary,
      stats,
      lineups: {
        confirmed: homeStarters.length > 0,
        homeFormation,
        awayFormation,
        homeStarters,
        awayStarters,
        benchHome,
        benchAway,
        substitutions: [],
        injuries,
        coaches,
      }
    }
  } catch {
    return null
  }
}

/**
 * Fetches H2H matches from LiveScore SSR data by fetching the match page HTML
 */
export async function fetchMatchH2H(matchId: string, homeTeam: string, awayTeam: string, categorySlug?: string, leagueSlug?: string): Promise<LiveMatchDetails['h2hGroups'] | null> {
  try {
    // Construct url path e.g. /en/football/europe/europa-league/cs-universitatea-craiova-vs-kups/1838881/h2h/
    const cat = categorySlug || 'football'
    const lg = leagueSlug || 'league'
    const slugHome = homeTeam.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const slugAway = awayTeam.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const pageUrl = `/api/ls-page/en/football/${cat}/${lg}/${slugHome}-vs-${slugAway}/${matchId}/h2h/`

    const res = await fetch(pageUrl, { headers: { 'Accept': 'text/html' } })
    if (!res.ok) return null

    const html = await res.text()
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__[^>]*>([\s\S]*?)<\/script>/)
    if (!nextDataMatch) return null

    const nextData = JSON.parse(nextDataMatch[1])
    const event = nextData?.props?.pageProps?.initialEventData?.event
    const headToHead = event?.headToHead
    if (!headToHead) return null

    const groups: LiveMatchDetails['h2hGroups'] = []

    const categories: { type: 'h2h' | 'home' | 'away'; sections: any[] }[] = Array.isArray(headToHead)
      ? [{ type: 'h2h', sections: headToHead }]
      : [
          { type: 'h2h', sections: headToHead.h2h || [] },
          { type: 'home', sections: headToHead.home || [] },
          { type: 'away', sections: headToHead.away || [] },
        ]

    categories.forEach(cat => {
      cat.sections.forEach((section: any) => {
        const stageInfo = section.stage || (section.events?.[0]?.stage)
        const groupTitle = stageInfo?.stageName || stageInfo?.countryName || 'Matches'
        const subtitle = stageInfo?.countryName || ''

        const matchesList: any[] = []
        if (Array.isArray(section.events)) {
          section.events.forEach((evt: any) => {
            const homeImg = evt.homeSlug ? `/api/ls-cdn/medium/${evt.homeSlug}` : getClubLogo(evt.homeName || '')
            const awayImg = evt.awaySlug ? `/api/ls-cdn/medium/${evt.awaySlug}` : getClubLogo(evt.awayName || '')

            matchesList.push({
              id: evt.id || `h2h-${Math.random()}`,
              date: evt.startDateTimeString ? `${evt.startDateTimeString.slice(6,8)}/${evt.startDateTimeString.slice(4,6)}/${evt.startDateTimeString.slice(0,4)}` : 'FT',
              home: evt.homeName || 'Home',
              homeScore: parseInt(evt.homeScore || '0'),
              away: evt.awayName || 'Away',
              awayScore: parseInt(evt.awayScore || '0'),
              status: evt.statusCode || 'FT',
              homeLogo: homeImg,
              awayLogo: awayImg,
            })
          })
        }

        if (matchesList.length > 0) {
          groups.push({
            groupTitle,
            subtitle,
            categoryType: cat.type,
            matches: matchesList,
          })
        }
      })
    })

    return groups.length > 0 ? groups : null
  } catch (err) {
    console.warn('[LiveScoreAPI] fetchMatchH2H error:', err)
    return null
  }
}

// ── Live Commentary ──────────────────────────────────────────────
export interface CommentaryEntry {
  minute: string
  text: string
  isKeyEvent: boolean  // goals, cards, substitutions
}

export async function fetchMatchCommentary(matchId: string): Promise<CommentaryEntry[]> {
  try {
    const res = await fetch(`/api/ls-commentary/v1/api/app/commentary/${matchId}`)
    if (!res.ok) return []
    const data = await res.json()
    if (!data?.Cmts || !Array.isArray(data.Cmts)) return []

    return data.Cmts.map((c: any) => ({
      minute: c.Min != null ? `${c.Min}'` : '',
      text: c.Txt || '',
      isKeyEvent: c.IT === 1,
    }))
  } catch (err) {
    console.warn('[LiveScoreAPI] fetchMatchCommentary error:', err)
    return []
  }
}
