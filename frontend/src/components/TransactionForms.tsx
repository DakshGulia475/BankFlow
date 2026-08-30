import { useState, type FormEvent } from 'react';
import { Field } from './Field';
import { validateAmount } from '../utils/format';

type AmountFormProps = {
  id: string;
  title: string;
  submitLabel: string;
  busy: boolean;
  onSubmit: (amount: number) => Promise<void>;
};

export function AmountForm({ id, title, submitLabel, busy, onSubmit }: AmountFormProps) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const message = validateAmount(amount);
    setError(message);
    if (message) {
      return;
    }
    await onSubmit(Number(amount));
    setAmount('');
  }

  return (
    <form className="card action-card" onSubmit={handleSubmit} noValidate>
      <h2>{title}</h2>
      <Field
        id={`${id}-amount`}
        label="Amount"
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        value={amount}
        error={error}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button type="submit" className="button-primary" disabled={busy}>
        {submitLabel}
      </button>
    </form>
  );
}

type TransferFormProps = {
  busy: boolean;
  onSubmit: (toAccountNumber: string, amount: number) => Promise<void>;
};

export function TransferForm({ busy, onSubmit }: TransferFormProps) {
  const [toAccountNumber, setToAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [accountError, setAccountError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const accountMessage = /^\d{12}$/.test(toAccountNumber.trim())
      ? null
      : 'Enter the 12-digit destination account number.';
    const amountMessage = validateAmount(amount);
    setAccountError(accountMessage);
    setAmountError(amountMessage);
    if (accountMessage || amountMessage) {
      return;
    }
    await onSubmit(toAccountNumber.trim(), Number(amount));
    setToAccountNumber('');
    setAmount('');
  }

  return (
    <form className="card action-card" onSubmit={handleSubmit} noValidate>
      <h2>Transfer</h2>
      <Field
        id="transfer-account"
        label="Destination account number"
        inputMode="numeric"
        value={toAccountNumber}
        error={accountError}
        onChange={(e) => setToAccountNumber(e.target.value)}
      />
      <Field
        id="transfer-amount"
        label="Amount"
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        value={amount}
        error={amountError}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button type="submit" className="button-primary" disabled={busy}>
        Send transfer
      </button>
    </form>
  );
}
