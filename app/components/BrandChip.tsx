import {
  SiDropbox, SiDropboxHex, SiGoogledrive, SiGoogledriveHex, SiNotion, SiPaypal, SiPaypalHex,
  SiRazorpay, SiRazorpayHex, SiStripe, SiStripeHex,
} from "@icons-pack/react-simple-icons";

/**
 * A company named inline in UI copy, with its logo (Simple Icons only — never hand-drawn
 * brand art, per CLAUDE.md). Notion's mark is black, so it follows the text colour to stay
 * visible in dark mode.
 */
// darkOnDark: brand colours too dark to read on the navy dark-mode surface; those marks
// switch to the text colour in dark mode.
const BRANDS = {
  razorpay: { name: "Razorpay", Icon: SiRazorpay, color: SiRazorpayHex, darkOnDark: true },
  stripe: { name: "Stripe", Icon: SiStripe, color: SiStripeHex, darkOnDark: false },
  paypal: { name: "PayPal", Icon: SiPaypal, color: SiPaypalHex, darkOnDark: true },
  googledrive: { name: "Google Drive", Icon: SiGoogledrive, color: SiGoogledriveHex, darkOnDark: false },
  dropbox: { name: "Dropbox", Icon: SiDropbox, color: SiDropboxHex, darkOnDark: false },
  notion: { name: "Notion", Icon: SiNotion, color: "currentColor", darkOnDark: false },
} as const;

export type BrandId = keyof typeof BRANDS;

export function BrandChip({ brand, size = 13 }: { brand: BrandId; size?: number }) {
  const { name, Icon, color, darkOnDark } = BRANDS[brand];
  return (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap font-medium text-foreground">
      {/* The icon fills with currentColor; the wrapper sets the brand colour (text colour in dark mode where needed). */}
      <span className={`relative top-[2px] inline-flex shrink-0 ${darkOnDark ? "dark:!text-foreground" : ""}`} style={{ color }}>
        <Icon size={size} color="currentColor" aria-hidden />
      </span>
      {name}
    </span>
  );
}
