# Kitevo — social copy

Profile copy and starter posts for `@getkitevo` on LinkedIn, X, and Instagram.
Graphics for each platform are in this folder; regenerate them with
`npx tsx scripts/generate-social-graphics.ts`.

---

## Voice rules

- **No emojis. No em dashes or double dashes.** Plain sentences.
- **Kitevo is in development. It has not launched and has no users.** Never imply
  revenue, traction, or a customer base that doesn't exist. Building in public is the
  angle, and it only works if the reporting is true.
- Say "Kit-evo" (kit + evolution), not "kite-vo".
- Talk about the problem more than the product. Creators know the PDF pain; they don't
  know Kitevo.
- **The domain is `getkitevo.com`** (bought July 2026). It matches the `@getkitevo` handle,
  so one string covers every surface. `kitevo.com` is held by an investor at $997 on
  Afternic; if it is ever bought, keep `getkitevo.com` renewed forever as a permanent
  redirect, because kit links live in brands' inboxes and must not break.

---

## Profile copy

### LinkedIn (company page)

**Tagline** (max 120 chars)
> Live media kits for creators. Real Instagram and YouTube stats, on one link.

**About** (max 2000 chars)
> Every creator pitching a brand has the same problem: the media kit is a PDF, and a PDF
> is out of date the moment it is exported. Follower counts move. Engagement moves. The
> screenshot in that deck is from six months ago, and the brand on the other side knows it.
>
> Kitevo replaces that PDF with a live link. It connects to a creator's Instagram and
> YouTube and builds a media kit that keeps itself current: followers, engagement,
> audience age, gender split, top countries, growth over the last 30 days, and recent
> posts. The numbers are pulled from the platforms, not typed in by hand, which is the
> point. A brand can trust what it is looking at.
>
> Kitevo is in development and building in public. Follow along here for progress, design
> decisions, and the occasional thing that went wrong.

**Industry:** Software Development
**Specialties:** creator economy, media kits, influencer marketing, brand partnerships, creator tools

---

### X

**Name:** Kitevo
**Handle:** @getkitevo

**Account type:** Professional → **Business** (not Creator: Business is for brands and
organizations, Creator is for influencers and public figures).
**Category:** Software Company (search the picker; there are hundreds of options).

*Low-stakes: there is currently no functional difference between Business and Creator, the
category is just a label under your profile name, and you can switch later without
affecting followers or posts.*

**Bio** (max 160 chars)
> Live media kits for creators. Your Instagram and YouTube stats on one link, always
> current. Building in public. Not launched yet.

*(129 chars. Leave "Not launched yet" in. It sets expectations, and it is the honest
version of a launch countdown.)*

**Location:** India
**Website:** https://getkitevo.com

---

### Instagram

**Name field** (max 30 chars, and it is searchable, so spend it on keywords not vibes)
> Kitevo · Creator Media Kits

**Bio** (max 150 chars)
> Live media kits for creators.
> Real Instagram and YouTube stats on one link.
> In development, building in public.

**Category:** Software Company
**Link:** https://getkitevo.com

---

## Starter posts

### X — first post (pin this)

> Building Kitevo in public.
>
> It turns a creator's Instagram and YouTube into a live media kit. One link, real
> numbers, always current.
>
> Most creators still pitch brands with a PDF that went stale the day they exported it.
>
> Not launched yet. Following along is free.

### X — the logo (pairs with brand/social/avatar.png)

> Spent today on the logo.
>
> The K is printed three times, each impression offset slightly, like a misregistered riso
> print. The layers behind it are older impressions. The one on top is the current one.
>
> Which is the product in a shape. A media kit that keeps reprinting itself.

### X — the honest engineering one

> Found a good one today.
>
> Kitevo was calling the YouTube search endpoint on every public kit view. That costs 100
> quota units a call. The daily limit is 10,000.
>
> So after about 100 views, everyone's videos silently disappeared.
>
> Same data from the uploads playlist costs 1 unit. Fixed.

### LinkedIn — first post

> A creator with 200k followers sends a brand a PDF media kit.
>
> The brand opens it and sees a screenshot of an Instagram dashboard. No date on it. No
> way to tell whether that engagement rate is current, cherry-picked, or edited in Figma.
> So the brand discounts it, and asks for a rate card instead of a conversation.
>
> That is the problem I am building Kitevo for.
>
> It connects to a creator's Instagram and YouTube and generates a media kit that updates
> itself. Followers, engagement, audience demographics, growth, recent posts. Pulled from
> the platforms directly, so there is nothing to fake and nothing to go stale.
>
> It is in development, not launched. I will be posting the build here, including the
> parts that do not work.

### Instagram — launch/announcement (use brand/social/instagram-post-launch.png)

Caption:
> Stop sending brands a PDF.
>
> Your follower count changed since you exported it. Your engagement changed. The brand
> reading it has no way to know what is current and what is six months old, so they assume
> the worst.
>
> Kitevo connects your Instagram and YouTube and builds a media kit that updates itself.
> One link. Real numbers. Nothing to fake.
>
> In development. Building it in public, follow along.
>
> #creatoreconomy #mediakit #contentcreator #influencermarketing #brandpartnerships
> #creatortools #buildinpublic

---

## Ongoing post ideas

Build-in-public works when the posts are specific. "Made progress today" is worth
nothing. These are already true and worth writing up:

- The YouTube quota bug above. Concrete numbers, real failure, real fix.
- Why the kit refuses to draw a growth chart when there isn't enough real data, instead of
  drawing a plausible-looking curve. The honesty rules are a genuine differentiator and
  most tools quietly do the opposite.
- The five kit vibes, as a carousel. Visual, and it shows the product without a demo.
- Designing the logo: eleven concepts, none of them right, and why the twelfth was.
- The avatar-tinted-gold bug, where the real cause was a CSS stacking context and not the
  thing I spent an hour on.

Post the graphic first, the caption second. On X, the first two lines are all most people
read, so put the specific thing there and the context underneath.
