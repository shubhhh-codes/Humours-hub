# 🚀 The Humours Hub — Full Visibility Playbook
### Appear on Google, Gemini AI, ChatGPT, Bing, Maps, and everywhere else.
**Generated:** 2026-07-03 | **Priority:** Highest first

---

> [!IMPORTANT]
> The code work (robots.txt, sitemap, SEO component, JSON-LD) is already done.
> Everything in this file is what **you** need to do manually.
> Do it top to bottom. Do not skip steps.

---

## PART 1 — GOOGLE (The Most Important One)

### Step 1.1 — Google Search Console

**Time needed:** 15 minutes  
**What it does:** Tells Google your site exists and shows you what queries bring traffic.

1. Go to → https://search.google.com/search-console/welcome
2. Click **"Add property"** → select **"URL prefix"**
3. Enter: `https://humourshub.authorsbook.store`
4. Choose verification method: **"HTML tag"**
5. You'll get a meta tag like this:
   ```html
   <meta name="google-site-verification" content="abc123xyz" />
   ```
6. Copy just the `content` value (e.g. `abc123xyz`)
7. Open your project → add to `.env.local`:
   ```
   NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=abc123xyz
   ```
8. Add the same variable in **Vercel Dashboard → Project → Settings → Environment Variables**
9. Deploy your site
10. Back in Search Console → click **"Verify"**
11. Go to **Sitemaps** (left sidebar)
12. Click **"Add a new sitemap"**
13. Enter: `api/sitemap` → click Submit
14. Go to **URL Inspection** → paste each URL → click **"Request Indexing"**:
    - `https://humourshub.authorsbook.store/`
    - `https://humourshub.authorsbook.store/shows`
    - `https://humourshub.authorsbook.store/gallery`
    - `https://humourshub.authorsbook.store/about`
    - `https://humourshub.authorsbook.store/perform-with-us`

---

### Step 1.2 — Google Business Profile (Local Map Pack)

**Time needed:** 20 minutes  
**What it does:** Gets you into the "3 pack" that shows on Google Maps and local search results.  
This is what shows when someone Googles *"comedy show Ahmedabad"* — it appears **above** all website results.

1. Go to → https://business.google.com
2. Click **"Manage now"**
3. Fill in:
   - **Business name:** `The Humours Hub`
   - **Business category:** `Comedy Club` (primary) + `Event Venue` (secondary)
   - **Location:** Choose *"I serve customers at their location or a service area"*
   - **Service area:** `Ahmedabad, Gujarat`
   - **Phone:** Your WhatsApp number (e.g. +91 79849 53372)
   - **Website:** `https://humourshub.authorsbook.store`
4. Verify via **phone call or postcard**
5. After verification, complete your profile:
   - Upload your **logo** as the profile photo
   - Upload your **OG image** (`/public/og-image.jpg`) as a cover photo
   - Write **business description** (copy this exactly):
     ```
     The Humours Hub is Ahmedabad's live comedy and performance platform.
     We host stand-up comedy, poetry slams, singing nights and guitar jams.
     Shows happen regularly with tickets from just ₹149. Every show is
     different — same energy, different crowd, different night.
     ```
6. Add **business hours** (show days + general hours)
7. After every show → click **"Add update"** → post show recap with photo

> [!TIP]
> Google Business Posts (show announcements) appear directly in search results.
> This is free advertising for "comedy show Ahmedabad" queries.

---

### Step 1.3 — Validate Your Rich Results (Structured Data)

**Time needed:** 5 minutes  
**What it does:** Confirms your Event + FAQ + Organization schemas are working correctly.

1. Go to → https://search.google.com/test/rich-results
2. Enter: `https://humourshub.authorsbook.store`
3. You should see:
   - ✅ **Event** (from shows page JSON-LD)
   - ✅ **Organization** (from homepage JSON-LD)
   - ✅ **FAQ** (from support page JSON-LD — loads after data fetch, may not show immediately)
4. Fix any errors flagged before proceeding

Also test individual pages:
- `https://humourshub.authorsbook.store/shows` → should show Event schema
- `https://humourshub.authorsbook.store/support` → should show FAQ schema

---

### Step 1.4 — PageSpeed / Core Web Vitals

**Time needed:** 10 minutes  
**What it does:** Google uses page speed as a ranking factor. This shows you what to fix.

1. Go to → https://pagespeed.web.dev/
2. Test: `https://humourshub.authorsbook.store`
3. Target scores:
   | Metric | Target |
   |---|---|
   | Performance | 80+ |
   | Accessibility | 90+ |
   | Best Practices | 90+ |
   | SEO | 95+ |
4. Screenshot the results. Fix any **red** or **orange** items before launch.

---

