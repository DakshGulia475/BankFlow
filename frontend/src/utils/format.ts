const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const dateTime = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });

export function formatMoney(value: number): string {
  return currency.format(value);
}

export function formatDateTime(value: string): string {
  return dateTime.format(new Date(value));
}

/** Returns an error message for an amount field, or null when it is valid. */
export function validateAmount(raw: string): string | null {
  if (!raw.trim()) {
    return 'Enter an amount.';
  }
  const amount = Number(raw);
  if (!Number.isFinite(amount)) {
    return 'Amount must be a number.';
  }
  if (amount <= 0) {
    return 'Amount must be greater than zero.';
  }
  if (Math.round(amount * 100) !== amount * 100) {
    return 'Amount cannot have more than two decimal places.';
  }
  return null;
}
