/** What the Instagram/YouTube OAuth callbacks' result params mean, for banners. Client-safe. */
export const INSTAGRAM_ERROR_MESSAGES: Record<string, string> = {
  not_configured: "Instagram connect is not configured. Add META_APP_ID and META_APP_SECRET.",
  invalid: "Invalid or expired request. Try connecting again.",
  no_pages: "No Facebook Page found. Create a Page and try again.",
  permission_denied: "Meta declined access. Grant all requested permissions when prompted.",
  no_instagram_account: "No Instagram Business or Creator account linked to your Page.",
  server: "Something went wrong. Try again later.",
  access_denied: "You declined access. Connect again to grant permissions.",
};

export const YOUTUBE_RESULT_MESSAGES: Record<string, { tone: "success" | "danger"; text: string }> = {
  connected: { tone: "success", text: "YouTube connected. Your subscribers and videos will now load from your channel." },
  error: { tone: "danger", text: "YouTube connection failed. Please try again." },
  no_channel: { tone: "danger", text: "No YouTube channel found on this Google account." },
};
