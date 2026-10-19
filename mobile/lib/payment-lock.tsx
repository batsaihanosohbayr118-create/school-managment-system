import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import type { PaymentEntry } from '@shared/api-types';
import { api } from './api';
import { useAuth } from './auth-context';

/** Roles held on the payment screen while they have an outstanding payment. */
export const LOCKED_ROLES: readonly string[] = ['student'];

/** Unpaid or Partial with a real amount — what keeps the app locked. */
export function isOutstandingPayment(payment: PaymentEntry): boolean {
  const status = payment.status.trim().toLowerCase();
  return (status === 'unpaid' || status === 'partial') && (payment.amount ?? 0) > 0;
}

/**
 * 'unknown' until the first check finishes — the gate waits on it so a locked
 * user never sees the tabs flash before the payment screen.
 */
type LockState = 'unknown' | 'locked' | 'unlocked';

type PaymentLockValue = {
  state: LockState;
  refresh: () => Promise<void>;
};

const PaymentLockContext = createContext<PaymentLockValue | null>(null);

/**
 * A user in LOCKED_ROLES with an outstanding payment is held on the payment
 * screen until it is paid; every other role is never locked.
 *
 * A failed check unlocks rather than locks, so someone who opens the app
 * offline still gets in; the next successful check (on foreground or after
 * paying) re-applies the lock. This is a client-side gate only — the API
 * itself does not refuse a user with unpaid fees.
 */
export function PaymentLockProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const isLockable = session ? LOCKED_ROLES.includes(session.role) : false;
  const [state, setState] = useState<LockState>('unknown');

  const refresh = useCallback(async () => {
    if (!isLockable) {
      setState('unlocked');
      return;
    }
    try {
      const { payments } = await api.payments();
      setState(payments.some(isOutstandingPayment) ? 'locked' : 'unlocked');
    } catch {
      setState((current) => (current === 'locked' ? 'locked' : 'unlocked'));
    }
  }, [isLockable]);

  useEffect(() => {
    setState(isLockable ? 'unknown' : 'unlocked');
    refresh();
  }, [isLockable, session?.email, refresh]);

  // A payment marked Paid by the school (or by QPay's callback) while the app
  // was in the background should unlock on return, and a new bill should lock.
  useEffect(() => {
    if (!isLockable) return;
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') refresh();
    });
    return () => subscription.remove();
  }, [isLockable, refresh]);

  return <PaymentLockContext.Provider value={{ state, refresh }}>{children}</PaymentLockContext.Provider>;
}

export function usePaymentLock(): PaymentLockValue {
  const context = useContext(PaymentLockContext);
  if (!context) throw new Error('usePaymentLock must be used within a PaymentLockProvider.');
  return context;
}
