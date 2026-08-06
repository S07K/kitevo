# Google OAuth Verification Submission — Kitevo (`youtube.readonly`)

> **Status: VERIFIED (approved).** `youtube.readonly` passed Google verification;
> consent screen is In Production, branding + domain verified. No unverified-app
> warning, no 100-user cap. Kept below as the record and for any future re-submission.

Reference for the Google Cloud Console OAuth verification. Paste-ready text plus a
demo-video shot list. Keep this file so re-submissions (if Google bounces) are quick.

## App facts (fill into the form)

| Field | Value |
|-------|-------|
| App name | Kitevo |
| App domain (verified) | getkitevo.com |
| Homepage | https://getkitevo.com |
| Privacy policy | https://getkitevo.com/privacy |
| Terms of service | https://getkitevo.com/terms |
| Requested sensitive scope | `https://www.googleapis.com/auth/youtube.readonly` |
| Restricted scopes | None |
| User type | External, In production |

Only one sensitive scope is requested. No restricted scopes, so no third-party
security assessment (CASA) is required.

---

## 1. What does your app do? (product description)

Kitevo is a media-kit builder for content creators. A creator signs in, connects
their own social accounts, and Kitevo generates a shareable web page (a "media kit")
that presents the creator's audience size and performance so they can pitch brand
partnerships. The YouTube integration lets a creator show their own channel's public
performance on that page.

---

## 2. Why does the app need `youtube.readonly`? (scope justification)

Paste this into "Explain how your project will use the requested scope":

> Kitevo requests `youtube.readonly` so that a signed-in creator can display their
> own YouTube channel statistics on their Kitevo media kit. After the creator grants
> access, Kitevo makes read-only calls to the YouTube Data API v3 on their behalf:
>
> - `channels.list` (parts: statistics, snippet, contentDetails) to read the
>   creator's subscriber count, total view count, video count, channel title, and the
>   id of their uploads playlist.
> - `playlistItems.list` (parts: snippet, contentDetails) to list the creator's most
>   recent uploaded videos.
> - `videos.list` (part: statistics) to read the public view and like counts for
>   those recent videos.
>
> This data is shown only on the creator's own media kit, which the creator chooses to
> share with prospective brand partners. Kitevo never modifies the creator's YouTube
> account, never posts, and never reads private data beyond the account's own public
> channel metrics. `youtube.readonly` is the least-privileged scope that returns these
> read-only channel and video statistics for the authenticated user; no narrower
> read-only scope exists for this data.

### Why not a narrower scope
The YouTube Data API does not provide a scope more limited than `youtube.readonly`
for reading channel statistics and video lists. The alternative, `youtube.force-ssl`,
grants write access the app does not need, so `youtube.readonly` is the minimum.

---

## 3. Data handling / Limited Use (if asked)

> YouTube data retrieved through `youtube.readonly` is used solely to render the
> creator's own media kit. It is fetched server-side, cached briefly to reduce API
> calls, and displayed back to the same creator and to people the creator shares their
> kit link with. Kitevo does not sell this data, does not use it for advertising, and
> does not transfer it to third parties. The creator can disconnect YouTube at any
> time from their dashboard, which deletes the stored tokens. This complies with the
> Google API Services User Data Policy, including the Limited Use requirements.

Make sure the published privacy policy (https://getkitevo.com/privacy) contains an
explicit statement that Kitevo's use of information received from Google APIs adheres
to the Google API Services User Data Policy, including the Limited Use requirements,
and links to that policy. Reviewers check for this exact disclosure.

---

## 4. Demo video (required)

Record an unlisted YouTube video (or a screen recording uploaded anywhere Google can
view it). English narration or captions. Keep it 1 to 3 minutes. It must show the
production app on the verified domain and the full consent flow.

### Shot list

1. **Domain proof.** Open a browser to `https://getkitevo.com`. Keep the URL bar
   visible so the reviewer sees the verified domain. Say: "This is Kitevo, at
   getkitevo.com, the domain registered to this OAuth client."

2. **Start the connect flow.** Sign in to Kitevo, go to the dashboard/profile, and
   click "Connect YouTube." Say: "A creator connects their own YouTube channel here."

3. **Google account chooser + consent screen.** Let the real Google OAuth screen
   appear. Pause on it long enough to read: it must show the app name "Kitevo" and
   the permission "See your YouTube account" (`youtube.readonly`). Say: "Kitevo
   requests only read-only access to the creator's YouTube account."

4. **Grant access.** Click Allow. Show the redirect back into Kitevo.

5. **Show the data in use.** Navigate to the creator's media kit and point out the
   YouTube section: subscriber count, total views, video count, and the recent videos
   with their view and like counts. Say: "The read-only data is used only to display
   the creator's own channel statistics on their media kit, which they share with
   brands. Kitevo never changes anything on the YouTube account."

6. **Show disconnect (optional but strong).** Go to the dashboard and show the
   Disconnect YouTube control. Say: "The creator can revoke access at any time, which
   deletes the stored tokens."

### Video gotchas that cause rejections
- The consent screen in the video must be the real one for the client being verified
  (production app name Kitevo, correct logo). A localhost or test-project screen fails.
- The URL bar must show getkitevo.com, matching the authorized domain.
- Show the scope name/description clearly; do not cut away from the consent screen too
  fast.
- Narrate how the data is used, not just that access is granted. Reviewers reject
  videos that show the grant but not the in-app usage.

---

## 5. Pre-submission checklist

- [ ] Branding published, domain verified (done).
- [ ] Publishing status: In production (done).
- [ ] Privacy policy live at /privacy and contains the Google API Services User Data
      Policy / Limited Use disclosure with a link.
- [ ] Terms live at /terms.
- [ ] Homepage clearly explains what Kitevo does (a reviewer visits it).
- [ ] Only `youtube.readonly` is listed under scopes; remove any scope not actually
      used.
- [ ] Demo video recorded per the shot list, link ready to paste.
- [ ] Developer contact email monitored (Google emails follow-up questions here; slow
      replies stall the review).

## After approval
- The "unverified app" warning disappears.
- The 100-user cap is lifted for `youtube.readonly`.
- No code change is needed; the same client id and scope keep working.
