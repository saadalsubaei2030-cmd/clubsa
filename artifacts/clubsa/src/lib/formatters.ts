export function formatBalance(amount: number): string {
  if (amount >= 1000) {
    const thousands = amount / 1000;
    return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}ك`;
  }
  return amount.toString();
}