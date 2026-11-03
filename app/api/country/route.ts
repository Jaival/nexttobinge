import { NextResponse } from "next/server";
import { COUNTRY_COOKIE, COUNTRY_COOKIE_MAX_AGE, FALLBACK_COUNTRY, isCountryCode } from "@/lib/country";

/**
 * The visitor's country, as geolocated by the CDN. Vercel adds
 * x-vercel-ip-country to every request; Cloudflare's equivalent is
 * cf-ipcountry. Neither exists on localhost, so it falls back to India.
 * Title pages call this once from the browser; the cookie saves later visits
 * the round trip. Never cached: the answer depends on who asks.
 */
export function GET(request: Request) {
  const geo = request.headers.get("x-vercel-ip-country") ?? request.headers.get("cf-ipcountry");
  const country = isCountryCode(geo) ? geo : FALLBACK_COUNTRY;

  const response = NextResponse.json({ country }, { headers: { "Cache-Control": "private, no-store" } });
  response.cookies.set(COUNTRY_COOKIE, country, {
    path: "/",
    maxAge: COUNTRY_COOKIE_MAX_AGE,
    sameSite: "lax",
  });
  return response;
}
