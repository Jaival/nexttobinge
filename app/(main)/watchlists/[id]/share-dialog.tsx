"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLinkIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShareLinkButton } from "@/components/share-link-button";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  watchlistId: string;
  name: string;
  isPublic: boolean;
  onIsPublicChange: (isPublic: boolean) => void;
}

export function ShareDialog({
  open,
  onOpenChange,
  watchlistId,
  name,
  isPublic,
  onIsPublicChange,
}: ShareDialogProps) {
  const [pending, setPending] = useState(false);
  const path = `/lists/${watchlistId}`;

  async function toggle() {
    const next = !isPublic;
    setPending(true);
    try {
      // The server decides who may change this (it checks ownership); the
      // client only asks. Its answer is what the switch then shows.
      const res = await fetch(`/api/watchlists/${watchlistId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: next }),
      });
      if (!res.ok) throw new Error();
      const updated: { isPublic: boolean } = await res.json();
      onIsPublicChange(updated.isPublic);
      if (updated.isPublic) track("List made public", {});
      toast.success(updated.isPublic ? "Anyone with the link can view it" : "The list is private again");
    } catch {
      toast.error("Couldn't change sharing");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share &ldquo;{name}&rdquo;</DialogTitle>
          <DialogDescription>
            A public list shows its titles and your first name to anyone with the link. What
            you&rsquo;ve watched stays private.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/50 p-3 ring-1 ring-border">
          <div className="min-w-0">
            <p id="share-switch-label" className="text-sm font-medium">
              Public link
            </p>
            <p className="text-meta text-muted-foreground">
              {isPublic ? "On: anyone with the link can view" : "Off: only you can see this list"}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isPublic}
            aria-labelledby="share-switch-label"
            disabled={pending}
            onClick={toggle}
            className={cn(
              "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50",
              isPublic ? "bg-primary" : "bg-input"
            )}
          >
            <span
              className={cn(
                "size-5 rounded-full bg-background shadow-sm transition-transform duration-150",
                isPublic ? "translate-x-[18px]" : "translate-x-0.5"
              )}
            />
          </button>
        </div>

        {isPublic && (
          <div className="flex flex-wrap gap-2">
            <ShareLinkButton
              path={path}
              title={name}
              label="Copy or share link"
              variant="default"
              owner
            />
            <Button variant="outline" size="sm" asChild>
              <Link href={path} target="_blank">
                <ExternalLinkIcon data-icon="inline-start" />
                Open public page
              </Link>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
