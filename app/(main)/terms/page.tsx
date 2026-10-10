import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { CONTACT_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Terms",
  description: "The rules for using NextToBinge, what you can expect from it, and what it can't promise.",
  alternates: { canonical: "/terms" },
};

// Update this date whenever the terms' substance changes.
const LAST_UPDATED = "10 October 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-section">{title}</h2>
      {children}
    </section>
  );
}

const linkClass = "underline underline-offset-2 hover:text-foreground";

/**
 * Plain-language terms for a free, ad-free site. Not legal advice: have them
 * reviewed if the site starts charging, running ads, or targets a specific
 * country's consumers.
 */
export default function TermsPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10">
      <PageHeader title="Terms" description={`Last updated ${LAST_UPDATED}`} />

      <div className="flex flex-col gap-10 text-sm leading-relaxed text-muted-foreground [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
        <p>
          NextToBinge is a free site for finding movies, series and anime and keeping track of them
          in watchlists. By using it you agree to these terms. If you don&apos;t agree, please
          don&apos;t use the site.
        </p>

        <Section title="Your account">
          <p>
            You can browse without an account. If you create one, keep your sign-in details to
            yourself: you&apos;re responsible for what happens under your account. You can delete it
            at any time, as described in the{" "}
            <Link href="/privacy" className={linkClass}>
              privacy policy
            </Link>
            .
          </p>
        </Section>

        <Section title="What you add">
          <p>
            Your watchlists, including their names and descriptions, stay yours. When you share a
            list, you allow NextToBinge to show it, and a preview image of it, to anyone with the
            link until you turn sharing off. Anyone viewing a shared list can save a copy of it to
            their own account.
          </p>
          <p>Don&apos;t put anything in a list name or description that:</p>
          <ul>
            <li>is illegal, hateful, harassing or sexually explicit;</li>
            <li>shares someone else&apos;s personal information;</li>
            <li>is spam or advertising.</li>
          </ul>
          <p>We may remove shared lists that break these rules.</p>
        </Section>

        <Section title="Using the site fairly">
          <ul>
            <li>Don&apos;t try to get into other people&apos;s accounts or private lists.</li>
            <li>
              Don&apos;t scrape the site, flood it with automated requests, or try to disrupt it.
            </li>
            <li>Don&apos;t use it for anything illegal.</li>
          </ul>
          <p>We may suspend or delete accounts that do.</p>
        </Section>

        <Section title="Where the information comes from">
          <p>
            Titles, posters, descriptions and trailers come from{" "}
            <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" className={linkClass}>
              TMDB
            </a>{" "}
            and{" "}
            <a href="https://anilist.co" target="_blank" rel="noopener noreferrer" className={linkClass}>
              AniList
            </a>
            , and streaming availability comes from JustWatch through TMDB. That material belongs
            to its owners. We show it as it is and can&apos;t guarantee it&apos;s complete, accurate
            or current. In particular, check a streaming service before signing up for it on our
            word.
          </p>
          <p>
            NextToBinge doesn&apos;t host or stream any video. Trailers play from YouTube.
          </p>
        </Section>

        <Section title="No guarantees">
          <p>
            NextToBinge is provided as it is, for free. We try to keep it running and your lists
            safe, but we can&apos;t promise it will always be available or free of errors, and we
            may change or remove features. To the extent the law allows, we aren&apos;t liable for
            any loss that comes from using the site or from it being unavailable.
          </p>
        </Section>

        <Section title="Changes to these terms">
          <p>
            If these terms change, we&apos;ll update the date at the top of this page. Using the
            site after a change means you accept the new terms.
          </p>
        </Section>

        <Section title="Questions">
          <p>
            For questions about these terms,{" "}
            <a href={CONTACT_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
              get in touch
            </a>
            .
          </p>
        </Section>
      </div>
    </div>
  );
}
