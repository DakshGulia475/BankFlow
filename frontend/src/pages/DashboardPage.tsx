import { useCallback, useState } from 'react';
import { Message } from '../components/Message';
import { AmountForm, TransferForm } from '../components/TransactionForms';
import { TransactionHistory } from '../components/TransactionHistory';
import { useAuth } from '../hooks/useAuth';
import { useDashboardData } from '../hooks/useDashboardData';
import { ApiError } from '../services/apiClient';
import { accountApi, transactionApi } from '../services/bankflow';
import { formatMoney } from '../utils/format';

export function DashboardPage() {
  const { token, user, logout } = useAuth();
  const { account, transactions, loading, error, missingAccount, refresh } = useDashboardData(
    token,
    logout,
  );

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const runAction = useCallback(
    async (successMessage: string, action: (activeToken: string) => Promise<unknown>) => {
      if (!token) {
        return;
      }
      setActionError(null);
      setActionSuccess(null);
      setBusy(true);
      try {
        await action(token);
        setActionSuccess(successMessage);
        await refresh();
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          logout();
          return;
        }
        setActionError(err instanceof ApiError ? err.displayMessage : 'The request failed.');
      } finally {
        setBusy(false);
      }
    },
    [token, refresh, logout],
  );

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="brand">BankFlow</p>
          <h1>Welcome, {user?.name}</h1>
        </div>
        <button type="button" className="button-secondary" onClick={logout}>
          Log out
        </button>
      </header>

      <main className="dashboard">
        {error ? <Message tone="error">{error}</Message> : null}
        {actionError ? <Message tone="error">{actionError}</Message> : null}
        {actionSuccess ? <Message tone="success">{actionSuccess}</Message> : null}

        {loading ? <p className="page-status">Loading your account…</p> : null}

        {!loading && missingAccount ? (
          <section className="card">
            <h2>You don’t have an account yet</h2>
            <p>Create your BankFlow account to start depositing and transferring money.</p>
            <button
              type="button"
              className="button-primary"
              disabled={busy}
              onClick={() =>
                runAction('Account created.', (activeToken) => accountApi.create(activeToken))
              }
            >
              Create account
            </button>
          </section>
        ) : null}

        {!loading && account ? (
          <>
            <section className="card summary">
              <div>
                <p className="label">Account number</p>
                <p className="mono account-number">{account.accountNumber}</p>
              </div>
              <div>
                <p className="label">Current balance</p>
                <p className="balance">{formatMoney(account.balance)}</p>
              </div>
            </section>

            <div className="actions">
              <AmountForm
                id="deposit"
                title="Deposit"
                submitLabel="Deposit"
                busy={busy}
                onSubmit={(amount) =>
                  runAction(`Deposited ${formatMoney(amount)}.`, (activeToken) =>
                    transactionApi.deposit(activeToken, amount),
                  )
                }
              />
              <AmountForm
                id="withdraw"
                title="Withdraw"
                submitLabel="Withdraw"
                busy={busy}
                onSubmit={(amount) =>
                  runAction(`Withdrew ${formatMoney(amount)}.`, (activeToken) =>
                    transactionApi.withdraw(activeToken, amount),
                  )
                }
              />
              <TransferForm
                busy={busy}
                onSubmit={(toAccountNumber, amount) =>
                  runAction(`Sent ${formatMoney(amount)} to ${toAccountNumber}.`, (activeToken) =>
                    transactionApi.transfer(activeToken, toAccountNumber, amount),
                  )
                }
              />
            </div>

            <TransactionHistory transactions={transactions} />
          </>
        ) : null}
      </main>
    </div>
  );
}
