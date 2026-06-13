import type { MediaCategory } from "@/types/palate";

const category_labels: Record<MediaCategory, string> = {
  meme: "Meme",
  image: "Image",
  audio: "Audio",
  video: "Video"
};

export function CategoryBadge({ category }: { category: MediaCategory }) {
  return <span className={`badge category_badge category_${category}`}>{category_labels[category]}</span>;
}