## PART 2 — GEMINI AI & CHATGPT (AI Search Visibility)

> [!NOTE]
> AI tools like Google Gemini, ChatGPT, Perplexity, and Claude answer questions by
> reading trusted web sources. To appear in AI answers you need:
> 1. A website Google trusts (indexed + structured data ✅ already done)
> 2. Your name mentioned on multiple external websites
> 3. Clear, factual, entity-based content on your own site

### Step 2.1 — Create a Structured "About" Knowledge Base

AI tools look for **clear factual statements** about an entity. Add these facts
to your `/about` page body text (these are the exact phrases AI extracts):

```
The Humours Hub is a live comedy and performance platform based in Ahmedabad, Gujarat, India.
It was founded to give Ahmedabad's local performers a professional stage.
Show formats include stand-up comedy, spoken word poetry, singing, and acoustic guitar jams.
Tickets are priced starting at ₹149 per person.
Shows are held at indoor venues in Ahmedabad.
The Humours Hub operates under the domain humourshub.authorsbook.store.
```

> These sentences are written in the exact way that AI models extract "entity facts."

---

### Step 2.2 — Get Listed on Wikipedia / Knowledge Sources

Gemini and ChatGPT pull from Wikipedia, Wikidata, and Crunchbase heavily.

**Option A — Wikidata (easiest)**
1. Go to → https://www.wikidata.org/wiki/Special:NewItem
2. Create an item: `The Humours Hub`
3. Add statements:
   - **instance of** → `comedy club`
   - **country** → `India`
   - **located in** → `Ahmedabad`
   - **official website** → `https://humourshub.authorsbook.store`
   - **described at URL** → your about page
4. This is free and immediately indexable by AI tools

**Option B — Request a Wikipedia article** *(when you have 12+ shows documented)*
- Requires notable coverage from at least 2 independent sources
- Come back to this after Step 3 (event directories) gets you some press

---

### Step 2.3 — Claim Your Entity on Google's Knowledge Panel

After your site is indexed and Google Business is verified:

1. Search for `The Humours Hub` on Google
2. If a Knowledge Panel appears → click **"Claim this Knowledge Panel"**
3. Verify ownership via your GSC account
4. Add:
   - Correct description
   - Social media links (Instagram)
   - Website link

This is what makes Gemini AI say "The Humours Hub is..." with confidence.

---

### Step 2.4 — Perplexity & ChatGPT (Indirect via Backlinks)

These AI tools read the open web. They'll mention you once you appear in:
- Event listing sites (Step 3 below)
- News articles / blog posts about Ahmedabad entertainment
- Reddit or Quora threads about "things to do in Ahmedabad"

**Do this now:**
- Post in r/Ahmedabad on Reddit:
  *"We run a live comedy night in Ahmedabad — The Humours Hub. AMA or just check us out at [link]."*
- Answer Quora questions about "events in Ahmedabad" mentioning your shows

---

## PART 3 — BING & OTHER SEARCH ENGINES

### Step 3.1 — Bing Webmaster Tools

**Time needed:** 5 minutes  
**What it does:** Gets you into Bing (which powers DuckDuckGo, Yahoo, and Microsoft Copilot AI answers).

1. Go to → https://www.bing.com/webmasters/home
2. Sign in with a Microsoft account
3. Click **"Add your site"**
4. Enter: `https://humourshub.authorsbook.store`
5. Choose **"Import from Google Search Console"** (easiest — auto-imports everything)
6. Submit your sitemap: `https://humourshub.authorsbook.store/api/sitemap`

---

### Step 3.2 — Yandex (Optional, Low Priority)

If you care about global reach:
1. Go to → https://webmaster.yandex.com
2. Add and verify your site
3. Submit sitemap

---

## PART 4 — FREE EVENT DIRECTORIES (Backlinks + Discovery)

Every listing = one backlink + one more place people can find you.
**Backlinks are how Google measures trust.** More trust = higher rankings.

### Tier 1 — Do These First (Most Traffic)

| Site | Link | Steps |
|---|---|---|
| **Allevents.in** | https://allevents.in/post | Click "Post Event" → fill form → free |
| **Eventshigh** | https://www.eventshigh.com | Create organiser account → list show |
| **MeraEvents** | https://www.meraevents.com | Register → Create Event → free listing |
| **Townscript** | https://www.townscript.com | Free event listing with ticket link |
| **Insider.in** | https://insider.in/create | May require review — apply anyway |

**What to write for every listing:**
```
Title: The Humours Hub — Live Comedy Night, Ahmedabad

Description:
Ahmedabad's own comedy night is back. The Humours Hub brings
together local stand-up comedians, poets, singers, and guitar
players for one unforgettable night. Every show is different.
Same energy. Different crowd. Different night.

Tickets start at ₹149. Limited seats.
Book at: https://humourshub.authorsbook.store/book-tickets

Category: Comedy / Entertainment / Live Events
City: Ahmedabad
```

