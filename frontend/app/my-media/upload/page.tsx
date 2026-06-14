"use client";

import { useState } from "react";
import { ActionButton } from "@/components/action_button";
import { CustomDropdown, type DropdownOption } from "@/components/custom_dropdown";
import { PageHeader } from "@/components/page_header";
import { SectionPanel } from "@/components/section_panel";
import { app_config, upload_step_labels } from "@/config/app_config";
import { usePalate } from "@/providers/palate_provider";
import { usePalateWallet } from "@/providers/wallet_provider";
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
  const { feedback, processingAction, uploadMedia, uploadStep } = usePalate();
  const { walletStatus } = usePalateWallet();
  const [category, setCategory] = useState<MediaCategory>("meme");
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState<MediaFormat>("PNG");
  const [fileName, setFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileMeta, setFileMeta] = useState<{ name: string; size: number; type: string } | null>(null);
  const uploadBusy = processingAction === "upload";
  const walletReady = walletStatus === "connected";
  const shelbyReady = app_config.shelby.enabled;
  const selectedStep = uploadStep ?? "preparing_file";
  const formatOptions: DropdownOption<MediaFormat>[] = app_config.acceptedUploadFormats.map((candidate) => ({
    label: candidate,
    value: candidate
  }));
  const fileSizeLabel = fileMeta
    ? fileMeta.size >= 1024 * 1024
      ? `${(fileMeta.size / 1024 / 1024).toFixed(2)} MB`
      : `${Math.max(1, Math.round(fileMeta.size / 1024))} KB`
    : null;

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
              <div className="file_picker">
                <input
                  className="file_picker_input"
                  id="palate_upload_file"
                  type="file"
                  accept={app_config.acceptedUploadMimeTypes.join(",")}
                  onChange={(event) => {
                  const selectedFile = event.target.files?.[0] ?? null;
                  const selectedName = selectedFile?.name ?? "";
                  setSelectedFile(selectedFile);
                  setFileName(selectedName);
                  setFileMeta(selectedFile ? { name: selectedFile.name, size: selectedFile.size, type: selectedFile.type || mime_by_format[format] } : null);
                    const normalizedName = selectedName.toUpperCase();
                    const matchedFormat = app_config.acceptedUploadFormats.find((candidate) => normalizedName.endsWith(`.${candidate}`));
                    if (matchedFormat) setFormat(matchedFormat);
                  }}
                />
                <label
                  className="file_picker_button"
                  htmlFor="palate_upload_file"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      document.getElementById("palate_upload_file")?.click();
                    }
                  }}
                  tabIndex={0}
                >
                  Choose file
                </label>
                <div className={`file_picker_display ${fileMeta ? "has_file" : ""}`}>
                  <strong>{fileMeta?.name ?? "Awaiting media file"}</strong>
                  <span>{fileMeta ? `${fileMeta.type || mime_by_format[format]} / ${fileSizeLabel}` : "Select a supported media file before registration."}</span>
                </div>
              </div>
            </label>
            <CustomDropdown label="Format metadata" onChange={setFormat} options={formatOptions} value={format} />
            <p className="secondary_text">Accepted formats: {app_config.acceptedUploadFormats.join(", ")}. GIF remains a format, not a category.</p>
            <ActionButton
              disabled={uploadBusy || !walletReady || !shelbyReady || !selectedFile}
              onClick={() =>
                uploadMedia({
                  category,
                  title,
                  format,
                  mimeType: mime_by_format[format],
                  fileName,
                  file: selectedFile
                })
              }
            >
              {uploadBusy ? "Registering" : "Start Upload"}
            </ActionButton>
            {!walletReady ? <p className="feedback_text feedback_info">Connect wallet to register media on chain.</p> : null}
            {!shelbyReady ? <p className="feedback_text feedback_error">Shelby API key is not configured.</p> : null}
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
            <p className="mock_note">Files upload to Shelby first, then Palate registration is submitted on Aptos Testnet.</p>
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}
