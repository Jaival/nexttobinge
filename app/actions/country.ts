"use server";

import { cookies } from "next/headers";
import { COUNTRY_COOKIE, isCountryCode } from "@/lib/country";

/** Saves the country picked on a title page. The page re-renders with it. */
export async function setCountry(country: string) {
  // Server Functions are public HTTP endpoints: validate like any request body.
  if (!isCountryCode(country)) return;

  (await cookies()).set(COUNTRY_COOKIE, country, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
