import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChipLink } from "@/components/chip-link";
import { JsonLd } from "@/components/json-ld";
import { MediaGrid } from "@/components/media-grid";
import { PageHeader } from "@/components/page-header";
import { COLLECTIONS, getCollection, getCollectionItems } from "@/lib/collections";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Every collection is known at build time, so each page is prerendered to
// static HTML and served straight from the CDN. It's regenerated in the
// background at most once an hour (the revalidate on the TMDB/AniList
// fetches), which is ISR: static speed, data that doesn't go stale.
export function generateStaticParams() {
  return COLLECTIONS.map((c) => ({ slug: c.slug }));
}

// Any other slug is a 404 without rendering anything.
export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const collection = getCollection((await params).slug);
  if (!collection) return {};
  const path = `/collections/${collection.slug}`;
  return {
    title: collection.title,
    description: collection.description,
    alternates: { canonical: path },
    // Replaces the layout's openGraph rather than merging, so restate it.
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: collection.title,
      description: collection.description,
      url: path,
    },
  };
}

export default async function CollectionPage({ params }: PageProps) {
  const collection = getCollection((await params).slug);
  if (!collection) notFound();

  const items = await getCollectionItems(collection);

  // An ordered list Google can read as one: position, then the title's page.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: collection.title,
    description: collection.description,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(`/media/${item.type}/${item.id}`),
      name: item.title,
    })),
  };

  const others = COLLECTIONS.filter((c) => c.slug !== collection.slug);

  return (
    <div className="flex flex-col gap-8">
      <JsonLd data={jsonLd} />
      <div className="flex flex-col gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 self-start text-muted-foreground">
          <Link href="/collections">
            <ArrowLeftIcon data-icon="inline-start" />
            All collections
          </Link>
        </Button>
        <PageHeader title={collection.title} description={collection.description} />
      </div>

      <MediaGrid items={items} />

      {/* Internal links: help visitors keep browsing, and help crawlers find
          every collection from any one of them. */}
      <section className="flex flex-col gap-4">
        <h2 className="text-section">More collections</h2>
        <div className="flex flex-wrap gap-2">
          {others.map((c) => (
            <ChipLink key={c.slug} href={`/collections/${c.slug}`}>
              {c.title}
            </ChipLink>
          ))}
        </div>
      </section>
    </div>
  );
}
