import Link from "next/link";
import Logo from "./Logo";
import { APP_PATH, REPO_URL } from "@/lib/site";

export default function LandingFooter() {
  return (
    <footer>
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5 text-ink">
            <Logo size={22} />
            <span className="font-display text-base font-medium tracking-tight">
              AgentGuard
            </span>
            <span className="mono ml-1 text-[0.65rem] uppercase tracking-[0.18em] text-muted">
              onchain firewall
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href={APP_PATH}
              className="mono border border-hairline bg-surface px-4 py-2 text-xs text-ink transition-colors hover:border-accent hover:text-accent"
            >
              Launch app →
            </Link>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mono text-xs text-muted transition-colors hover:text-ink"
            >
              View source
            </a>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-hairline pt-6 sm:flex-row sm:items-center sm:justify-between">
          <span className="mono inline-flex items-center gap-2 text-xs text-muted">
            <span className="inline-block size-1.5 rounded-full bg-accent" />
            Built for the Somnia Agentathon.
          </span>
          <span className="mono text-xs text-muted">
            © {new Date().getFullYear()} AgentGuard
          </span>
        </div>
      </div>
    </footer>
  );
}
