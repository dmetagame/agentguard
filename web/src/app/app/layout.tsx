import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "App · AgentGuard",
  alternates: { canonical: "/app" },
};

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
