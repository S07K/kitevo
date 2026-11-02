/**
 * Fixed English country names for form pickers.
 *
 * Deliberately NOT Intl.DisplayNames: Node and browsers ship different ICU data
 * ("Hong Kong SAR China" vs "Hong Kong"), so a server-rendered <select> built from it
 * fails hydration. A static list renders identically everywhere.
 */
export const COUNTRIES: ReadonlyArray<{ code: string; name: string }> = [
  ["AR", "Argentina"], ["AU", "Australia"], ["AT", "Austria"], ["BD", "Bangladesh"], ["BE", "Belgium"],
  ["BR", "Brazil"], ["BG", "Bulgaria"], ["CA", "Canada"], ["CL", "Chile"], ["CN", "China"],
  ["CO", "Colombia"], ["HR", "Croatia"], ["CY", "Cyprus"], ["CZ", "Czechia"], ["DK", "Denmark"],
  ["EG", "Egypt"], ["EE", "Estonia"], ["FI", "Finland"], ["FR", "France"], ["DE", "Germany"],
  ["GH", "Ghana"], ["GR", "Greece"], ["HK", "Hong Kong"], ["HU", "Hungary"], ["IS", "Iceland"],
  ["IN", "India"], ["ID", "Indonesia"], ["IE", "Ireland"], ["IL", "Israel"], ["IT", "Italy"],
  ["JP", "Japan"], ["KE", "Kenya"], ["LV", "Latvia"], ["LT", "Lithuania"], ["LU", "Luxembourg"],
  ["MY", "Malaysia"], ["MT", "Malta"], ["MX", "Mexico"], ["MA", "Morocco"], ["NP", "Nepal"],
  ["NL", "Netherlands"], ["NZ", "New Zealand"], ["NG", "Nigeria"], ["NO", "Norway"], ["PK", "Pakistan"],
  ["PE", "Peru"], ["PH", "Philippines"], ["PL", "Poland"], ["PT", "Portugal"], ["QA", "Qatar"],
  ["RO", "Romania"], ["SA", "Saudi Arabia"], ["RS", "Serbia"], ["SG", "Singapore"], ["SK", "Slovakia"],
  ["SI", "Slovenia"], ["ZA", "South Africa"], ["KR", "South Korea"], ["ES", "Spain"], ["LK", "Sri Lanka"],
  ["SE", "Sweden"], ["CH", "Switzerland"], ["TW", "Taiwan"], ["TH", "Thailand"], ["TR", "Turkey"],
  ["UA", "Ukraine"], ["AE", "United Arab Emirates"], ["GB", "United Kingdom"], ["US", "United States"],
  ["UY", "Uruguay"], ["VN", "Vietnam"],
].map(([code, name]) => ({ code, name }));

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c.name]));

export function countryName(code: string): string {
  return BY_CODE.get(code.toUpperCase()) ?? code.toUpperCase();
}

/** 🇮🇳 from "IN" (regional indicator symbols). */
export function flagEmoji(code: string): string {
  const c = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return "";
  return String.fromCodePoint(...[...c].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}
