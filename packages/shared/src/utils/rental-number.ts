/**
 * Format a rental number from a date and sequence index.
 * Example: formatRentalNumber(new Date('2025-04-01'), 23) => 'TA-20250401-0023'
 */
export function formatRentalNumber(date: Date, sequenceIndex: number): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const seq = String(sequenceIndex).padStart(4, '0');
  return `TA-${y}${m}${d}-${seq}`;
}

export function getTodayDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
