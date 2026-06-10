type LogoProps = {
  /** Rendered height in px; width keeps the 66:88 mark ratio. */
  size?: number;
  accent?: string;
  className?: string;
};

/**
 * AgentGuard mark: shield perimeter + abstract agent "A" (node + legs).
 * Strokes inherit currentColor; the node uses the brand accent.
 * data-logo-* hooks exist for the header draw-in animation.
 */
export default function Logo({
  size = 24,
  accent = "#7C5CFF",
  className,
}: LogoProps) {
  return (
    <svg
      viewBox="0 0 66 88"
      width={(66 / 88) * size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        data-logo-shield
        d="M33 4 L62 14 L62 48 Q62 72 33 84 Q4 72 4 48 L4 14 Z"
        stroke="currentColor"
        strokeWidth={6}
        strokeLinejoin="round"
      />
      <circle data-logo-node cx="33" cy="32" r="8" fill={accent} />
      <path
        data-logo-legs
        d="M33 41 L20 64 M33 41 L46 64"
        stroke="currentColor"
        strokeWidth={6}
        strokeLinecap="round"
      />
    </svg>
  );
}
