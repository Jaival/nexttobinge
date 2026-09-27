import { cookies, headers } from "next/headers";

export const COUNTRY_COOKIE = "ntb-country";
const FALLBACK_COUNTRY = "US";

export function isCountryCode(value: unknown): value is string {
  return typeof value === "string" && /^[A-Z]{2}$/.test(value);
}

/**
 * Which country's streaming catalogue to show, most specific source first:
 *
 * 1. The visitor's own choice, saved in a cookie by the country picker.
 * 2. The country the CDN geolocated their IP to. Vercel adds
 *    x-vercel-ip-country to every request; Cloudflare's equivalent is
 *    cf-ipcountry. Neither exists on localhost.
 * 3. US, the largest catalogue.
 *
 * Reading headers or cookies makes the page render per request. That's fine
 * here: the expensive part, the TMDB response, is cached once for all
 * countries, and only this cheap lookup differs between visitors.
 */
export async function getCountry(): Promise<string> {
  const saved = (await cookies()).get(COUNTRY_COOKIE)?.value;
  if (isCountryCode(saved)) return saved;

  const h = await headers();
  const geo = h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry");
  if (isCountryCode(geo)) return geo;

  return FALLBACK_COUNTRY;
}
