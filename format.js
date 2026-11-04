// Small shared formatting helpers for the numbers a run produces.

/// Seconds to a clock reading: 83.4 -> "1:23".
export function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}
