"use client";

import { useState } from "react";
import { PlayIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface TrailerButtonProps {
  /** YouTube video id. */
  videoKey: string;
  title: string;
}

/**
 * A YouTube embed costs about 1 MB of JavaScript and a dozen requests. The
 * iframe only exists while the dialog is open, so visitors who never press
 * play never pay for it. youtube-nocookie.com doesn't set tracking cookies
 * until playback starts.
 */
export function TrailerButton({ videoKey, title }: TrailerButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <PlayIcon data-icon="inline-start" />
        Play trailer
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="gap-0 overflow-hidden p-0 sm:max-w-4xl"
          showCloseButton={false}
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">{title} trailer</DialogTitle>
          {open && (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoKey)}?autoplay=1&rel=0`}
              title={`${title} trailer`}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              className="aspect-video w-full"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
