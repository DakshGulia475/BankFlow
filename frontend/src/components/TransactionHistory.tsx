import type { Transaction } from '../types/api';
import { formatDateTime, formatMoney } from '../utils/format';

export function TransactionHistory({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return (
      <section className="card">
        <h2>Transaction history</h2>
        <p className="empty">No transactions yet. Make a deposit to get started.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>Transaction history</h2>
      <div className="table-scroll">
        <table>
          <caption className="sr-only">Your transactions, newest first</caption>
          <thead>
            <tr>
              <th scope="col">Reference</th>
              <th scope="col">Type</th>
              <th scope="col">Amount</th>
              <th scope="col">From</th>
              <th scope="col">To</th>
              <th scope="col">Status</th>
              <th scope="col">Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.referenceId}>
                <td className="mono">{transaction.referenceId}</td>
                <td>
                  <span className={`tag tag-${transaction.type.toLowerCase()}`}>{transaction.type}</span>
                </td>
                <td className="numeric">{formatMoney(transaction.amount)}</td>
                <td className="mono">{transaction.fromAccount ?? '—'}</td>
                <td className="mono">{transaction.toAccount ?? '—'}</td>
                <td>{transaction.status}</td>
                <td>{formatDateTime(transaction.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
