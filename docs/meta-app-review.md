# Meta App Review Submission — Kitevo (Instagram Graph API)

Reference for Meta App Review. Paste-ready use-case writeups per permission, a screencast
shot list, reviewer test instructions, and the gotchas that get Instagram apps rejected.
Keep this file; Meta review commonly bounces once, and re-submission is faster with this.

## Integration facts

| Field | Value |
|-------|-------|
| App name | Kitevo |
| Login flow | Facebook Login for Business (`facebook.com/dialog/oauth`) |
| API | Instagram Graph API (professional accounts, via a linked Facebook Page) |
| Requested permissions | `instagram_basic`, `instagram_manage_insights`, `pages_show_list`, `business_management` |
| Privacy policy | https://getkitevo.com/privacy |
| Terms | https://getkitevo.com/terms |
| Data deletion callback | https://getkitevo.com/api/meta/data-deletion |
| OAuth redirect URI | https://getkitevo.com/api/instagram/callback |

Account-linking flow (what the reviewer will see): creator clicks Connect Instagram, logs in
with Facebook, grants the permissions, Kitevo calls `/me/accounts?fields=id,name,
instagram_business_account` to find the Page whose linked Instagram professional account it
will read, then reads that account's own profile, media, and insights to render the kit.

## The two hard prerequisites (must be done before App Review can pass)
1. **Business Verification** complete for the Meta business that owns the app.
2. **Advanced Access** requested for each permission below (App Review), then app set to **Live**.

---

## Per-permission use-case writeups

Paste each into the "Tell us how you'll use this permission" box for that permission.

### instagram_basic
> Kitevo (getkitevo.com) is a media-kit builder for content creators. A creator connects
> their own Instagram professional account so Kitevo can display their public profile
> metrics and recent posts on the media kit they build and share with brands.
>
> We use instagram_basic to read the connected creator's own Instagram account: followers
> count, media (post) count, username, and profile picture. We also read the creator's
> recent media (media type, image or video URL, thumbnail, permalink, caption, like count,
> comment count, timestamp) to show a post grid on their media kit.
>
> This data is displayed only on the creator's own media kit, which the creator chooses to
> share with prospective brand partners. We only ever read the connected creator's own
> account. We do not access other users' accounts, and we do not post, edit, or delete
> anything.

### instagram_manage_insights
> We use instagram_manage_insights to read the connected creator's own Instagram insights so
> their media kit reflects real audience performance for brand partnerships:
>
> - Per-post reach and engagement, which we average into an engagement-rate figure.
> - Daily follower_count, which we use to build a 30-day follower-growth chart.
> - Audience demographics (age, gender, and top-country breakdowns), shown as charts.
>
> These insights are the core value Kitevo provides: brands evaluating a creator want real
> reach, engagement, and audience data rather than self-reported numbers. We read insights
> only for the creator's own connected professional account, and display them only on that
> creator's own media kit.

### pages_show_list
> An Instagram professional account is linked to a Facebook Page. During the connection flow
> we call `/me/accounts` and read the `instagram_business_account` field to identify the Page
> connected to the creator's Instagram professional account and obtain the Instagram user id
> required to read their own profile, media, and insights.
>
> We use pages_show_list solely to resolve the correct Instagram account during account
> linking. We do not post to, manage, or read content from the creator's Facebook Pages.

### business_management
> Some creators manage their Instagram professional account through a Meta Business
> portfolio rather than a directly owned Page. We use business_management during the
> connection flow so those creators can connect successfully and Kitevo can access and read
> their own business-linked Instagram asset (profile, media, and insights).
>
> It is used only to resolve and read the creator's own connected Instagram account. Kitevo
> does not create, manage, or modify any business, Page, ad account, or asset.

Note: business_management is the most heavily scrutinized of the four. Before submitting,
confirm it is actually required for your connection flow. If accounts connect successfully
without it (many do, using only instagram_basic + instagram_manage_insights +
pages_show_list), drop it from the requested scope and from this submission. Fewer
permissions means a faster, cleaner review. See app/api/instagram/connect/route.ts.

---

## Screencast (required, one video can cover all four permissions)

Record a clear screen recording, English narration or captions, showing the full flow on
the live app. Must show the Facebook Login dialog and the data in use.

### Shot list
1. **App identity.** Open https://getkitevo.com, URL bar visible. Caption: "Kitevo, a media
   kit builder for creators, at getkitevo.com."
2. **Start connect.** Sign in to Kitevo, go to the dashboard/profile, click "Connect
   Instagram." Caption: "A creator connects their own Instagram professional account."
3. **Facebook Login dialog.** Show the Facebook login and the permissions/consent screen.
   Hold on it so the requested permissions are readable. Select the Page / Instagram
   professional account. Caption: "The creator grants access to their own Instagram
   account and its insights."
4. **Grant and redirect** back into Kitevo.
5. **Show each permission's data in use** (this is what reviewers require):
   - Profile + post grid (instagram_basic): "Followers, post count, and recent posts."
   - Engagement rate, follower-growth chart, audience age/gender/country
     (instagram_manage_insights): "Reach, engagement, growth, and audience demographics."
   - Briefly note the account was found via its linked Page (pages_show_list /
     business_management): "The account was located through its linked Facebook Page."
6. **Disconnect + deletion (strong close).** Show the Disconnect Instagram control. Caption:
   "The creator can disconnect anytime, which deletes the stored token; full deletion is
   available via our data-deletion request."

### Reviewer test instructions (paste into "How to test" / notes)
> Test steps:
> 1. Go to https://getkitevo.com and sign in with the test credentials below (or sign up).
> 2. Open the dashboard and click "Connect Instagram."
> 3. Log in with a Facebook account that manages a Page linked to an Instagram professional
>    (Business or Creator) account, and grant the requested permissions.
> 4. After redirect, the creator's media kit shows their Instagram followers, post grid,
>    engagement rate, follower-growth chart, and audience demographics.
> 5. To revoke: open the dashboard and click "Disconnect Instagram" (deletes the stored token).
>
> Test login: [Kitevo test account email + password]
> Connected Instagram: [provide a test IG professional account, or add the reviewer's test
> user as permitted]. An Instagram professional account linked to a Facebook Page is required
> for the insights to appear.

Provide real, working credentials. "We could not test it" is the single most common Meta
rejection. If you cannot share a live connected account, create a Facebook test user (App
Dashboard > Roles > Test Users) with an Instagram professional account and share that.

---

## Pre-submission checklist
- [ ] Business Verification complete.
- [ ] App has Instagram + Facebook Login for Business products added.
- [ ] Privacy policy live (https://getkitevo.com/privacy), Terms live, both reachable.
- [ ] Data deletion callback set to https://getkitevo.com/api/meta/data-deletion (the
      callback, not just an instructions URL) and returns the expected JSON.
- [ ] App icon (1024x1024) and category set.
- [ ] Valid OAuth redirect URI: https://getkitevo.com/api/instagram/callback.
- [ ] Advanced Access requested for each permission, each with the writeup above.
- [ ] One screencast covering all four permissions, English narration or captions.
- [ ] Working reviewer test credentials + a connected IG professional account.
- [ ] Confirm business_management is actually needed; drop it if not.

## After approval
- Set the app to **Live** mode.
- Any creator can then connect (no per-user tester allowlist).
- No code change needed; the same scopes and redirect URI keep working.
