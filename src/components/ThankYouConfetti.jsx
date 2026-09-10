const COLORS = ["#ff6b1b", "#ffb648", "#3a9d3a", "#3d7dd8", "#e85f9c"];
const PIECE_COUNT = 26;

// Deterministic per-mount "randomness" (no external dependency) — just enough visual variety
// that the confetti doesn't look mechanical, generated once per render via array index.
const pieces = Array.from({ length: PIECE_COUNT }, (_, i) => {
  const left = (i * 137.5) % 100; // golden-angle spread reads as scattered, not repeating
  const delay = (i % 8) * 0.09;
  const duration = 1.4 + (i % 5) * 0.18;
  const color = COLORS[i % COLORS.length];
  const rotate = (i * 47) % 360;
  return { left, delay, duration, color, rotate, id: i };
});

/**
 * Purely decorative, respects prefers-reduced-motion via CSS (see .thankyou-confetti-piece in
 * checkout.css — the fall animation is only declared inside a
 * `@media (prefers-reduced-motion: no-preference)` block, so viewers who've asked for reduced
 * motion simply see no confetti at all rather than a static clutter of pieces).
 */
export default function ThankYouConfetti() {
  return (
    <div className="thankyou-confetti" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="thankyou-confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
