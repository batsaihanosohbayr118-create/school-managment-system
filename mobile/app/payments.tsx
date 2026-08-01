import { FlatList, StyleSheet } from 'react-native';

import { Badge, statusTone } from '@/components/Badge';
import { Card } from '@/components/Card';
import { OfflineBanner } from '@/components/OfflineBanner';
import { Text, View, useThemeColor } from '@/components/Themed';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';
import { useApiData } from '@/lib/use-api';
import { translateValue } from '@shared/i18n-tables';
import type { PaymentEntry } from '@shared/api-types';

export default function PaymentsScreen() {
  const { data, error, loading, refetch, isOffline } = useApiData('payments', api.payments);
  const { t } = useLanguage();
  const dangerColor = useThemeColor({}, 'danger');
  const mutedColor = useThemeColor({}, 'muted');

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={{ color: mutedColor }}>{t.common.loading}</Text>
      </View>
    );
  }

  if (error && !isOffline) {
    return (
      <View style={styles.center}>
        <Text style={{ color: dangerColor }}>{error.message}</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={data?.payments ?? []}
      keyExtractor={(payment) => payment.id}
      onRefresh={refetch}
      refreshing={loading}
      ListHeaderComponent={isOffline ? <OfflineBanner /> : null}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={{ color: mutedColor }}>{t.common.noPaymentsYet}</Text>
        </View>
      }
      renderItem={({ item }) => <PaymentRow payment={item} />}
    />
  );
}

function PaymentRow({ payment }: { payment: PaymentEntry }) {
  const { language, t } = useLanguage();
  const mutedColor = useThemeColor({}, 'muted');

  return (
    <Card style={styles.card}>
      <View style={styles.rowHeader}>
        <Text style={styles.amount}>{payment.amountLabel}</Text>
        <Badge label={translateValue(payment.status, language)} tone={statusTone(payment.status)} />
      </View>
      <Text style={[styles.meta, { color: mutedColor }]}>
        {payment.student} · {t.columns['Due date']} {payment.dueDate}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    padding: 16
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  card: {
    gap: 3
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent'
  },
  amount: {
    fontSize: 20,
    fontWeight: '800'
  },
  meta: {
    fontSize: 14
  }
});
