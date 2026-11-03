// Safe to import from client and server code: no request APIs in here.
//
// Which country's streaming catalogue to show is decided in the browser, so
// the title pages stay cached (ISR) instead of rendering per visitor. Most
// specific source first:
//
// 1. The visitor's own choice, saved in the cookie by the country picker.
// 2. The country the CDN geolocated their IP to, fetched once from
//    /api/country (app/api/country/route.ts), which also saves the cookie.
// 3. India, when neither is available.

export const COUNTRY_COOKIE = "ntb-country";
export const COUNTRY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
export const FALLBACK_COUNTRY = "IN";

export function isCountryCode(value: unknown): value is string {
  return typeof value === "string" && /^[A-Z]{2}$/.test(value);
}
