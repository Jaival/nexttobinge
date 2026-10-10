import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What NextToBinge stores about you, who processes it, and how to delete it.",
  alternates: { canonical: "/privacy" },
};

// Update this date whenever the policy's substance changes.
const LAST_UPDATED = "10 October 2026";

// Where privacy requests go. The repository is public, so a request filed
// there is public too: replace this with a private address before launch.
const CONTACT_URL = "https://github.com/Jaival/nexttobinge/issues";

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
 * Written from what the code actually does: lib/sentry.ts, lib/analytics.ts,
 * lib/guest-watchlist.ts, app/actions/country.ts and the Clerk webhook. If
 * any of those change what they collect or send, this page has to change too.
 */
export default function PrivacyPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10">
      <PageHeader title="Privacy" description={`Last updated ${LAST_UPDATED}`} />

      <div className="flex flex-col gap-10 text-sm leading-relaxed text-muted-foreground [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
        <p>
          NextToBinge helps you find something to watch and keep track of it. You can browse
          without an account. This page explains what is stored when you do more than browse, and
          how to remove it.
        </p>

        <Section title="If you don't sign in">
          <ul>
            <li>
              <strong>Your guest watchlist</strong>{" "}is saved in your browser&apos;s local storage,
              not on our servers. If you sign in, it is moved into your account.
            </li>
            <li>
              <strong>Your country</strong>, if you pick one on a title page, is saved in a cookie
              for a year so we can show which streaming services carry the title where you are.
            </li>
            <li>
              <strong>Your theme and colour choices</strong>{" "}are saved in local storage.
            </li>
          </ul>
          <p>
            To remove all of these, clear this site&apos;s data in your browser settings.
          </p>
        </Section>

        <Section title="If you create an account">
          <ul>
            <li>
              <strong>Your account details</strong>: your email address, and your name and profile
              picture if you add them or sign in with Google or GitHub. Sign-in is handled by Clerk,
              which also sets the cookies that keep you signed in.
            </li>
            <li>
              <strong>Your watchlists</strong>: their names and descriptions, the titles in them,
              and whether you&apos;ve watched each one.
            </li>
          </ul>
          <p>
            We use this only to run the site for you. We don&apos;t sell it, share it with
            advertisers, or send you marketing email.
          </p>
        </Section>

        <Section title="Shared lists">
          <p>
            Watchlists are private unless you choose to share one. A shared list can be seen by
            anyone with its link and shows the list&apos;s name and description, its titles, and
            your first name. It never shows what you have or haven&apos;t watched. Turning sharing
            off makes the link stop working immediately.
          </p>
        </Section>

        <Section title="Analytics and error reports">
          <ul>
            <li>
              <strong>Vercel Web Analytics and Speed Insights</strong>{" "}count page views and measure
              how fast pages load. They don&apos;t use cookies and don&apos;t identify you.
            </li>
            <li>
              <strong>Sentry</strong>{" "}receives a report when something breaks: the error, the page
              it happened on, and your browser type. We&apos;ve turned off its collection of
              cookies, account details and the contents of your requests.
            </li>
          </ul>
        </Section>

        <Section title="Who processes your data">
          <ul>
            <li>
              <a href="https://clerk.com/legal/privacy" target="_blank" rel="noopener noreferrer" className={linkClass}>
                Clerk
              </a>{" "}
              for sign-in and account details
            </li>
            <li>
              <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className={linkClass}>
                Supabase
              </a>{" "}
              for the database that holds accounts and watchlists
            </li>
            <li>
              <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className={linkClass}>
                Vercel
              </a>{" "}
              for hosting and analytics
            </li>
            <li>
              <a href="https://sentry.io/privacy/" target="_blank" rel="noopener noreferrer" className={linkClass}>
                Sentry
              </a>{" "}
              for error reports
            </li>
            <li>
              YouTube, only when you press play on a trailer. Trailers load from
              youtube-nocookie.com, which doesn&apos;t set tracking cookies until you interact with
              the video.
            </li>
          </ul>
        </Section>

        <Section title="Deleting your account">
          <p>
            Open the account menu in the top corner, choose <strong>Manage account</strong>, then{" "}
            <strong>Delete account</strong>. This deletes your account and every watchlist in it,
            including shared ones, whose links stop working straight away. It can&apos;t be undone.
          </p>
        </Section>

        <Section title="Questions">
          <p>
            For questions about your data, or to ask for a copy of it,{" "}
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
