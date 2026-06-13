"use client";

import { useState } from "react";
import { ActionButton } from "@/components/action_button";
import { PageHeader } from "@/components/page_header";
import { SectionPanel } from "@/components/section_panel";

const progress_steps = ["Preparing file", "Uploading to Shelby", "Registering on chain", "Completed"];

export default function UploadPage() {
  const [category, setCategory] = useState<"Meme" | "Image">("Meme");

  return (
    <div className="page_stack">
      <PageHeader
        eyebrow="Upload"
        title="Select category before uploading to Shelby."
        copy="Category is stored on chain by Palate. Shelby stores the media file only. GIF is accepted as an image format, not a category."
      />

      <div className="two_column">
        <SectionPanel title="Category-first flow" accent>
          <div className="stack">
            <div className="category_choice_grid">
              {(["Meme", "Image"] as const).map((item) => (
                <button className={`category_choice ${category === item ? "active" : ""}`} key={item} onClick={() => setCategory(item)}>
                  <strong>{item}</strong>
                  <span>{item === "Meme" ? "Reaction-style or meme content." : "Visual art, animation, posters, AI images, or edited images."}</span>
                </button>
              ))}
            </div>
            <label className="amount_input">
              <span>Title</span>
              <input className="input_control" placeholder="Media title" />
            </label>
            <label className="amount_input">
              <span>File</span>
              <input className="input_control" type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/gif" />
            </label>
            <p className="secondary_text">Accepted formats: PNG, JPG, JPEG, WEBP, GIF.</p>
            <ActionButton>Start Mock Upload</ActionButton>
          </div>
        </SectionPanel>

        <SectionPanel title="Preview and progress">
          <div className="stack">
            <div className="upload_preview">
              <span>{category} preview placeholder</span>
            </div>
            <div className="upload_steps">
              {progress_steps.map((step, index) => (
                <div className={`upload_step ${index === 1 ? "active" : ""}`} key={step}>
                  <span>{index + 1}</span>
                  {step}
                </div>
              ))}
            </div>
            <p className="mock_note">Shelby upload and registerMedia are intentionally not integrated in Task F1.</p>
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}
