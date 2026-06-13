import type { MediaCategory } from "@/data/mock_data";

export function CategoryBadge({ category }: { category: MediaCategory }) {
  return <span className={`badge category_badge category_${category.toLowerCase()}`}>{category}</span>;
}
