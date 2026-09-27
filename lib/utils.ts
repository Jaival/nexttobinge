import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Postgres rejects a malformed uuid with an error, which would surface as a
 * 500. Checking first turns a mistyped or made-up URL into a clean 404.
 */
export function isUuid(value: string) {
  return UUID.test(value)
}
