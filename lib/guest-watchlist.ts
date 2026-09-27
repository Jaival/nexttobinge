import { useSyncExternalStore } from "react";
import type { MediaCardItem, MediaType } from "@/components/media-card";
import { GUEST_LIMIT, isPosterUrl } from "@/lib/guest-watchlist-rules";

// Signed-out visitors can save titles too. They live in this browser's
// localStorage until the visitor signs in, when GuestWatchlistSync moves them
// into the database (POST /api/watchlists/import).

const STORAGE_KEY = "ntb-guest-watchlist";

export interface GuestItem extends MediaCardItem {
  addedAt: string;
}

const MEDIA_TYPES: MediaType[] = ["movie", "tv", "anime"];

/** localStorage is user-editable, so treat what comes back as untrusted. */
function isGuestItem(value: unknown): value is GuestItem {
  const v = value as GuestItem;
  return (
    typeof v === "object" &&
    v !== null &&
    Number.isInteger(v.id) &&
    typeof v.title === "string" &&
    MEDIA_TYPES.includes(v.type) &&
    (v.posterUrl == null || isPosterUrl(v.posterUrl))
  );
}

function read(): GuestItem[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isGuestItem).slice(0, GUEST_LIMIT) : [];
  } catch {
    return [];
  }
}

// useSyncExternalStore compares snapshots by reference, so getSnapshot must
// return the same array until something actually changes. Re-parsing on every
// call would hand back a new array each render and loop forever.
let snapshot: GuestItem[] | null = null;
const listeners = new Set<() => void>();

function write(items: GuestItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  snapshot = items;
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  // The "storage" event fires when another tab changes localStorage, which
  // keeps every open tab's list in step.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    snapshot = null;
    notify();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  snapshot ??= read();
  return snapshot;
}

const EMPTY: GuestItem[] = [];

export function useGuestWatchlist() {
  // The server has no localStorage; it renders an empty list and the client
  // fills it in after hydration.
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

const sameTitle = (a: Pick<MediaCardItem, "type" | "id">, b: Pick<MediaCardItem, "type" | "id">) =>
  a.type === b.type && a.id === b.id;

export function addGuestItem(item: MediaCardItem): "added" | "exists" | "full" {
  const items = getSnapshot();
  if (items.some((existing) => sameTitle(existing, item))) return "exists";
  if (items.length >= GUEST_LIMIT) return "full";
  write([{ ...item, addedAt: new Date().toISOString() }, ...items]);
  return "added";
}

export function removeGuestItems(toRemove: Pick<MediaCardItem, "type" | "id">[]) {
  write(getSnapshot().filter((item) => !toRemove.some((r) => sameTitle(item, r))));
}
