// The one place the SetuDocs AI logo is rendered. The artwork comes from the
// official logo kit in /public/brand (served statically); nothing else in the app
// draws the logo, so changing the kit changes it everywhere.
//
//   variant  "seal"  full circular seal with the ring text - only legible from 64px up
//            "mark"  the simplified arch mark (no ring text) - header, sidebar, small spots
//            "icon"  rounded gradient app icon
//   tone     "light"     for light surfaces
//            "reversed"  for dark / brand-blue surfaces (sidebar, login hero)
//            "auto"      (default) follows the app's dark mode: light, then reversed
//   size     pixels (square)
//   withText also render the "SetuDocs AI" wordmark text beside the artwork; the image
//            is then decorative (empty alt) so screen readers read the text once.
import clsx from "clsx";

const BASE = "/brand";
const FILES = {
  seal: { light: "setudocs-seal.svg", reversed: "setudocs-seal-reversed.svg" },
  mark: { light: "setudocs-mark.svg", reversed: "setudocs-mark-reversed.svg" },
  // The app icon carries its own gradient tile and works on any surface.
  icon: { light: "setudocs-app-icon.svg", reversed: "setudocs-app-icon.svg" },
};
const MIN_SEAL_PX = 64;

function Artwork({ file, size, alt, className }) {
  return (
    <img
      src={`${BASE}/${file}`}
      alt={alt}
      aria-hidden={alt === "" ? true : undefined}
      width={size}
      height={size}
      draggable={false}
      className={clsx("shrink-0 select-none object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}

export default function Logo({
  variant = "mark",
  tone = "auto",
  size = 40,
  withText = false,
  decorative = false,
  className,
  textClassName,
}) {
  let resolved = variant;
  if (variant === "seal" && size < MIN_SEAL_PX) {
    // The ring text turns to mush below ~64px, so fall back to the simplified mark.
    if (import.meta.env.DEV) {
      console.warn(`<Logo variant="seal"> at ${size}px is too small to read; using the mark instead.`);
    }
    resolved = "mark";
  }

  const files = FILES[resolved] ?? FILES.mark;
  const alt = withText || decorative ? "" : "SetuDocs AI";

  const artwork =
    tone === "auto" ? (
      <>
        <Artwork file={files.light} size={size} alt={alt} className={clsx("dark:hidden", !withText && className)} />
        <Artwork file={files.reversed} size={size} alt={alt} className={clsx("hidden dark:block", !withText && className)} />
      </>
    ) : (
      <Artwork file={tone === "reversed" ? files.reversed : files.light} size={size} alt={alt} className={!withText ? className : undefined} />
    );

  if (!withText) return artwork;

  const textSize = size <= 36 ? "text-base" : size <= 48 ? "text-lg" : "text-xl";
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      {artwork}
      <span
        className={clsx(
          "font-extrabold leading-none tracking-tight",
          textSize,
          tone === "reversed" ? "text-white" : tone === "light" ? "text-ink" : "text-ink dark:text-white",
          textClassName
        )}
      >
        SetuDocs <span className={tone === "reversed" ? "text-white/80" : "text-primary dark:text-primary-100"}>AI</span>
      </span>
    </span>
  );
}
