import type { MediaCategory } from "@/types/palate";

export function CategoryBadge({ category }: { category: MediaCategory }) {
  return <span className={`badge category_badge category_${category}`}>{category === "meme" ? "Meme" : "Image"}</span>;
}
