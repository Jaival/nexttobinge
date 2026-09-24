import { getTrendingAnime, getAnimeTitle } from "@/lib/anilist";
import { BrowsePageClient } from "@/components/browse-page-client";
import { PageHeader } from "@/components/page-header";
import type { MediaCardItem } from "@/components/media-card";

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function AnimePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const data = await getTrendingAnime(page, 20);

  const items: MediaCardItem[] = data.media.map((a) => ({
    id: a.id,
    title: getAnimeTitle(a),
    posterUrl: a.coverImage.extraLarge,
    year: a.seasonYear ? String(a.seasonYear) : null,
    rating: a.averageScore,
    type: "anime",
  }));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Anime" description="What the AniList community is watching now." />
      <BrowsePageClient items={items} totalPages={data.pageInfo.lastPage} currentPage={page} />
    </div>
  );
}
