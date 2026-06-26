export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** Domain without protocol, e.g. "mediakitpro.co" */
export const APP_HOST = APP_URL.replace(/^https?:\/\//, "");
