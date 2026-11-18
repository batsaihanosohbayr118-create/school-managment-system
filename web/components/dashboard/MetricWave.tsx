/**
 * The wave in the corner of a stat tile. Decoration only — the same shape on
 * every tile, not a trend: there is no history behind these numbers yet.
 */
export function MetricWave() {
  return (
    <svg aria-hidden="true" className="metric-card-wave" viewBox="0 0 100 44">
      <path className="metric-card-wave-fill" d="M2 34 C 14 30, 20 18, 32 18 S 48 28, 56 26 S 76 12, 98 4 L 98 44 L 2 44 Z" />
      <path className="metric-card-wave-line" d="M2 34 C 14 30, 20 18, 32 18 S 48 28, 56 26 S 76 12, 98 4" pathLength={1} />
      <circle cx="32" cy="18" r="2.6" />
      <circle cx="56" cy="26" r="2.6" />
    </svg>
  );
}
