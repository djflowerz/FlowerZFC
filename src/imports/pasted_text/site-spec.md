# Complete Site Specification — [YOUR SITE NAME]
Full navigation map, every page's sections and buttons, and typography guidance. Use this alongside the build prompt to check your Figma Make output (or any generated build) against a complete spec.

---

## 1. TYPOGRAPHY — to avoid the "AI-generated" look

The single biggest tell of an AI-generated site is **Inter for everything** (headlines and body, no contrast) plus a generic purple/blue gradient hero. Avoid both.

**Recommended pairing:**
- **Headlines/scores/nav: Big Shoulders** (variable font) — a condensed, bold, energetic display face built specifically for sports/fitness/music branding. Use it for match scores, headlines, section titles, big numbers (goal counts, standings positions).
- **Body text: Hanken Grotesk** — a screen-optimized, highly legible workhorse for article body, comments, UI labels. Pairs cleanly with Big Shoulders' condensed energy.
- **Multilingual fallback: Noto Sans** — set as the fallback font stack for locales Hanken Grotesk doesn't fully cover (Arabic, some Swahili diacritics). This matters specifically because you're multi-language — a font that silently falls back to a mismatched system font on non-Latin scripts is another "looks generic/broken" tell.

**Explicitly avoid:**
- Inter + Roboto as your only two fonts (the default template combo)
- Purple-to-blue gradients on hero sections (the most recognizable "AI slop" signal in 2025–2026)
- Overuse of rounded-corner glassmorphism cards everywhere — mix flat, high-contrast blocks (score cards, breaking news banners) with editorial whitespace on article pages
- Generic stock photography — use real match photography, API-Football's team/player badge assets, and your own YouTube thumbnails instead

**Color system note:** pick one strong accent color tied to energy/urgency (for live match indicators, breaking news tags) — red or a saturated orange works well for football — and keep the rest of the palette restrained (near-black text, off-white background, one neutral gray scale). Avoid multiple competing bright accent colors.

---

## 2. GLOBAL NAVIGATION

### Header (desktop)
- Logo (links home)
- Primary nav: **Scores | Fixtures | Standings | News | Transfers | Videos | Mixes | Shop**
- A small **"Advertise"** link/button, visually distinct (e.g. outlined button style, not just a text link) placed at the far right of the header near the account icon — this is commonly left out or buried only in the footer, but advertisers need to find it without hunting
- Language switcher (flag or code dropdown: EN / SW / FR / ES / PT / AR)
- Search icon → opens search overlay (site-wide: teams, players, articles)
- Notification bell icon (if logged in) → dropdown of goal alerts/replies to their comments
- Account icon → dropdown: My Teams, Saved Articles, Predictions, Settings, Log out (or "Log In / Sign Up" if logged out)
- Dark mode toggle

### Header (mobile)
- Logo (center or left)
- Hamburger menu → slide-out drawer with full primary nav + language switcher + account links
- Search icon
- Sticky bottom nav bar (common pattern for sports apps): **Home | Scores | News | Predictions | Account** — 5 icons, always visible, since live scores and predictions are check-frequently features

### Footer
- Site logo + one-line tagline
- Columns:
  - **Sections:** Scores, Fixtures, Standings, Transfers, Videos, Shop
  - **Company:** About, Contact, **Advertise With Us** (bolded/highlighted list item, not buried at the bottom of the column), Careers (optional)
  - **Legal:** Privacy Policy, Terms of Service, Cookie Policy, DMCA
  - **Follow us:** YouTube, X, Instagram, WhatsApp channel/community link, Facebook
- Language switcher (repeated)
- Newsletter signup input + Subscribe button
- Copyright line

---

## 3. PAGE-BY-PAGE SPEC

