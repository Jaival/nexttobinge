import { SparklesIcon } from "lucide-react";
import { getTrendingAnime, getAnimeTitle } from "@/lib/anilist";
import { BrowsePageClient } from "@/components/browse-page-client";
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
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <SparklesIcon className="size-6 text-primary" />
        <h1 className="font-heading text-2xl font-semibold">Anime</h1>
      </div>
      <BrowsePageClient items={items} totalPages={data.pageInfo.lastPage} currentPage={page} />
    </div>
  );
}
