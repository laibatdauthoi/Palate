"use client";

import { useMemo, useState } from "react";
import { ActionButton } from "@/components/action_button";
import { MediaCard } from "@/components/media_card";
import { PageHeader } from "@/components/page_header";
import { SectionPanel } from "@/components/section_panel";
import { usePalate } from "@/providers/palate_provider";
import type { MediaCategory, MediaStatus } from "@/types/palate";

const statuses = ["All", "Idle", "Waiting", "Active", "Settled"] as const;
const categories = ["All Categories", "Meme", "Image"] as const;
const status_values = {
  Idle: "idle",
  Waiting: "waiting",
  Active: "active",
  Settled: "settled"
} as const satisfies Record<Exclude<(typeof statuses)[number], "All">, MediaStatus>;
const category_values = {
  Meme: "meme",
  Image: "image"
} as const satisfies Record<Exclude<(typeof categories)[number], "All Categories">, MediaCategory>;

export default function MyMediaPage() {
  const { mediaRecords } = usePalate();
  const [status, setStatus] = useState<(typeof statuses)[number]>("All");
  const [category, setCategory] = useState<(typeof categories)[number]>("All Categories");

  const filteredMedia = useMemo(() => {
    return mediaRecords.filter((media) => {
      const statusMatches = status === "All" || media.status === status_values[status];
      const categoryMatches = category === "All Categories" || media.category === category_values[category];
      return statusMatches && categoryMatches;
    });
  }, [category, mediaRecords, status]);

  return (
    <div className="page_stack">
      <PageHeader
        eyebrow="Inventory"
        title="My Media"
        copy="Registered media appears here after Shelby upload and on-chain registration. This shell uses temporary mock data."
        actions={<ActionButton href="/my-media/upload">Upload Media</ActionButton>}
      />

      <SectionPanel>
        <div className="filter_bar">
          <div className="tabs" aria-label="Status filters">
            {statuses.map((item) => (
              <button className={`tab_button ${status === item ? "active" : ""}`} key={item} onClick={() => setStatus(item)}>
                {item}
              </button>
            ))}
          </div>
          <select className="input_control select_control" value={category} onChange={(event) => setCategory(event.target.value as (typeof categories)[number])}>
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
      </SectionPanel>

      <div className="media_grid">
        {filteredMedia.map((media) => (
          <MediaCard
            key={media.id}
            media={media}
            actionLabel={media.status === "idle" ? "Push" : media.status === "waiting" ? "Waiting" : media.status === "active" ? "View Match" : "View Result"}
          />
        ))}
      </div>
    </div>
  );
}
