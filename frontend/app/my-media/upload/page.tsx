"use client";

import { useState } from "react";
import { ActionButton } from "@/components/action_button";
import { PageHeader } from "@/components/page_header";
import { SectionPanel } from "@/components/section_panel";
import { app_config, upload_step_labels } from "@/config/app_config";
import { usePalate } from "@/providers/palate_provider";
import type { MediaCategory, MediaFormat, UploadStep } from "@/types/palate";

const progress_steps: UploadStep[] = ["preparing_file", "uploading_to_shelby", "registering_on_chain", "completed"];
const mime_by_format: Record<MediaFormat, string> = {
  PNG: "image/png",
  JPG: "image/jpeg",
  JPEG: "image/jpeg",
  WEBP: "image/webp",
  GIF: "image/gif",
  MP3: "audio/mpeg",
  WAV: "audio/wav",
  OGG: "audio/ogg",
  M4A: "audio/mp4",
  MP4: "video/mp4",
  WEBM: "video/webm",
  MOV: "video/quicktime"
};

const category_labels: Record<MediaCategory, string> = {
  meme: "Meme",
  image: "Image",
  audio: "Audio",
  video: "Video"
};

const category_copy: Record<MediaCategory, string> = {
  meme: "Reaction-style or meme content.",
  image: "Visual art, animation, posters, AI images, or edited images.",
  audio: "Music, loops, voice clips, and sound-first media.",
  video: "Short edits, motion pieces, trailers, and video-first media."
};

export default function UploadPage() {
  const { feedback, processingAction, uploadMockMedia, uploadStep } = usePalate();
  const [category, setCategory] = useState<MediaCategory>("meme");
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState<MediaFormat>("PNG");
  const uploadBusy = processingAction === "upload";
  const selectedStep = uploadStep ?? "preparing_file";

  return (
    <div className="page_stack page_upload">
      <PageHeader
        eyebrow="Upload"
        title="Select category before uploading to Shelby."
        copy="Category is stored on chain by Palate. Shelby stores the media file only. GIF is accepted as an image format, not a category."
      />

      <div className="two_column">
        <SectionPanel title="Category-first flow" accent>
          <div className="stack">
            <div className="category_choice_grid">
              {app_config.supportedCategories.map((item) => (
                <button className={`category_choice ${category === item ? "active" : ""}`} key={item} onClick={() => setCategory(item)}>
                  <strong>{category_labels[item]}</strong>
                  <span>{category_copy[item]}</span>
                </button>
              ))}
            </div>
            <label className="amount_input">
              <span>Title</span>
              <input className="input_control" onChange={(event) => setTitle(event.target.value)} placeholder="Media title" value={title} />
            </label>
            <label className="amount_input">
              <span>File</span>
              <input
                className="input_control"
                type="file"
                accept={app_config.acceptedUploadMimeTypes.join(",")}
                onChange={(event) => {
                  const name = event.target.files?.[0]?.name.toUpperCase() ?? "";
                  const matchedFormat = app_config.acceptedUploadFormats.find((candidate) => name.endsWith(`.${candidate}`));
                  if (matchedFormat) setFormat(matchedFormat);
                }}
              />
            </label>
            <label className="amount_input">
              <span>Format metadata</span>
              <select className="input_control" onChange={(event) => setFormat(event.target.value as MediaFormat)} value={format}>
                {app_config.acceptedUploadFormats.map((candidate) => (
                  <option key={candidate} value={candidate}>{candidate}</option>
                ))}
              </select>
            </label>
            <p className="secondary_text">Accepted formats: {app_config.acceptedUploadFormats.join(", ")}. GIF remains a format, not a category.</p>
            <ActionButton
              disabled={uploadBusy}
              onClick={() =>
                uploadMockMedia({
                  category,
                  title,
                  format,
                  mimeType: mime_by_format[format]
                })
              }
            >
              {uploadBusy ? "Uploading" : "Start Upload"}
            </ActionButton>
            {feedback ? <p className={`feedback_text feedback_${feedback.type}`}>{feedback.message}</p> : null}
          </div>
        </SectionPanel>

        <SectionPanel title="Media and progress">
          <div className="stack">
            <div className="upload_preview">
              <span>{category_labels[category]} media placeholder</span>
            </div>
            <div className="upload_steps">
              {progress_steps.map((step, index) => (
                <div className={`upload_step ${selectedStep === step ? "active" : ""}`} key={step}>
                  <span>{index + 1}</span>
                  {upload_step_labels[step]}
                </div>
              ))}
            </div>
            <p className="mock_note">Shelby upload and registerMedia will complete this flow in the integration phase.</p>
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}
