"use client";

import { useState } from "react";
import Link from "next/link";
import { SignUpButton, useAuth } from "@clerk/nextjs";
import { CopyPlusIcon, ArrowRightIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";

/**
 * The sign-up hook on a shared list. A visitor who likes someone's list is
 * one click from wanting their own, so signed-out visitors get the sign-up
 * modal; once signed in, the same button copies the list.
 *
 * Signed-in state is read in the browser, which keeps the page itself the
 * same for everyone and therefore cacheable.
 */
export function SaveCopyButton({ listId }: { listId: string }) {
  const { isSignedIn } = useAuth();
  const [pending, setPending] = useState(false);
  const [copyId, setCopyId] = useState<string | null>(null);

  if (!isSignedIn) {
    return (
      <SignUpButton mode="modal">
        <Button size="sm">
          <CopyPlusIcon data-icon="inline-start" />
          Save a copy
        </Button>
      </SignUpButton>
    );
  }

  if (copyId) {
    return (
      <Button size="sm" asChild>
        <Link href={`/watchlists/${copyId}`}>
          Open your copy
          <ArrowRightIcon data-icon="inline-end" />
        </Link>
      </Button>
    );
  }

  async function saveCopy() {
    // Disabled while pending: a double click would otherwise make two copies.
    setPending(true);
    try {
      const res = await fetch(`/api/watchlists/${listId}/copy`, { method: "POST" });
      if (!res.ok) throw new Error();
      const copy: { id: string; name: string } = await res.json();
      setCopyId(copy.id);
      track("List copied", {});
      toast.success(`Saved "${copy.name}" to your watchlists`);
    } catch {
      toast.error("Couldn't save a copy");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button size="sm" onClick={saveCopy} disabled={pending}>
      <CopyPlusIcon data-icon="inline-start" />
      {pending ? "Saving…" : "Save a copy"}
    </Button>
  );
}