### Homepage
- **Breaking news banner** (dismissible, top of page, only shows during live/urgent events e.g. a goal just scored in a followed match)
- **Hero section:** top story — headline, image, "Read more" button
- **Live scores ticker** — horizontally scrollable strip of live/today's matches, each a tappable card → goes to that match's live page. Auto-refreshes every 60s with a small pulsing "LIVE" indicator on in-progress matches.
- **Latest Shorts strip** — horizontally scrollable, embedded YouTube Shorts thumbnails, tap to play inline (lazy-loaded)
- **Latest Videos grid** — long-form YouTube uploads, thumbnail + title + view count, tap to play inline or open in modal
- **Trending transfer news** — 3-4 card grid, each with "Confirmed/Rumor" tag, headline, thumbnail
- **Latest articles feed** — infinite-scroll or paginated grid, each card: image, headline, category tag, like count, comment count, "Read more". **The entire card (image + headline + whitespace, not just the "Read more" text) must be a clickable link to that article's page** — a card where only a small text link works while the image/headline don't is a common broken pattern
- **Featured/hero articles specifically:** same rule — the hero image and headline block must both link to the article, test by clicking the image itself, not just a button
- **Predictions widget** — "Predict tonight's big match" CTA card → links to Predictions page
- **Standings snapshot** — mini table for a top league (e.g. EPL), "View full table" button
- Buttons that must work: every card is a full link to its destination; ticker arrows scroll left/right; "Read more"/"View full table"/"Subscribe" buttons all functional, not decorative

### Live Scores page
- **Date selector:** horizontal strip of day tabs — "Yesterday | Today | Tomorrow" as quick-access defaults, with a calendar icon that opens a full month-view date picker for jumping to any date (past results or future fixtures) — this matches the pattern every major live-score site (Sofascore, Flashscore, FotMob) uses, and is a commonly-missing piece if only "Today" is built
- **League picker:** a dropdown/sidebar list grouped logically — "Favorites" (leagues the user follows, pinned at top), then "Popular" (top 5 European leagues + Champions League), then an alphabetical or by-country full list, with a small search box at the top of the picker for typing a league/country name directly rather than scrolling
- League filter chips reflect the picker selection and are removable (X on each chip) to quickly clear a filter
- Match cards: team badges/crests (never a missing/broken image), score, match minute (if live) with a pulsing "LIVE" dot, venue on tap/expand
- **Live match minute must actually tick in real time, not just show a frozen number:** the API only returns the current minute on each poll (every 30–60s), so the frontend needs its own client-side timer (`setInterval`, incrementing every second/minute) that counts up between polls, then re-syncs to the exact server value whenever a fresh poll comes in. A minute counter that only updates on each API refresh will look stuck/frozen for the seconds in between — this is a common bug worth explicitly testing: watch a live match card for 2+ minutes and confirm the number keeps moving, not just jumping every 30-60s
- Tapping a card expands or navigates to **Match Detail page**:
  - Score header with both team crests and the same live-ticking minute counter described above (client-side timer between polls, synced on each refresh — must not freeze)
  - Tabs: **Overview | Lineups | Stats | Commentary | H2H**
  - Overview: goal scorers, cards, substitutions timeline
  - Lineups: formation diagram, starting XI + subs, player ratings once available (post-match or live-updating)
  - Stats: possession, shots (on/off target), corners, fouls, cards — shown as left/right bar comparisons
  - Commentary: minute-by-minute text feed (auto-updating during live matches)
  - **H2H (head-to-head):** past meetings between these two teams, results list
  - "Predict this match" button if match hasn't started
  - Share button (generates a pre-filled share link with score/result)

