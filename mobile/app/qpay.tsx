import { useCallback, useEffect, useRef, useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, AppState, Image, Linking, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/Card';
import { PaymentSuccess } from '@/components/PaymentSuccess';
import { Text, View, useThemeColor } from '@/components/Themed';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';
import { usePaymentLock } from '@/lib/payment-lock';
import { ApiError } from '@shared/api-error';
import type { QpayInvoiceResponse } from '@shared/api-types';
import { groupThousands } from '@shared/money';

/** How often the screen re-checks QPay on its own while an invoice is open. */
const POLL_MS = 5000;

export default function QpayScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { refresh: refreshLock } = usePaymentLock();
  const { paymentId, amountLabel } = useLocalSearchParams<{ paymentId: string; amountLabel?: string }>();
  const tint = useThemeColor({}, 'tint');
  const mutedColor = useThemeColor({}, 'muted');
  const dangerColor = useThemeColor({}, 'danger');
  const borderColor = useThemeColor({}, 'border');

  const [invoice, setInvoice] = useState<QpayInvoiceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [paid, setPaid] = useState(false);
  const checkingRef = useRef(false);

  const createInvoice = useCallback(async () => {
    if (!paymentId) return;
    setError(null);
    setInvoice(null);
    try {
      setInvoice(await api.createQpayInvoice(paymentId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.qpay.createFailed);
    }
  }, [paymentId, t.qpay.createFailed]);

  useEffect(() => {
    createInvoice();
  }, [createInvoice]);

  /** `manual` shows the "not paid yet" message; background polls stay quiet. */
  const check = useCallback(
    async (manual: boolean) => {
      if (!invoice || !paymentId || checkingRef.current) return;
      checkingRef.current = true;
      if (manual) {
        setChecking(true);
        setNotice(null);
      }
      try {
        const result = await api.checkQpayPayment({
          paymentId,
          invoiceId: invoice.invoiceId,
          checkToken: invoice.checkToken
        });
        if (result.paid) {
          setPaid(true);
          // Unlock now, so the gate lets the user in however they leave this screen.
          refreshLock();
        } else if (manual) setNotice(t.qpay.notPaidYet);
      } catch {
        if (manual) setNotice(t.qpay.checkFailed);
      } finally {
        checkingRef.current = false;
        if (manual) setChecking(false);
      }
    },
    [invoice, paymentId, t.qpay.notPaidYet, t.qpay.checkFailed, refreshLock]
  );

  // Coming back from the bank app is the moment the payment is most likely done.
  useEffect(() => {
    if (!invoice || paid) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') check(false);
    });
    const timer = setInterval(() => check(false), POLL_MS);
    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, [invoice, paid, check]);

  async function openBank(link: string) {
    try {
      await Linking.openURL(link);
    } catch {
      Alert.alert(t.qpay.bankNotInstalled);
    }
  }

  if (paid) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <PaymentSuccess
          amountLabel={amountLabel || (invoice ? `${groupThousands(String(invoice.amount))}₮` : '')}
          onDone={() => router.back()}
        />
      </>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: t.qpay.title }} />
        <Text style={[styles.message, { color: dangerColor }]}>{error}</Text>
        <Pressable style={[styles.button, styles.wide, { backgroundColor: tint }]} onPress={createInvoice}>
          <Text style={styles.buttonText}>{t.qpay.retry}</Text>
        </Pressable>
      </View>
    );
  }

  if (!invoice) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: t.qpay.title }} />
        <ActivityIndicator color={tint} />
        <Text style={[styles.message, { color: mutedColor }]}>{t.qpay.creating}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: t.qpay.title }} />
      <Text style={styles.amount}>{amountLabel || `${groupThousands(String(invoice.amount))}₮`}</Text>

      {invoice.qrImage ? (
        <View style={styles.qrFrame}>
          <Image source={{ uri: `data:image/png;base64,${invoice.qrImage}` }} style={styles.qr} />
        </View>
      ) : null}
      <Text style={[styles.message, { color: mutedColor }]}>{t.qpay.scanQr}</Text>

      <Pressable
        style={[styles.button, { backgroundColor: tint }, checking && styles.disabled]}
        onPress={() => check(true)}
        disabled={checking}
      >
        {checking ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t.qpay.checkPayment}</Text>}
      </Pressable>
      {notice ? <Text style={[styles.message, { color: dangerColor }]}>{notice}</Text> : null}

      {invoice.banks.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>{t.qpay.banks}</Text>
          <Card style={styles.bankList}>
            {invoice.banks.map((bank, index) => (
              <Pressable
                key={`${bank.name}-${index}`}
                style={({ pressed }) => [
                  styles.bankRow,
                  index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: borderColor },
                  pressed && styles.pressed
                ]}
                onPress={() => openBank(bank.link)}
              >
                {bank.logo ? <Image source={{ uri: bank.logo }} style={styles.bankLogo} /> : null}
                <Text style={styles.bankName} numberOfLines={1}>
                  {bank.description || bank.name}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={mutedColor} />
              </Pressable>
            ))}
          </Card>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    padding: 20,
    paddingBottom: 48,
    gap: 12
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16
  },
  amount: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center'
  },
  qrFrame: {
    alignSelf: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#fff'
  },
  qr: {
    width: 220,
    height: 220
  },
  message: {
    fontSize: 14,
    textAlign: 'center'
  },
  button: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12
  },
  wide: {
    alignSelf: 'stretch'
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700'
  },
  disabled: {
    opacity: 0.6
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12
  },
  bankList: {
    paddingVertical: 0,
    paddingHorizontal: 0
  },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: 'transparent'
  },
  bankLogo: {
    width: 32,
    height: 32,
    borderRadius: 8
  },
  bankName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600'
  },
  pressed: {
    opacity: 0.6
  }
});
