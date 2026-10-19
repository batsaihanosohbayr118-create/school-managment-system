import { PaymentsView } from '@/components/PaymentsView';

/**
 * Where the auth gate holds a LOCKED_ROLES user with an outstanding payment
 * (lib/payment-lock.tsx). Paying through QPay re-checks the lock and the gate
 * moves them on to the tabs.
 */
export default function PaymentRequiredScreen() {
  return <PaymentsView locked />;
}
