# Media Kit Pro — Product plan vs CreatorsJet

## 1. Competitor snapshot: CreatorsJet

From the [video](https://www.youtube.com/watch?v=Ve6JgC_qQjw):

**What they do**
- **Connect** Instagram, TikTok, YouTube, Twitter → auto-pull profile data.
- **One-click media kit** in “less than a minute”: customize visibility, add pricing, brand partnerships, links.
- **Dashboard**: Add accounts, edit kit (theme, colors, background, links, rates, brand logos, case studies), rearrange sections, kit analytics (views, location, platform, referrer), multiple kits (different links per brand), messages (inquiries).
- **Plans**: Free (1 kit, data snapshot at signup), Starter (1 kit, 3 accounts, daily update?), Pro (3 kits, 10 accounts).
- **Tools**: Instagram / YouTube / TikTok “money calculators” for pricing.
- **Share**: One link per kit to send to brands or put in email pitches.

**Weak spots we can exploit**
- Design of the **brand-facing media kit** is functional but not a strong differentiator (“not doing much on design”).
- Example posts/videos exist but aren’t framed as a core, aesthetic “work samples” section.

---

## 2. Media Kit Pro positioning

| Pillar | Direction |
|--------|-----------|
| **Minimalism** | Fewer sections, less clutter. Every block has a clear job. |
| **Design-first** | Brand-facing page feels like a high-end agency/portfolio, not a template. |
| **Stats** | Keep live(ish) stats (followers, growth, engagement) prominent and readable. |
| **Two surfaces** | Shareable media kit (brand view) vs creator dashboard (manage/edit). Same domain, different paths — no domain split for now. |
| **Work samples** | Dedicated, aesthetic section for **example videos/posts** so brands see proof of work in one place. |

---

## 3. URL structure (same domain — no domain split for now)

CreatorsJet uses one domain with three route types. We keep the same architecture; no separate domains or subdomains for now. We can revisit domain differentiation later.

| Surface | CreatorsJet pattern | Media Kit Pro (current / planned) |
|--------|----------------------|------------------------------|
| **Dashboard** | `creatorsjet.com/dashboard` | `/{base}/dashboard` — creator home, subscription, kit list, settings. |
| **Shared link (brand view)** | `creatorsjet.com/jet/{username}` | `/kit/[username]` — public media kit brands see. Already in place. |
| **Edit kit** | `creatorsjet.com/media-kit/edit/{kit_id}` | Add later: e.g. `/kit/edit/[kit_id]` or `/media-kit/edit/[kit_id]` — editable draft of one kit. |

**No domain changes for now:** everything stays on the same origin (e.g. `yourapp.com`). Same architecture as above; we only assign a different domain/subdomain later if we want that differentiator.

---

## 4. Brand-facing media kit page (what brands see)

**Goal:** More aesthetic than CreatorsJet; minimalistic; stats + work samples in one place.

**Suggested sections (order and emphasis):**

1. **Hero**
   - Photo/avatar, name, handle(s), one-line tagline.
   - Clean typography, plenty of space. “Agency portfolio” feel.

2. **Stats (live/updated)**
   - Instagram + TikTok (and later YouTube if we add): followers, growth %, engagement.
   - Simple charts (e.g. growth over time, demographics) — already in place; refine visuals only.

3. **Work samples (new, design focus)**
   - **Example videos / posts** section.
   - Grid or horizontal scroll; each item: thumbnail, platform icon, optional short caption or “Campaign for X”.
   - Optional: “Featured” vs “All” or filter by platform.
   - This is the “proof of work” block — we design and place it very clearly so brands see quality and relevance.

4. **Rates / pricing (optional, creator choice)**
   - Minimal block: e.g. “Rates from $X” or “Contact for rates” + CTA.
   - No calculator on the public page; keep that in dashboard/tools if we add it.

5. **Brands / case studies (optional)**
   - Logos or names of past partners; optional one-line “Campaign for Brand X” or short case (problem/solution/result).
   - Fewer, bigger, more visual than a long list.

6. **Links**
   - 2–4 clear CTAs: “Contact”, “Press kit”, “Latest collab”, etc. (already in place; can restyle).

7. **Footer**
   - “Made with Media Kit Pro” (or similar); minimal.

**Design principles for this page**
- Typography and spacing do most of the work; avoid decorative clutter.
- Consistent spacing and alignment; clear hierarchy (hero → stats → work → rates → brands → links).
- Mobile-first; same sections on desktop with better use of width.
- Optional: subtle motion (e.g. on scroll or hover) only where it adds clarity, not noise.

---

## 5. Creator dashboard (what we keep vs add)

**Keep (already done or planned)**
- Subscription (Stripe), manage subscription, success/cancel flows.
- One shareable media kit URL; dashboard shows link + preview.
- Placeholder/mock stats (IG/TikTok); later replace with real connections.

**Add / refine (aligned with plan)**
- **Edit kit**: toggle sections on/off (stats, work samples, rates, brands, links).
- **Work samples**: add/edit/remove example posts or videos (URL + thumbnail + optional caption/platform).
- **Rates**: optional “from $X” or “Contact for rates” (stored per kit, shown on public page if enabled).
- **Brands / case studies**: add logos, names, optional short case or link (shown in “Brands” section if enabled).
- **Analytics (v1):** who viewed the kit (optional; can be post-MVP).
- **Edit-kit URL:** dedicated route for editing one kit (e.g. `/kit/edit/[kit_id]`) when we support multiple or editable kits.

---

## 6. Phased implementation (for step-by-step later)

| Phase | Scope | Outcome |
|-------|--------|--------|
| **Phase 1 — Design & structure** ✅ | Define components and layout for the **public media kit** page (hero, stats, work samples, rates, brands, links, footer). No new backend; use mock data. | Done: one aesthetic, minimal media kit page with clear sections and placeholders. |
| **Phase 2 — Work samples** ✅ | Add “work samples” (example posts/videos) to mock data and to the kit page; optional: simple creator control in dashboard (add link + thumbnail + caption). | Done: dashboard editor for work samples, rates, brands; localStorage; kit page reads saved content. |
| **Phase 3 — Edit from dashboard** ✅ | Dashboard: edit visibility (sections on/off), edit work samples, optional rates and brands/case studies. Store in DB or client state; public page reads from same source. | Done: section visibility toggles (stats, work samples, rates, brands, growth chart, audience, links) in dashboard; stored in localStorage; public kit page conditionally renders sections. |
| **Phase 4 — Edit-kit page & multi-kit (optional)** ✅ | Add route for editing a kit (e.g. `/kit/edit/[kit_id]`); optional: multiple kits per creator. No domain changes. | Done: dedicated `/kit/edit` page with KitEditor; dashboard links to “Edit kit” instead of inline editor. Multi-kit deferred. |
| **Phase 5 — Real data & polish** | Connect real Instagram/TikTok (or keep mock); kit analytics (views); any final design polish. Domain differentiator only if we decide to add it later. | Production-ready, design-led media kit. |

**Remaining (end-to-end completion):** See **[REMAINING_PHASES.md](./REMAINING_PHASES.md)** for Phase 6 onward: auth, creator profile + DB, kits in DB, subscription tied to user, Instagram API, onboarding, polish & ship.

---

## 7. Summary

- **Competitor:** CreatorsJet = fast setup, many features, calculators; brand-facing design is okay but not a differentiator. URL pattern: dashboard, shared link (`/jet/{username}`), edit kit (`/media-kit/edit/{kit_id}`) — all same domain.
- **Us:** Minimalistic, **design-first** brand-facing page, **same architecture** (dashboard, shared link `/kit/[username]`, edit-kit route later), **stats** clearly shown, **work samples** as a first-class, aesthetic section. No domain split for now; can add later if we want.
- **Next:** Implement **Phase 1** (design and structure of the public media kit page), then **Phase 2** (work samples), then dashboard edits and edit-kit page step by step.

No code in this doc — this is planning only; step-by-step changes can follow in the codebase.