### Fixtures page
- Same date/league picker pattern as Live Scores (day-tab strip + full calendar + grouped league picker)
- List of upcoming matches with kickoff time **converted to visitor's local timezone**
- "Remind me" bell icon per match → sets a push notification for kickoff (requires login)
- "Add to calendar" button (generates .ics file)
- **TV/broadcast info** per match where available (which channel/streaming service is airing it in the visitor's region, if your data source provides it) — a detail most fan-facing fixture lists include

### Standings page
- League selector tabs (must include all major leagues you're covering, not just one)
- Full table with ALL required columns: position (#), club crest/logo + name, played (P), won (W), drawn (D), lost (L), goals for (GF), goals against (GA), goal difference (GD), points (Pts)
- **Every row needs the actual club crest image next to the name** — a standings table with no logos is a common thing that gets left out; pull crest URLs from API-Football's team data, don't substitute placeholder icons
- Color-coded zone bands on the left edge of qualifying positions: Champions League zone, Europa/Conference zone, relegation zone (use each league's actual qualification rules — these differ by league/season, pull from API-Football if it provides them, otherwise hardcode per league)
- Toggle: Full table / Home form / Away form / Last 5 matches (shows W/D/L colored dots per team for their last 5 results)
- Tapping a team row (the whole row, not just the name text) → goes to that Club Hub page
- Mobile: table scrolls horizontally or collapses to show only Pos/Crest/Name/Pts by default with a "Show full stats" expand toggle

### Club Hub page (per team)
- **Header section:** club crest/logo (large), club name, league name + current league position, stadium name, founded year — this header is frequently left incomplete, make sure crest image actually loads (not broken image icon) and stadium/founding info isn't skipped
- Tabs: **Fixtures | Results | Squad | News | Stats**
- Fixtures tab: upcoming matches for this club specifically
- Results tab: past results for this club, W/D/L indicator per match
- Squad tab: player grid, each card shows player photo + crest of their nation + position + jersey number, tap → Player Profile page
- News tab: articles tagged to this club (must actually be filtered to this club, not showing all site articles)
- Stats tab: season stats — goals scored/conceded, clean sheets, top scorer for the club, disciplinary record
- "Follow this club" button (adds to user's "My Teams," powers personalized homepage feed and push alerts) — button state must toggle and persist

### Transfer News page
- Filter chips: All / Confirmed / Rumors / Done Deals — chips must actually filter the visible list, not just visually toggle
- **Transfer Tracker grid** — visual board of players moving, grouped by club, with status tags. **Clicking any player entry in the tracker must open that transfer's detail** — either an expanding card in place or a modal/panel showing: player photo, from club, to club, fee (if known), status (rumor/here-we-go/confirmed), source attribution, and a "Read full story" link to the related article if one exists. A tracker where entries don't open anything on click is a common broken pattern — every player chip needs a click handler, not just the grid layout
- Article feed below, same card format as homepage articles (full card clickable, per the homepage rule above) but transfer-tagged only

### Article (single) page
- Headline, byline (author name/avatar), publish date, category tag, estimated read time
- Hero image
- Body content (rich text)
- Inline ad slots (after 2nd paragraph, mid-article)
- **Like button** (heart/thumbs icon + count, toggles on click, requires login, one like per user)
- **Share buttons row:** WhatsApp, X, Facebook, Copy Link — each must actually open a pre-filled share dialog, not just be styled icons
- **Save/bookmark button** (requires login)
- **Comment section:**
  - Comment input box (requires login, shows "Log in to comment" if logged out)
  - Sort dropdown: Newest / Most liked
  - Each comment: avatar, username, text, like button, reply button, timestamp, report/flag icon
  - "Load more comments" button — must fetch and append the next page of comments (e.g. next 20) to the existing list without a full page reload; button should show a loading state while fetching and disappear/disable once all comments are loaded (a "Load more" button that does nothing on click is a common broken pattern — it needs real pagination wired to the comments API, not just a static button with no handler)
- Related articles grid at bottom
- Author bio card (optional)

### Player Profile page
- Photo, name, position, club, nationality, age
- Season stats (goals, assists, appearances, cards)
- Injury/suspension status badge if applicable
- Related transfer news / articles tagged to this player

### Videos page
- Tabs: **Shorts | Long-form | All**
- Grid of embedded videos (lazy-loaded), thumbnail + title + view count + upload date
- **Clicking any video thumbnail (here, on the homepage strip, on club/player pages, anywhere a video appears) must open a player — this is a core interaction, not decorative:**
  - Opens a **modal/lightbox overlay** (darkened background, video centered) — does not navigate away from the current page
  - Player is the official **YouTube iframe embed** with `autoplay=1` once opened
  - Modal includes: close button (X, top-right, and closes on background click or Escape key), video title, view count, upload date
  - Below the player inside the modal: Like/Share/Save buttons for that video, and a "Watch on YouTube" link (opens YouTube in a new tab — required by YouTube's embed terms, don't hide this)
  - A "Up next" row of related videos below the player (same channel), clicking one swaps the player content without closing the modal
  - On mobile: modal is full-screen instead of centered overlay
  - Shorts specifically: since they're vertical, the modal should use a narrower vertical player frame, and support swipe-up/down to move to the next Short in the strip (TikTok/Reels-style behavior), not just a single static embed

### Mixes / Events page (Bigstone Entertainment section — kept separate from football content)
- Positioned as its own top-level section (`/mixes`), not blended into football nav, to keep the site's core SEO topic (football) unmuddied
- **Mixes grid:** embedded **Mixcloud** players (streaming only, not downloadable files — Mixcloud holds the licensing DJ mixes need that self-hosted downloads don't). Each card: cover art, mix title, genre tag, play count, embedded player
- **Poster/flyer gallery:** grid of event poster images (your own designs — no licensing issue), lightbox on tap to view full size
- **Upcoming events list:** date, venue, city, ticket link (if applicable), "Add to calendar" button
- **Past events archive:** collapsed/paginated list with photos
- **Booking/contact CTA:** "Book DJ Flowerz" button → contact form (name, event date, venue, message, "Send inquiry" button — must actually send)
- Social links specific to this section: Mixcloud profile, Instagram, WhatsApp business/booking line
- No download buttons anywhere on this page — streaming embeds only

### Predictions / Polls page
- List of upcoming predictable matches
- Per match: simple W/D/L or scoreline prediction input, "Submit prediction" button
- **Leaderboard tab:** ranked list of top predictors (username, avatar, points, badge)
- User's own prediction history/accuracy stat

### Shop / Merch — full section (Product Listing, Single Product, Cart, Checkout)

**Product Listing page (`/shop`)**
- Category filter chips (Apparel / Accessories / Posters, etc.) — must actually filter, not just style-toggle
- Product grid: each card shows product image, name, price (auto-converted to visitor's currency), and is fully clickable → goes to that product's Single Product page (the whole card, not a hidden link)
- Sort dropdown (Price low-high / high-low / Newest)

**Single Product page (`/shop/[product]`) — this must exist as a real page, not just a modal or missing route**
- Image gallery: main image + thumbnail strip, clicking thumbnails swaps the main image; support pinch-zoom or click-to-zoom on mobile/desktop
- Product name, price, short description
- **Variant selectors:** size dropdown/buttons (S/M/L/XL), color swatches if applicable — selecting a variant updates the displayed price/image if they differ, and out-of-stock variants should be visibly disabled, not just silently unselectable
- Quantity selector (+/- stepper, defaults to 1)
- "Add to Cart" button — must actually add the item with selected variant/quantity, update the cart badge, and show a confirmation (toast or slide-in cart preview), not fail silently
- Full product description/details tab (materials, sizing guide, shipping estimate)
- Related/"You might also like" product grid at the bottom

**Cart (slide-out drawer, accessible from the cart icon anywhere on the site)**
- List of items: thumbnail, name, selected variant, quantity adjuster (+/-), remove (X) button, line-item price
- Subtotal shown live, updating as quantities change
- "Checkout" button → proceeds to Checkout flow
- Empty state: "Your cart is empty" message + "Browse shop" button

**Checkout flow — must be a real, complete flow, not a dead end**
- Step 1, **Shipping information:** full name, email, phone, address line 1/2, city, region/state, postal code, country dropdown (drives currency/shipping cost calc)
- Step 2, **Shipping method:** options with cost + estimated delivery time, radio-select
- Step 3, **Billing:** "Same as shipping" checkbox (default checked) or separate billing address form if unchecked
- Step 4, **Payment:** this hands off to your merch platform's actual payment processor (Printful/Printify's built-in checkout, or Stripe/PayPal if using a custom Shopify Buy Button setup) — this is real payment processing, credit/debit card fields, not a mock form with no backend
- Order summary sidebar throughout checkout: line items, subtotal, shipping cost, tax if applicable, total — updates live as shipping method changes
- **Order confirmation page** after successful payment: order number, summary of items, estimated delivery, "confirmation email sent to [email]" message
- Error handling: failed payment shows a clear error message and lets the user retry, doesn't just hang or silently fail

### Advertise With Us page — full detail
- Hero section: clear headline ("Reach millions of football fans worldwide") + traffic snapshot stat (monthly visitors, pageviews — pulled from GA4, update periodically)
- Audience breakdown: top countries, age range, device split (mobile/desktop), interests — builds advertiser confidence
- **Ad slot catalog** with visual mockups of each placement (see Ad Placement System below), size, position on page, and price/rate card
- Sponsorship packages beyond banner ads: sponsored article, homepage takeover, newsletter sponsor slot — listed as tiered packages, not just raw banner inventory
- Case studies/testimonials section (add once you have real advertisers)
- Contact form: name, company, email, phone (optional), budget range dropdown, message, "Send inquiry" button — must actually send (via a form backend or your own API route) and show a confirmation state
- FAQ section (payment terms, minimum spend, ad approval process, reporting/analytics provided to advertisers)

### About page — full detail
- Brand story: who's behind the site, why it exists, what makes it different (e.g. East Africa football focus, community-driven predictions)
- Mission statement
- Team/founder section (photo, name, short bio) — builds trust and is often required for AdSense approval, since Google checks for a real identifiable publisher behind a site
- Links to your YouTube channel, Mixcloud, socials
- Editorial standards note (how you source transfer news, correction policy) — this also supports AdSense/News-related trust signals

### Contact page — full detail
- General contact form: name, email, subject dropdown (General / Press / Correction request / Technical issue / Advertising — routes to different inboxes if desired), message, "Send" button
- Direct email address listed as text (not just a form) — some users/press prefer this
- Social/WhatsApp contact links
- Expected response time note ("We usually reply within 2 business days")
- Separate from the Advertise contact form — keep advertiser inquiries and general contact distinct so they can be routed/prioritized differently

### Legal pages — full detail (these need real substantive content, not placeholder text, especially before AdSense approval)
- **Privacy Policy** must cover: what data is collected (account info, comments, cookies, analytics), how it's used, third parties data is shared with (Google AdSense, Google Analytics, your CMS/auth provider, Printful/Printify for merch orders), cookie usage explained clearly, user rights (access/delete their data — required under GDPR for EU visitors and similar laws elsewhere), data retention, contact info for privacy questions, last-updated date
- **Terms of Service** must cover: acceptable use of the site, comment/community conduct rules, account termination conditions, disclaimer on prediction/content accuracy, intellectual property (your content vs. user-submitted comments), liability limitations, governing law/jurisdiction
- **Cookie Policy** must list: categories of cookies used (essential, analytics, advertising), specific third-party cookies (Google AdSense, GA4), how to manage/opt out, linked clearly from the cookie consent banner
- **DMCA/Copyright Notice** must cover: how to submit a takedown request if someone believes their content was used without permission, your process for responding, a designated contact/email for copyright claims — important given you're aggregating transfer news and embedding video content
- All legal pages should show a visible "Last updated: [date]" and be written in plain language, not just legal boilerplate — translated into your priority launch languages, not left English-only

---

### Account / Profile pages

**Sign Up form:**
- Fields: Full name, Email, Password, Confirm password
- Password strength indicator (weak/medium/strong) shown live as user types
- Show/hide password toggle (eye icon) on both password fields
- Checkbox: "I agree to the Terms of Service and Privacy Policy" (links open in new tab) — required, submit button stays disabled until checked
- "Create Account" button — disabled state while inactive/invalid, loading spinner state while submitting
- Inline validation errors per field (e.g. "Email already in use," "Passwords don't match," "Password must be at least 8 characters") — shown on blur/submit, not just a generic error banner
- **Social sign-up:** "Continue with Google" button (and optionally Apple) as a faster alternative to the form
- After successful signup: **email verification step** — "We've sent a verification link to [email]" screen with a "Resend email" button (rate-limited to prevent spam)
- Link at bottom: "Already have an account? Log in"

**Log In form:**
- Fields: Email, Password (with show/hide toggle)
- "Remember me" checkbox
- "Forgot password?" link
- "Log In" button — disabled/loading states same as signup
- Inline error handling: "Incorrect email or password" (deliberately vague, don't reveal which field is wrong — standard security practice)
- Social login: "Continue with Google" button
- Link at bottom: "Don't have an account? Sign up"
- Optional: rate limiting / temporary lockout after repeated failed attempts, with a message explaining the cooldown

**Forgot Password flow:**
- Step 1: Email input + "Send reset link" button → confirmation message "Check your email"
- Step 2 (via emailed link): "Set new password" form — new password + confirm password fields, same strength indicator and show/hide toggles as signup
- Success state → auto-redirects to Log In with a "Password updated, please log in" message

**Logged-in account pages:**
- **My Teams:** followed clubs list, remove (X icon per club) / add via search
- **Saved Articles:** bookmarked list, remove/unsave button per item
- **My Predictions:** history table + running accuracy %, filterable by league/date
- **Settings:**
  - Change name/email (email change requires re-verification)
  - Change password (requires current password + new password)
  - Language preference dropdown
  - Notification toggles: goal alerts (on/off), comment replies (on/off), newsletter (on/off), breaking transfer news (on/off) — each an independent switch, not one blanket toggle
  - Connected accounts (Google, if used for social login)
  - **Delete account** button — must trigger a confirmation modal ("Are you sure? This can't be undone") before actually deleting, not delete on first click
- **Log out button** — clears session/token, redirects to homepage, must actually work (test: log out, then hit browser back button, should not still appear logged in)

### Search results page
- Search bar (persists query)
- Tabs: All / Articles / Teams / Players
- Result cards per type, click-through to respective pages

### 404 / Error page
- Friendly message, search bar, "Back to home" button

### Cookie consent banner (global, appears once per session until accepted)
- "Accept All" / "Reject non-essential" / "Manage preferences" buttons — must actually gate ad personalization scripts, not just visually disappear

---

## 4. COMPONENT-LEVEL DETAIL (commonly left half-built)

### Comment system (on article pages)
- Comment input box: text field + "Post" button, character limit shown (e.g. 500 max)
- **Reply threading:** each comment has a "Reply" button → opens a nested input directly under that comment, replies indent visually one level (don't allow infinite nesting — one level deep is standard)
- Like button per comment, with live count
- **Edit/Delete:** comment author sees Edit and Delete options on their own comments (three-dot menu), others see only "Report"
- Report/flag button → confirmation ("Comment reported") + sends to moderation queue, doesn't need to explain outcome to the reporter
- Sort dropdown actually re-orders the visible list (Newest / Oldest / Most liked)
- "Load more" button paginates instead of loading hundreds of comments at once
- Logged-out state: input box is replaced with "Log in to join the conversation" button, comments are still viewable

### Notifications (bell icon dropdown)
- Badge with unread count on the bell icon
- Dropdown list: goal alerts, comment replies, breaking transfer news — each item shows an icon, short text, timestamp, and is clickable (goes to the relevant match/article/comment)
- "Mark all as read" button
- Empty state: "No notifications yet" message, not a blank dropdown
- Settings gear icon inside the dropdown → shortcuts to notification toggles in Settings

### Search (header icon → overlay)
- Opens a full-width overlay/modal with a text input, autofocused
- **Autocomplete/live results** as the user types (debounced, not one request per keystroke) — shows top 3-4 matches per category (teams, players, articles) before full submit
- Pressing Enter or "See all results" goes to the full Search Results page
- Recent searches shown when input is empty (stored locally per user)
- Close button / clicking outside closes the overlay

### Share dialog (used on articles, match results, videos)
- Clicking "Share" opens a small popover (not a full page navigation) with: WhatsApp, X, Facebook, Copy Link icons
- WhatsApp/X/Facebook icons open their respective share intent with pre-filled text + URL (test this actually opens the right app/site with correct content, a common thing that gets left as a dead button)
- Copy Link button copies the URL to clipboard AND shows a brief confirmation ("Link copied!") — silent copying with no feedback reads as broken

### Shop cart/checkout (see full Product/Cart/Checkout spec under Shop section above)
- "Add to Cart" button updates a cart icon badge count immediately (no page reload)
- Cart icon → slide-out drawer showing items, quantity adjuster (+/-), remove button per item, subtotal
- Checkout must be a complete multi-step flow (shipping → billing → payment → confirmation) handing off to real payment processing — not a mock form or dead button
- Empty cart state: "Your cart is empty" + "Browse shop" button

### Follow/Save/Predict buttons (state consistency)
- Any toggle button (Follow club, Save article, Like) must visually reflect its current state immediately on click (filled icon = active, outline = inactive) AND persist that state after a page refresh — a toggle that resets on reload will read as broken even if the click "worked" in the moment
- Prediction submission: after submitting, the input locks (can't change prediction after kickoff) and shows a confirmation state ("Prediction locked in") rather than just clearing the form

---

## 5. AD PLACEMENT SYSTEM (banner types, sizes, where each goes)

Use IAB standard ad sizes — these are what Google AdSense and every ad network expect, and building non-standard sizes means fewer advertisers can fill your slots:

- **728×90 Leaderboard** — top of page, above the main content, desktop only (highest visibility, premium rate)
- **300×250 Medium Rectangle** — the workhorse size, works everywhere: in-feed between article cards, sidebar, in-article. Build this one first if you only build one size.
- **160×600 Wide Skyscraper** — sidebar, sticky on scroll (desktop only)
- **300×600 Half Page** — sidebar or between major content sections, high-impact
- **320×50 Mobile Banner** — sticky top or bottom bar on mobile, essential since most of your traffic is mobile
- **970×250 Billboard** — optional premium homepage-only placement for direct-sold sponsorships

**Where these actually go on the site:**
- Header leaderboard (728×90 desktop / 320×50 mobile) — every page
- In-feed rectangle (300×250) — every 4th article card in any feed (homepage, transfers, club news)
- In-article rectangle (300×250) — after the 2nd paragraph of every article
- Sidebar skyscraper (160×600) — desktop only, sticky, on article and standings pages
- Live scores page: a rectangle unit between the date/league picker and the match list (high-traffic page, don't skip monetizing it)
- Sticky mobile footer banner (320×50) — persistent across all mobile pages, with a small close (X) button so it's not permanently intrusive

Each slot should render an AdSense unit by default and swap to a direct-sold banner automatically when the CMS has an active one assigned for that slot/date range — this was already specified under monetization, repeated here so it's clear it applies to every size/position listed above.

---

## 6. DATA API SOURCES (to keep the site always up to date)

- **API-Football** (api-football.com) — best starting point: free tier with no credit card, covers fixtures, live scores, standings, transfers, injuries, player/team data, and includes free copy-paste widgets. Rate-limited on the free tier, so cache server-side rather than calling per-visitor.
- **Sportmonks** — stronger paid option if you outgrow the free tier: covers 2,200+ leagues, adds lineups, xG, predictions, and odds in one call, 14-day free trial. Worth migrating to once you have real ad revenue to justify the cost.
- **TheSportsDB** or **Live-score API** — alternative/backup data sources; useful to have a second provider in mind in case your primary free tier gets rate-limited during a big match spike (a Champions League final will spike your traffic and your API calls simultaneously)
- **YouTube Data API v3** — for pulling your Shorts/long-form video feeds automatically (already specified)
- **News/transfer sourcing:** there isn't a clean "transfer news API" you can legally auto-publish from — transfer content should stay editorially written (see copyright note earlier), using API-Football's transfers endpoint only as raw data (who moved where, when) that you then write original commentary around, not as source text to republish
- **Odds/betting data** — only add this if you plan to run it as a clearly separated section with its own compliance handling (age-appropriate disclaimers, responsible gambling messaging, and kept off AdSense-monetized pages) — not a Phase 1 or Phase 2 feature given your current build stage

**Practical setup:** run a scheduled job (cron, e.g. every 30–60 seconds during live match windows, hourly otherwise) that pulls from your primary API and writes to your own database, then serve all site traffic from that database/cache — never let live visitor traffic hit the third-party API directly. This is the single most important thing for staying "always updated" without blowing through free-tier rate limits or having the site go down when a data provider has an outage.

---

## 7. ADMIN DASHBOARD — full spec

Built into Strapi (custom plugin/panel) or a separate internal Next.js admin app, whichever is easier for your AI coding tool to scaffold. Access restricted to admin-role accounts only, with its own login (separate from the public site login).

### Dashboard home
- Overview stat cards: today's pageviews, active live matches right now, pending comments to moderate, pending articles awaiting approval, active ad campaigns
- Quick links to the sections below

### Live Data Feed tab
- **This is the legitimate real-time layer** — a live view of what your API provider (API-Football/Sportmonks) is currently returning: live matches in progress, latest goals/cards as they happen, sync status/last-updated timestamp, and an error/alert indicator if the API is rate-limited or down
- This is what actually keeps your site "always updated" — pure structured data (scores, minutes, lineups, stats), not copied text from anyone
- Manual "force refresh" button in case you need to re-sync outside the normal polling schedule

### Content / Articles tab
- Article list: draft / pending review / published / archived, with filters and search
- **AI-assisted draft generator:** admin selects a completed match or a transfer data point from the Live Data Feed, clicks "Generate draft" — this produces an **original first-draft article written from the raw facts** (final score, scorers, key stats, or a transfer's player/from-club/to-club/fee) using your own AI writing tool. It is not rewriting or paraphrasing any other outlet's published article — it's generating fresh text from structured data, the same way a human writer would work from a stat sheet.
- Draft always opens in an editor for the admin to review, edit, and approve before publishing — nothing auto-publishes
- Rich text editor: formatting, image upload, embed YouTube/Mixcloud, tag article to club/player/category, set featured image, SEO title/meta description fields
- "Save draft" / "Submit for review" / "Publish" / "Schedule for later" buttons
- Version history (see previous edits, revert if needed)

### Comments Moderation tab
- Queue of flagged/reported comments, with the comment text, author, and the article it's on
- Approve / Delete / Ban user buttons per comment
- Bulk actions (select multiple, delete/approve at once)
- Banned users list, with an unban option

### Ad Management tab
- List of all ad slots (matching the Ad Placement System spec) with current status: AdSense (default) or Direct-sold (with advertiser name, campaign dates)
- "Add direct campaign" form: advertiser name, contact, ad image upload, target URL, slot position, start/end date, price paid
- Simple performance view: impressions/clicks per slot if your ad network provides that data via API

### Advertiser Inquiries tab
- List of submissions from the Advertise With Us contact form: name, company, budget range, message, date received, status (New / Contacted / Closed)

### Users tab
- Registered user list, search/filter
- View a user's activity (comments, predictions, followed clubs)
- Suspend/ban account, reset password on their behalf, manually verify an email if needed

### Shop/Merch tab
- Order list (pulled from Printful/Printify/Shopify via their API): order ID, customer, items, status, fulfillment tracking
- Product catalog management: add/edit/remove products, sync with print-on-demand catalog

### Predictions/Leaderboard tab
- View current leaderboard, manually adjust points if there's a dispute
- See prediction volume per match

### Analytics tab
- Embedded GA4 summary or key metrics pulled via the Analytics API: top articles, traffic sources, language/locale breakdown, device split
- Exportable as CSV for the media kit on the Advertise page

### Settings tab
- Manage supported languages
- Manage admin/editor user roles and permissions (e.g. Editor can draft but not publish, Admin can do everything)
- API key management (Football data API, YouTube API, translation API)
- Site-wide announcement banner toggle (for the breaking news banner feature)

---

## 8. FUNCTIONAL CHECKLIST — "every button should work"

When reviewing your generated build, click through and confirm each of these actually does something (not just styled/dead):

- [ ] Language switcher changes URL locale and translates visible UI text
- [ ] Search returns real results, not a static placeholder
- [ ] Like buttons persist state (refresh page, like should still show as liked)
- [ ] Comment submission actually posts and appears without a full page reload
- [ ] Share buttons open real share dialogs with correct pre-filled content
- [ ] "Follow club" persists to the user's account and affects homepage feed
- [ ] Predictions save and appear on the leaderboard
- [ ] Live score ticker actually updates (not a static mock)
- [ ] Date/league filters actually filter the visible list
- [ ] Cart/checkout on Shop page hands off to a real payment flow
- [ ] Contact/Advertise form actually sends (check it lands somewhere — email, DB, or dashboard)
- [ ] Cookie consent choice actually blocks/allows ad scripts accordingly
- [ ] Dark mode toggle persists across page navigation
- [ ] 404 page appears on broken links instead of a blank/error screen
- [ ] All footer links go somewhere real, not "#"
- [ ] Mixcloud embeds actually play (streaming, no dead "download" buttons on the Mixes page)
- [ ] Booking/contact form on the Mixes page actually sends
- [ ] "Load more comments" fetches and appends real additional comments, not a no-op button
- [ ] Every article card (homepage feed, featured/hero, transfer news, club news tab) opens the article on click — test clicking the image and headline directly, not just a "Read more" label
- [ ] Standings table shows club crests/logos on every row, all required columns (P/W/D/L/GF/GA/GD/Pts), and zone color-coding
- [ ] Club Hub page header shows the club crest, stadium, and founded year — not a broken image or missing fields
- [ ] Transfer Tracker entries open a detail view on click, not just a static grid
- [ ] Shop product cards open a real Single Product page (with its own URL) — not a dead card or missing route
- [ ] Single Product page: variant selection, Add to Cart, and image gallery all functional
- [ ] Full checkout flow completes end to end: cart → shipping → billing → payment → order confirmation
- [ ] "Advertise" link is visible in the header (not just buried in the footer)
- [ ] Live Scores/Fixtures date picker supports jumping to any date via a full calendar, not just Today/Yesterday/Tomorrow
- [ ] League picker lets users search/filter by name, not just scroll a long list
- [ ] Legal pages (Privacy Policy, ToS, Cookie Policy, DMCA) contain real substantive text, not lorem ipsum or one-paragraph placeholders
- [ ] Ad slots render an actual ad (test AdSense unit or placeholder) in every position listed in the Ad Placement System, not just some of them
- [ ] Live match minute counter actually ticks up second-by-second in real time — watch a live card for 2+ minutes and confirm it's not frozen between API polls