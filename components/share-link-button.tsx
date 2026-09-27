"use client";

import { Share2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface ShareLinkButtonProps {
  /** Site-relative path, e.g. /lists/<id>. */
  path: string;
  title: string;
  label?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
}

/**
 * Phones get the native share sheet (WhatsApp, Messages, Discord...), which
 * is how links actually travel there. Desktops get copy-to-clipboard, since
 * their share sheets are rarely where people paste links from.
 */
export function ShareLinkButton({
  path,
  title,
  label = "Share",
  variant = "outline",
  size = "sm",
}: ShareLinkButtonProps) {
  async function share() {
    // The current origin, not a configured one, so a preview deployment
    // shares preview links.
    const url = new URL(path, window.location.origin).toString();

    const touch = window.matchMedia("(pointer: coarse)").matches;
    if (touch && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        // Closing the share sheet rejects with AbortError. That's a choice,
        // not a failure; anything else falls through to copying.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      // The clipboard API needs a secure context and permission.
      toast.error("Couldn't copy the link", { description: url });
    }
  }

  return (
    <Button variant={variant} size={size} onClick={share}>
      <Share2Icon data-icon="inline-start" />
      {label}
    </Button>
  );
}
