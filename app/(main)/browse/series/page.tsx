import { discoverTV, posterUrl } from "@/lib/tmdb";
import { BrowsePageClient } from "@/components/browse-page-client";
import { PageHeader } from "@/components/page-header";
import type { MediaCardItem } from "@/components/media-card";

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function SeriesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = String(Math.max(1, Number(params.page ?? 1)));
  const data = await discoverTV({ page });

  const items: MediaCardItem[] = data.results.map((t) => ({
    id: t.id,
    title: t.name,
    posterUrl: posterUrl(t.poster_path),
    year: t.first_air_date ? t.first_air_date.slice(0, 4) : null,
    rating: t.vote_average,
    type: "tv",
  }));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Series" description="Shows worth clearing an evening for." />
      <BrowsePageClient items={items} totalPages={data.total_pages} currentPage={Number(page)} />
    </div>
  );
}