---

### Tier 2 — Do After Each Show

| Site | What to Post |
|---|---|
| **Justdial** (https://www.justdial.com) | Register as a business → add to entertainment category |
| **Sulekha** (https://www.sulekha.com) | Post in events/entertainment |
| **Facebook Events** | Create event for every show — Google indexes FB events |
| **Bookmywish** | Free local event listing |

---

## PART 5 — SOCIAL SIGNALS (Instagram → Google)

Google indexes Instagram posts. A consistent posting schedule builds
search presence for "comedy show Ahmedabad" even before you rank organically.

### The 3-Post Formula (After Every Show)

**Post 1 — The Reel (within 24 hours of show)**
```
Caption:
[SHOW NAME] happened last night. [X] people. Sold out.

Next show date TBA — follow to know first.

Stand-up · Poetry · Singing · Guitar
The Humours Hub 🎤

#ComedyAhmedabad #StandUpComedy #OpenMicAhmedabad
#AhmedabadEvents #ThingsToDoAhmedabad #HumourshubAhmedabad
#LiveComedyAhmedabad #AhmedabadNightlife #ComedyNight
```

**Post 2 — The Story (same day)**
- "X seats left for next show" card with link sticker to `/book-tickets`
- Use the "countdown" sticker if date is confirmed

**Post 3 — The Performer Highlight (2 days later)**
- Tag the performer
- Short quote from their set

### Hashtag Bank (Use 15-20 per post)
```
Primary (always use):
#ComedyAhmedabad #StandUpAhmedabad #OpenMicAhmedabad #LiveComedy

Secondary (rotate):
#AhmedabadEvents #AhmedabadNightlife #ThingsToDoAhmedabad
#AhmedabadEntertainment #GujaratEvents #ComedyNightIndia
#StandUpComedyIndia #OpenMicIndia #PoetryAhmedabad
#MicNight #LivePerformance #IndieComedy

Branded (always use):
#TheHumoursHub #HumoursHub #HumourshubAhmedabad
```

---

## PART 6 — CONTENT STRATEGY (How Google Ranks You Long-Term)

Google rewards sites that **add new content regularly**. Here's exactly what to publish.

### After Every Show — Add a Show Recap Page

Create a new entry in your CMS (`past_shows` type) with:

```
Title: "The Humours Hub — [Show Name] Recap | [Date]"

Content:
[Show Name] happened on [Date] at [Venue], Ahmedabad.
[X] people attended. [Performers list].

Highlights:
- [Performer 1] opened with...
- [Performer 2] performed poetry about...
- The guitar jam closed the night with...

Photos from the night: [link to gallery]
Next show: [link to /shows]
```

**Why this works:**
Each recap is a new page with a unique URL. Over time you build:
- `past_shows/show-1`, `past_shows/show-2`... etc.
- Google sees fresh content → crawls more often → ranks better

---

### Monthly Blog Post Ideas (Publish on `/about` or a future `/blog` page)

| Month | Title | Keywords Targeted |
|---|---|---|
| Month 1 | "Why Ahmedabad Needs a Comedy Scene" | comedy Ahmedabad, stand up Ahmedabad |
| Month 2 | "How to Get on Stage at The Humours Hub" | open mic Ahmedabad, perform comedy Ahmedabad |
| Month 3 | "5 Things That Happen at Every Humours Hub Show" | comedy night Ahmedabad, live entertainment Ahmedabad |
| Month 4 | "Meet the Performers of The Humours Hub" | local comedians Ahmedabad |
| Month 5 | "Humours Hub: A Year in Review" | comedy show Ahmedabad 2026 |

---

## PART 7 — PRESS & MEDIA (Backlinks That Move Rankings)

One article in a local news site is worth 100 event directory listings.

### Step 7.1 — Local Media Outreach

Email these publications:

**Ahmedabad Mirror / Times of India Ahmedabad**
```
Subject: Local comedy night gaining traction in Ahmedabad — story pitch

Hi,

The Humours Hub is Ahmedabad's live comedy and performance night.
We've hosted [X] shows with [Y] attendees in [Z] months.

We're not a bar comedy night — we're a curated performance platform
for local stand-up comedians, poets, singers, and musicians.

Tickets are ₹149 and shows sell out within days.

Website: https://humourshub.authorsbook.store
Instagram: @the.humourshub

Would love to be featured in your entertainment section.
Happy to arrange complimentary press passes for the next show.

[Your name]
```

**Other publications to email:**
- Ahmedabad.com
- DNA Ahmedabad
- WhatsHot Ahmedabad (https://whatshot.in/ahmedabad) — contact form on site
- LBB Ahmedabad (https://lbb.in/ahmedabad) — press@lbb.in

---

### Step 7.2 — Influencer / Micro-Creator Collaboration

Find Ahmedabad-based Instagram creators with 5,000–50,000 followers in
food/lifestyle/events niche. Offer 2 free tickets in exchange for a post.

One genuine Instagram post from a local creator = traffic + social proof + backlink if they link in bio.

---

## PART 8 — TECHNICAL CHECKLIST

Run through this once before every deployment:

```
SEO DEPLOYMENT CHECKLIST

□ NEXTAUTH_URL set correctly in Vercel env vars
□ NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION set in Vercel env vars
□ Sitemap accessible at /api/sitemap (test in browser)
□ robots.txt accessible at /robots.txt (test in browser)
□ Rich Results test passes for / and /shows
□ PageSpeed score 80+ on mobile
□ All public pages have unique <title> tags
□ All public pages have meta description
□ /api/sitemap submitted in Google Search Console
□ New show details updated on homepage before going live
□ New show listed on Allevents.in and EventsHigh
```

---

## PART 9 — MONITORING (What to Check and When)

### Weekly (5 minutes)
- Check Instagram follower count and post reach
- Check event directory listings are live

### Monthly (15 minutes)
Go to Google Search Console → check:

| Report | What to Look For |
|---|---|
| **Performance** | Which queries are you ranking for? Click them to see position. |
| **Coverage** | Any new "Error" URLs? Fix them immediately. |
| **Core Web Vitals** | Any pages flagged as "Poor"? |
| **Rich Results** | Are Event + FAQ schemas being detected? |
| **Sitemaps** | Any crawl errors? |

### After Every Show (10 minutes)
- Update next show details in admin CMS
- Post recap to Instagram (3-post formula above)
- Update Google Business Profile with a post

---

## PART 10 — KEYWORD RANKING TARGETS

**Phase 1 — Month 1-2** (These are achievable quickly with low competition)
```
"the humours hub"              → Should rank #1 (branded)
"humours hub ahmedabad"        → Should rank #1 (branded)
"comedy show ahmedabad"        → Target top 10
"open mic ahmedabad"           → Target top 10
```

**Phase 2 — Month 3-6** (Require content + backlinks)
```
"stand up comedy ahmedabad"    → Target top 5
"live comedy ahmedabad"        → Target top 5
"things to do ahmedabad"       → Target top 20
"comedy night ahmedabad"       → Target top 5
```

**Phase 3 — Month 6+** (Long tail, compounding)
```
"comedy show ahmedabad tickets"
"open mic night ahmedabad"
"poetry slam ahmedabad"
"local comedians ahmedabad"
```

Track your rankings free at → https://www.google.com/search (use incognito)

---

## SUMMARY TABLE — WHAT TO DO AND WHEN

| # | Action | Time | Impact | When |
|---|---|---|---|---|
| 1 | Google Search Console + verify | 15 min | 🔴 Critical | TODAY |
| 2 | Submit sitemap to GSC | 2 min | 🔴 Critical | TODAY |
| 3 | Request indexing for 5 pages | 5 min | 🔴 Critical | TODAY |
| 4 | Google Business Profile | 20 min | 🔴 Critical | TODAY |
| 5 | Rich Results test | 5 min | 🟠 High | TODAY |
| 6 | Bing Webmaster Tools | 5 min | 🟠 High | This week |
| 7 | Allevents.in listing | 10 min | 🟠 High | This week |
| 8 | EventsHigh listing | 10 min | 🟠 High | This week |
| 9 | MeraEvents listing | 10 min | 🟠 High | This week |
| 10 | Wikidata entity creation | 15 min | 🟡 Medium | This week |
| 11 | PageSpeed audit | 10 min | 🟡 Medium | This week |
| 12 | Reddit r/Ahmedabad post | 5 min | 🟡 Medium | This week |
| 13 | WhatsHot / LBB pitch | 15 min | 🟡 Medium | This month |
| 14 | Claim Google Knowledge Panel | 5 min | 🟡 Medium | After GSC verified |
| 15 | Show recap after each show | 10 min | 🟢 Ongoing | After every show |
| 16 | 3-post Instagram formula | 15 min | 🟢 Ongoing | After every show |
| 17 | Google Business post per show | 5 min | 🟢 Ongoing | After every show |
| 18 | Monthly GSC check | 15 min | 🟢 Ongoing | Every month |

---

*This file covers Google Search, Google Maps, Google AI (Gemini), Bing, Microsoft Copilot,
ChatGPT/Perplexity (via backlinks), and social search. Do steps in order.*
