export default function BananaMark({ compact = false }) {
  return (
    <span className={`brand-mark ${compact ? "brand-mark-compact" : ""}`}>
      <svg
        className="brand-banana"
        viewBox="0 0 64 64"
        width="36"
        height="36"
        aria-hidden="true"
      >
        <ellipse cx="32" cy="34" rx="22" ry="18" fill="#F5C400" />
        <path
          d="M18 28c8-10 28-12 32 2 2 8-4 18-16 20-14 2-22-8-16-22z"
          fill="#FFE566"
        />
        <path d="M46 22c4-6 8-8 10-7-2 6-6 10-12 12 0-2 0-4 2-5z" fill="#5C3B12" />
        <circle cx="24" cy="34" r="2" fill="#4A1D6A" opacity="0.25" />
      </svg>
      <span className="brand-text">
        Banana <em>Arcade</em>
      </span>
    </span>
  );
}
