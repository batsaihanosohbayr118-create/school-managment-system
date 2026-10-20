import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import type { PaymentEntry } from '@shared/api-types';
import { api } from './api';
import { useAuth } from './auth-context';

/** Roles held on the payment screen while they have an outstanding payment. */
export const LOCKED_ROLES: readonly string[] = ['student'];

/**
 * An app usage fee that is Unpaid or Partial with a real amount — what keeps
 * the app locked. Tuition never locks; it is only listed on the payments tab.
 */
export function isOutstandingAppFee(payment: PaymentEntry): boolean {
  const status = payment.status.trim().toLowerCase();
  return payment.kind === 'app' && (status === 'unpaid' || status === 'partial') && (payment.amount ?? 0) > 0;
}

/**
 * 'unknown' until the first check finishes — the gate waits on it so a locked
 * user never sees the tabs flash before the payment screen.
 */
type LockState = 'unknown' | 'locked' | 'unlocked';

type PaymentLockValue = {
  state: LockState;
  refresh: () => Promise<void>;
  /** TEMPORARY: lets a locked user past the gate until the app restarts or they sign in again. */
  skip: () => void;
};

const PaymentLockContext = createContext<PaymentLockValue | null>(null);

/**
 * A user in LOCKED_ROLES with an outstanding app fee is held on the payment
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
  const skipped = useRef(false);

  const refresh = useCallback(async () => {
    if (!isLockable || skipped.current) {
      setState('unlocked');
      return;
    }
    try {
      const { payments } = await api.payments();
      setState(payments.some(isOutstandingAppFee) ? 'locked' : 'unlocked');
    } catch {
      setState((current) => (current === 'locked' ? 'locked' : 'unlocked'));
    }
  }, [isLockable]);

  const skip = useCallback(() => {
    skipped.current = true;
    setState('unlocked');
  }, []);

  useEffect(() => {
    skipped.current = false;
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

  return <PaymentLockContext.Provider value={{ state, refresh, skip }}>{children}</PaymentLockContext.Provider>;
}

export function usePaymentLock(): PaymentLockValue {
  const context = useContext(PaymentLockContext);
  if (!context) throw new Error('usePaymentLock must be used within a PaymentLockProvider.');
  return context;
}
