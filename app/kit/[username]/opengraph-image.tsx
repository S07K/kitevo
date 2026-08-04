import { ImageResponse } from "next/og";
import { getKitBySlug } from "@/lib/get-kit-by-slug";
import {
  LOGO_K_PATH,
  LOGO_LAYER_OFFSETS,
  LOGO_RECENTRE,
  LOGO_ON_INK,
} from "@/lib/logo";

// Runs on the Node.js runtime (default) so Prisma works inside getKitBySlug.
// Do NOT switch to the edge runtime here.

export const alt = "Start collaborating on Kitevo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Overprinted riso "K" mark, rebuilt from lib/logo.ts as Satori-friendly JSX. */
function LogoMark({ size: px }: { size: number }) {
  const fills = [LOGO_ON_INK.back, LOGO_ON_INK.middle, LOGO_ON_INK.top];
  return (
    <svg width={px} height={px} viewBox="0 0 100 100">
      <g transform={`translate(${LOGO_RECENTRE.x},${LOGO_RECENTRE.y})`}>
        {LOGO_LAYER_OFFSETS.map((o, i) => (
          <path key={i} transform={`translate(${o},${o})`} fill={fills[i]} d={LOGO_K_PATH} />
        ))}
      </g>
    </svg>
  );
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function Image({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  let name = "this creator";
  let handle: string | null = null;
  let avatarUrl: string | undefined;

  try {
    const result = await getKitBySlug(username);
    if (result) {
      name = result.creator.name || "this creator";
      handle = result.creator.username || null;
      avatarUrl = result.creator.avatarUrl;
    }
  } catch {
    // Fall back to the generic card below.
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0c0c0e",
          color: "#f5f3f0",
        }}
      >
        {/* Riso-gradient top rule */}
        <div
          style={{
            width: "100%",
            height: "12px",
            display: "flex",
            background:
              "linear-gradient(90deg, #f5c451 0%, #ef8f4b 28%, #c97b4b 50%, #6366f1 82%, #7c6cf0 100%)",
          }}
        />

        <div
          style={{
            flex: "1",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "72px",
          }}
        >
          {/* Eyebrow */}
          <div
            style={{
              display: "flex",
              fontSize: "22px",
              fontWeight: 600,
              letterSpacing: "6px",
              color: "#8a8a94",
            }}
          >
            KITEVO · CREATOR MEDIA KIT
          </div>

          {/* Avatar + headline */}
          <div style={{ display: "flex", alignItems: "center", gap: "44px" }}>
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                width={200}
                height={200}
                style={{
                  width: "200px",
                  height: "200px",
                  borderRadius: "100px",
                  objectFit: "cover",
                  border: "4px solid rgba(245,243,240,0.14)",
                }}
                alt=""
              />
            ) : (
              <div
                style={{
                  width: "200px",
                  height: "200px",
                  borderRadius: "100px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#1c1c22",
                  border: "4px solid rgba(245,243,240,0.14)",
                  fontSize: "72px",
                  fontWeight: 700,
                  color: "#c97b4b",
                }}
              >
                {initials(name)}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", maxWidth: "720px" }}>
              <div
                style={{
                  display: "flex",
                  fontSize: "58px",
                  fontWeight: 800,
                  lineHeight: 1.05,
                  letterSpacing: "-1.5px",
                }}
              >
                Start collaborating with {name}
              </div>
              {handle ? (
                <div
                  style={{
                    display: "flex",
                    marginTop: "18px",
                    fontSize: "28px",
                    color: "#9a9aa4",
                  }}
                >
                  @{handle}
                </div>
              ) : null}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", fontSize: "24px", color: "#8a8a94" }}>
              getkitevo.com
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <LogoMark size={46} />
              <div style={{ display: "flex", fontSize: "34px", fontWeight: 700 }}>Kitevo</div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
