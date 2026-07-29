import { FlatList, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { api } from '@/lib/api';
import { useApiData } from '@/lib/use-api';
import type { PaymentEntry } from '@shared/api-types';

export default function PaymentsScreen() {
  const { data, error, loading, refetch } = useApiData(api.payments);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error.message}</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={data?.payments ?? []}
      keyExtractor={(payment) => payment.id}
      onRefresh={refetch}
      refreshing={loading}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text>No payments yet.</Text>
        </View>
      }
      renderItem={({ item }) => <PaymentRow payment={item} />}
    />
  );
}

function PaymentRow({ payment }: { payment: PaymentEntry }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={styles.amount}>{payment.amountLabel}</Text>
        <Text style={[styles.status, payment.status === 'Paid' ? styles.statusPaid : styles.statusUnpaid]}>
          {payment.status}
        </Text>
      </View>
      <Text style={styles.meta}>
        {payment.student} · Due {payment.dueDate}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  error: {
    color: '#dc2626'
  },
  row: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#8884'
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  amount: {
    fontSize: 18,
    fontWeight: '700'
  },
  status: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden'
  },
  statusPaid: {
    color: '#16a34a',
    backgroundColor: '#16a34a22'
  },
  statusUnpaid: {
    color: '#dc2626',
    backgroundColor: '#dc262622'
  },
  meta: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 2
  }
});
