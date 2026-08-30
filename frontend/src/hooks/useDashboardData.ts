import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/apiClient';
import { accountApi, transactionApi } from '../services/bankflow';
import type { Account, Transaction } from '../types/api';

type DashboardState = {
  account: Account | null;
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  /** True when the user is authenticated but has not created an account yet. */
  missingAccount: boolean;
};

export function useDashboardData(token: string | null, onAuthFailure: () => void) {
  const [state, setState] = useState<DashboardState>({
    account: null,
    transactions: [],
    loading: true,
    error: null,
    missingAccount: false,
  });

  const refresh = useCallback(async () => {
    if (!token) {
      return;
    }
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const { account } = await accountApi.me(token);
      const { transactions } = await transactionApi.history(token);
      setState({ account, transactions, loading: false, error: null, missingAccount: false });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onAuthFailure();
        return;
      }
      if (err instanceof ApiError && err.status === 404) {
        setState({ account: null, transactions: [], loading: false, error: null, missingAccount: true });
        return;
      }
      setState({
        account: null,
        transactions: [],
        loading: false,
        error: err instanceof ApiError ? err.displayMessage : 'Could not load your account.',
        missingAccount: false,
      });
    }
  }, [token, onAuthFailure]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...state, refresh };
}
