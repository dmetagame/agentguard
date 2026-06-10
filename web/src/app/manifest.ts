import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AgentGuard — onchain firewall for AI agents",
    short_name: "AgentGuard",
    description:
      "A programmable safety layer for autonomous AI wallets, secured by consensus-verified Somnia Agents.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
