import { Globe } from "lucide-react";
import {
  SiDropbox, SiDropboxHex, SiGoogledrive, SiGoogledriveHex, SiInstagram, SiInstagramHex, SiNotion, SiPaypal, SiPaypalHex,
  SiRazorpay, SiRazorpayHex, SiStripe, SiStripeHex, SiYoutube, SiYoutubeHex,
} from "@icons-pack/react-simple-icons";
import type { IntegrationLogo as LogoId } from "@/lib/integrations";

// Simple Icons only (never hand-drawn brand art). darkOnDark: marks too dark to read on the
// navy dark-mode surface follow the text colour there.
const MARKS = {
  instagram: { Icon: SiInstagram, color: SiInstagramHex, darkOnDark: false },
  youtube: { Icon: SiYoutube, color: SiYoutubeHex, darkOnDark: false },
  razorpay: { Icon: SiRazorpay, color: SiRazorpayHex, darkOnDark: true },
  stripe: { Icon: SiStripe, color: SiStripeHex, darkOnDark: false },
  paypal: { Icon: SiPaypal, color: SiPaypalHex, darkOnDark: true },
  googledrive: { Icon: SiGoogledrive, color: SiGoogledriveHex, darkOnDark: false },
  dropbox: { Icon: SiDropbox, color: SiDropboxHex, darkOnDark: false },
  notion: { Icon: SiNotion, color: "currentColor", darkOnDark: false },
} as const;

/** A brand mark on a neutral rounded tile. */
export function IntegrationLogo({ id, size = 44 }: { id: LogoId; size?: number }) {
  const icon = Math.round(size * 0.5);
  const tile = "inline-flex shrink-0 items-center justify-center rounded-[28%] border border-border bg-background";
  if (id === "domain") {
    return (
      <span className={`${tile} text-primary`} style={{ width: size, height: size }}>
        <Globe size={icon} aria-hidden />
      </span>
    );
  }
  const { Icon, color, darkOnDark } = MARKS[id];
  return (
    <span className={`${tile} text-foreground`} style={{ width: size, height: size }}>
      <span className={`inline-flex ${darkOnDark ? "dark:!text-foreground" : ""}`} style={{ color }}>
        <Icon size={icon} color="currentColor" aria-hidden />
      </span>
    </span>
  );
}
