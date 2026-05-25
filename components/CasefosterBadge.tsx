type CasefosterBadgeProps = {
  slug: string;
};

export default function CasefosterBadge({ slug }: CasefosterBadgeProps) {
  return (
    <a
      href={`https://casefoster.ai/${slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 rounded-full border px-2.5 py-1 backdrop-blur-md transition-opacity"
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        borderColor: "rgba(255, 255, 255, 0.08)",
        marginBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: "#FF4D4D" }}
        aria-hidden
      />
      <span
        className="font-medium tracking-tight transition-opacity hover:opacity-100"
        style={{
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: "11px",
          color: "rgba(255, 255, 255, 0.7)",
        }}
      >
        casefoster.ai
      </span>
      <svg
        width="8"
        height="8"
        viewBox="0 0 8 8"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ color: "rgba(255, 255, 255, 0.7)" }}
        aria-hidden
      >
        <path
          d="M2 6L6 2M6 2H3M6 2V5"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  );
}
