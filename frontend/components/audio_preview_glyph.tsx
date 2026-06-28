type AudioPreviewGlyphProps = {
  shellClassName?: string;
  iconClassName?: string;
};

export function AudioPreviewGlyph({
  shellClassName = "audio_preview_glyph_shell",
  iconClassName = "audio_preview_glyph_icon"
}: AudioPreviewGlyphProps) {
  return (
    <div className={shellClassName}>
      <svg className={iconClassName} viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <path
          d="M18 34V31C18 23.268 24.268 17 32 17C39.732 17 46 23.268 46 31V34"
          stroke="currentColor"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="15" y="31" width="9" height="18" rx="4.5" stroke="currentColor" strokeWidth="4.5" />
        <rect x="40" y="31" width="9" height="18" rx="4.5" stroke="currentColor" strokeWidth="4.5" />
        <path
          d="M24 46C24 49.314 26.686 52 30 52H34"
          stroke="currentColor"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
