export function formatMoney(amount: number): string {
  if (!Number.isFinite(amount)) return 'N$0';
  const rounded = Math.round(amount * 100) / 100;
  if (Math.abs(rounded - Math.round(rounded)) < 1e-9) {
    return `N$${Math.round(rounded)}`;
  }
  return `N$${rounded.toFixed(2)}`;
}

export function vatOn(net: number): number {
  return Math.round(net * 0.15 * 100) / 100;
}
