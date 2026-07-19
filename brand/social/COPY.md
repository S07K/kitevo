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

## Build update, July 2026 (pairs with the screen recording)

Posted as video + text, no face cam, so the copy carries the story the footage
cannot narrate. The hook is the mistake, not the mark: a reversal travels further
than a reveal.

### X

> Spent a day on the Kitevo logo and got it wrong.
>
> The name has "kite" in it, so I drew kites. Eleven concepts deep I remembered the name
> is Kit + evo. The kit, evolved.
>
> A kite logo teaches people to mispronounce your own brand.
>
> Started over. Here is what shipped this week.

*(280 chars. If it needs trimming, cut the last line before anything else.)*

Optional reply, for the engineers:

> Also found a good one. Kitevo called the YouTube search endpoint on every public kit
> view. 100 quota units a call, 10,000 a day.
>
> So after roughly 100 views, everyone's videos silently disappeared.
>
> Same data from the uploads playlist costs 1 unit.

### LinkedIn

> I killed eleven logo concepts last week before I understood my own product name.
>
> Kitevo has "kite" in it, so I designed kites. Several of them. They were fine. Then it
> landed that the name is Kit plus evo. The kit, evolved. A media kit that keeps itself
> current instead of going stale the moment you export it as a PDF.
>
> A kite logo would have taught every visitor to mispronounce the brand.
>
> What I landed on prints the K three times, each impression offset slightly, like a
> misregistered riso print. The layers behind are older impressions. The one on top is
> the current one. Which is the product in a shape.
>
> Also shipped this week:
>
> The kit profile card, with the cover and overlapping avatar.
>
> Brand partners now render as real logos rather than text, with a ratio option so a wide
> wordmark is not crushed into a square.
>
> A YouTube fix. I was calling the search endpoint on every public kit view, which costs
> 100 quota units against a 10,000 daily limit. After about 100 views, everyone's videos
> silently disappeared. The same data from the uploads playlist costs 1 unit.
>
> Caching on the platform API calls. 656ms down to zero on repeat views.
>
> Kitevo is still in development. The domain is bought and deployment is next.

---

## Beta outreach DMs

Two messages, deliberately. The first asks for help and nothing else; the second
carries the setup steps. Front-loading the requirements (Professional account,
linked Facebook Page, accept a tester invite buried in Instagram settings) puts
three obstacles in front of someone who has not yet said yes, and they will not.

Send individually. Never paste this to more than one person unchanged: the
opening line has to be about them or it reads as a mass DM and gets ignored.

### DM 1 — the ask

> Hey [name], I have been following your [specific thing they actually make] for a while.
>
> I built something for creators who pitch brands. It turns your Instagram and YouTube
> into a live media kit instead of a PDF that goes out of date the day you export it.
> One link, real numbers, always current.
>
> Here is a sample one so you can see what it looks like: getkitevo.com/kit/demo
>
> It is in private beta and free. Would you try it and tell me what is broken? I want the
> honest version, not the polite one.

*Instagram DMs get skimmed, and anything longer reads as a pitch deck. "Tell me what is
broken" is the actual ask: it is a small favour, it flatters their judgement, and it sets
expectations that this is early.*

**Why the demo kit and not the homepage.** `/kit/demo` is the product itself, fully
rendered, with no signup and no account needed. A creator understands it in three seconds.
The homepage is a pitch about the product, which is a slower and weaker read for someone
who already makes content for a living. Send `getkitevo.com` in DM 2 when they are ready
to sign up.

**A caution on links.** Instagram filters DMs with links from accounts you do not follow
each other with, so a first message containing a URL is more likely to land in Requests or
be hidden entirely. If you do not have a mutual follow, send the message without the link,
and reply with the demo link once they respond.

### DM 2 — after they say yes

> Brilliant, thank you. Two things first, both free and quick.
>
> Your Instagram needs to be a Professional account (Business or Creator, switchable in
> Instagram settings), and it needs to be linked to a Facebook Page. That is Meta's
> requirement for pulling audience data, not mine.
>
> Then I will send an invite from Instagram. Accept it under Settings and privacy,
> Website permissions, Apps and websites, Tester invites.
>
> After that, sign up at getkitevo.com and hit Connect Instagram. If anything fails,
> screenshot it and send it over. That is genuinely the most useful thing you can do.

### Shorter version, for people you actually know

> Hey, I built a thing. It turns your Instagram and YouTube into a live media kit for
> pitching brands, instead of a PDF. Free, early, probably broken in places.
>
> This is what it makes: getkitevo.com/kit/demo
>
> Want to be one of the first to try it and tell me what is wrong with it?

### Who to send it to

Three people, not twenty. There are three separate failure points before anyone sees a
kit, and you need to watch real people hit them before scaling. Whatever stalls the first
two will stall the next fifty.

Priority order: creators you know personally, then your own second account (a genuine
end-to-end run where you are not the developer), then small creators you actually follow
and can open with something specific about.

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
