import { ImageResponse } from "next/og";

export const alt = "AgentGuard — onchain firewall for AI agents";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#09090b",
          color: "#fafafa",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              fontSize: 30,
              color: "#34d399",
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            AGENTGUARD
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.05 }}>
            Onchain firewall for AI agents
          </div>
          <div style={{ fontSize: 30, color: "#a1a1aa", maxWidth: 900, lineHeight: 1.3 }}>
            Every action an autonomous agent proposes is reviewed by Somnia
            Agents before the vault will move funds.
          </div>
        </div>

        <div style={{ display: "flex", gap: 14, fontSize: 26 }}>
          <span style={{ color: "#34d399" }}>APPROVE</span>
          <span style={{ color: "#52525b" }}>·</span>
          <span style={{ color: "#fbbf24" }}>REVIEW</span>
          <span style={{ color: "#52525b" }}>·</span>
          <span style={{ color: "#f87171" }}>BLOCK</span>
          <span style={{ color: "#52525b", marginLeft: "auto" }}>Somnia Testnet</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
