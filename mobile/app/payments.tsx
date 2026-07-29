import { FlatList, StyleSheet } from 'react-native';

import { Badge, statusTone } from '@/components/Badge';
import { Card } from '@/components/Card';
import { Text, View, useThemeColor } from '@/components/Themed';
import { api } from '@/lib/api';
import { useApiData } from '@/lib/use-api';
import type { PaymentEntry } from '@shared/api-types';

export default function PaymentsScreen() {
  const { data, error, loading, refetch } = useApiData(api.payments);
  const dangerColor = useThemeColor({}, 'danger');
  const mutedColor = useThemeColor({}, 'muted');

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={{ color: mutedColor }}>Loading…</Text>
      </View>
    );
  }

  if (error) {
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
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={{ color: mutedColor }}>No payments yet.</Text>
        </View>
      }
      renderItem={({ item }) => <PaymentRow payment={item} />}
    />
  );
}

function PaymentRow({ payment }: { payment: PaymentEntry }) {
  const mutedColor = useThemeColor({}, 'muted');

  return (
    <Card style={styles.card}>
      <View style={styles.rowHeader}>
        <Text style={styles.amount}>{payment.amountLabel}</Text>
        <Badge label={payment.status} tone={statusTone(payment.status)} />
      </View>
      <Text style={[styles.meta, { color: mutedColor }]}>
        {payment.student} · Due {payment.dueDate}
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
    alignItems: 'center'
  },
  amount: {
    fontSize: 20,
    fontWeight: '800'
  },
  meta: {
    fontSize: 14
  }
});
