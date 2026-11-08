import { BRAND_ICONS, DARK_ON_DARK, FAVICON_ICONS, GLYPH_IN_BRAND_COLOUR, MONO_IN_TEXT_COLOUR, type BrandIconId } from "@/lib/brand-icons";

/**
 * An official brand mark (from `thesvg`, see lib/brand-icons.ts), sized as a square box.
 * The SVG markup comes from the pinned package, never from users (lib/brand-icons.test.ts
 * checks it carries no scripts or handlers), so injecting it is safe.
 *
 * `mono` renders the single-colour variant in the current text colour (e.g. on a coloured tile).
 */
export function BrandIcon({
  brand,
  size = 16,
  mono = false,
  lightOnly = false,
  className = "",
  label,
}: {
  brand: BrandIconId;
  size?: number;
  mono?: boolean;
  /** Always full colour, even in dark mode (the mark sits on a fixed light tile). */
  lightOnly?: boolean;
  className?: string;
  label?: string;
}) {
  const icon = BRAND_ICONS[brand];
  const monoSvg = icon.variants.mono ?? (MONO_IN_TEXT_COLOUR.has(brand) ? icon.variants.light : undefined) ?? icon.svg;
  const a11y = label ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true as const };
  const style = { width: size, height: size };
  // [&>svg] sizes the injected SVG to the box; mono variants have no fill, so they take currentColor.
  const fit = "[&>svg]:h-full [&>svg]:w-full";
  const tint = "[&_svg]:fill-current";

  const favicon = FAVICON_ICONS[brand];
  if (favicon) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- tiny local brand icon
      <img src={favicon} alt={label ?? ""} aria-hidden={label ? undefined : true} width={size} height={size} className={`inline-block shrink-0 rounded-[22%] ${className}`} style={style} />
    );
  }
  if (mono || MONO_IN_TEXT_COLOUR.has(brand)) {
    return <span {...a11y} className={`inline-flex shrink-0 ${fit} ${tint} ${className}`} style={style} dangerouslySetInnerHTML={{ __html: monoSvg }} />;
  }
  if (GLYPH_IN_BRAND_COLOUR.has(brand)) {
    return <span {...a11y} className={`inline-flex shrink-0 ${fit} ${tint} ${className}`} style={{ ...style, color: `#${icon.hex}` }} dangerouslySetInnerHTML={{ __html: monoSvg }} />;
  }
  if (DARK_ON_DARK.has(brand) && !lightOnly) {
    // Two copies, one per theme. `block`/`hidden` only (no inline-flex here) so `hidden` really hides.
    return (
      <span {...a11y} className={`inline-flex shrink-0 ${className}`} style={style}>
        <span className={`block h-full w-full dark:hidden ${fit}`} dangerouslySetInnerHTML={{ __html: icon.svg }} />
        <span className={`hidden h-full w-full text-foreground dark:block ${fit} ${tint}`} dangerouslySetInnerHTML={{ __html: monoSvg }} />
      </span>
    );
  }
  return <span {...a11y} className={`inline-flex shrink-0 ${fit} ${className}`} style={style} dangerouslySetInnerHTML={{ __html: icon.svg }} />;
}
