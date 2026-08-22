export function parsePointAmount(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!/^\+?(?:0|[1-9]\d*)(?:\.\d)?$/.test(normalized)) return null;

  const amount = Number(normalized.replace('+', ''));
  return amount > 0 && amount <= 15 ? amount : null;
}