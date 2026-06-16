"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionButton } from "@/components/action_button";
import { CustomDropdown, type DropdownOption } from "@/components/custom_dropdown";
import { PageHeader } from "@/components/page_header";
import { SectionPanel } from "@/components/section_panel";
import { VIDEO_ENABLED, app_config, upload_step_labels } from "@/config/app_config";
import { usePalate } from "@/providers/palate_provider";
import { usePalateWallet } from "@/providers/wallet_provider";
import type { MediaCategory, MediaFormat, UploadStep } from "@/types/palate";
import {
  detectFormatFromFile,
  detectMediaKindFromFile,
  getAllowedCategoriesForKind,
  getAllowedFormatsForKind,
  getFileCategoryMessage,
  isCategoryCompatibleWithKind
} from "@/utils/media_file_validation";

const progress_steps: UploadStep[] = [
  "preparing_file",
  "generating_commitments",
  "registering_shelby_blob",
  "uploading_to_shelby",
  "registering_palate_media",
  "completed"
];
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
  const detectedKind = useMemo(() => detectMediaKindFromFile(selectedFile), [selectedFile]);
  const videoUploadBlocked = detectedKind === "video" && !VIDEO_ENABLED;
  const allowedCategories = useMemo(() => (videoUploadBlocked ? [] : getAllowedCategoriesForKind(detectedKind)), [detectedKind, videoUploadBlocked]);
  const allowedFormats = useMemo(() => getAllowedFormatsForKind(detectedKind), [detectedKind]);
  const categoryError = videoUploadBlocked ? "Video uploads are temporarily disabled for MVP." : getFileCategoryMessage(selectedFile, category);
  const categoryValid = !selectedFile || (!videoUploadBlocked && isCategoryCompatibleWithKind(category, detectedKind));
  const visibleCategories = app_config.supportedCategories.filter((item) => VIDEO_ENABLED || item !== "video");
  const formatOptions: DropdownOption<MediaFormat>[] = allowedFormats.map((candidate) => ({
    label: candidate,
    value: candidate
  }));
  const fileSizeLabel = fileMeta
    ? fileMeta.size >= 1024 * 1024
      ? `${(fileMeta.size / 1024 / 1024).toFixed(2)} MB`
      : `${Math.max(1, Math.round(fileMeta.size / 1024))} KB`
    : null;
  useEffect(() => {
    if (!selectedFile) return;
    if (videoUploadBlocked) return;
    if (!allowedCategories.includes(category)) {
      setCategory(allowedCategories[0] ?? "image");
    }
  }, [allowedCategories, category, selectedFile, videoUploadBlocked]);

  useEffect(() => {
    if (!allowedFormats.includes(format)) {
      setFormat(allowedFormats[0] ?? "PNG");
    }
  }, [allowedFormats, format]);

  return (
    <div className="page_stack page_upload">
      <PageHeader
        eyebrow="Upload"
        title="Select category before uploading to Shelby."
        copy="Category is stored on chain by Palate. Shelby stores the media file only. GIF is accepted as an image format, not a category."
        actions={<ActionButton href="/my-media" variant="secondary">Back to My Media</ActionButton>}
      />

      <div className="two_column">
        <SectionPanel title="Category-first flow" accent>
          <div className="stack">
            <div className="category_choice_grid">
              {visibleCategories.map((item) => (
                <button
                  className={`category_choice ${category === item ? "active" : ""} ${selectedFile && !allowedCategories.includes(item) ? "disabled" : ""}`}
                  disabled={videoUploadBlocked || (Boolean(selectedFile) && !allowedCategories.includes(item))}
                  key={item}
                  onClick={() => setCategory(item)}
                >
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
                    const matchedFormat = detectFormatFromFile(selectedFile);
                    const nextFormat = matchedFormat ?? format;
                    setSelectedFile(selectedFile);
                    setFileName(selectedName);
                    setFileMeta(selectedFile ? { name: selectedFile.name, size: selectedFile.size, type: selectedFile.type || mime_by_format[nextFormat] } : null);
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
            {selectedFile ? (
              <p className={`feedback_text ${categoryError ? "feedback_error" : "feedback_info"}`}>
                {categoryError ?? `This file can be uploaded as ${allowedCategories.map((item) => category_labels[item]).join(" or ")}.`}
              </p>
            ) : null}
            <ActionButton
              disabled={uploadBusy || !walletReady || !shelbyReady || !selectedFile || !categoryValid}
              onClick={() => {
                if (videoUploadBlocked || !selectedFile) return;
                uploadMedia({
                  category,
                  title,
                  format,
                  mimeType: mime_by_format[format],
                  fileName,
                  file: selectedFile
                });
              }}
            >
              {uploadBusy ? "Registering" : "Start Upload"}
            </ActionButton>
            {uploadStep === "completed" ? <ActionButton href="/my-media" variant="secondary">View My Media</ActionButton> : null}
            {!walletReady ? <p className="feedback_text feedback_info">Connect wallet to register media on chain.</p> : null}
            {!shelbyReady ? <p className="feedback_text feedback_error">Shelby API key is not configured.</p> : null}
            {videoUploadBlocked ? <p className="feedback_text feedback_error">Video uploads are temporarily disabled for MVP.</p> : null}
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
              {uploadStep === "shelby_upload_failed" ? (
                <div className="upload_step active upload_step_error">
                  <span>!</span>
                  {upload_step_labels.shelby_upload_failed}
                </div>
              ) : null}
              {uploadStep === "failed" ? (
                <div className="upload_step active upload_step_error">
                  <span>!</span>
                  {upload_step_labels.failed}
                </div>
              ) : null}
            </div>
            <p className="mock_note">Files upload to Shelby first, then Palate registration is submitted on Aptos Testnet.</p>
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}
