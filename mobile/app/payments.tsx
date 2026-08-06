import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Badge, statusTone } from '@/components/Badge';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
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
  const tint = useThemeColor({}, 'tint');

  if (loading) {
    return <LoadingState />;
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
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={tint} colors={[tint]} />}
      ListHeaderComponent={isOffline ? <OfflineBanner /> : null}
      ListEmptyComponent={<EmptyState icon="card-outline" label={t.common.noPaymentsYet} />}
      renderItem={({ item }) => <PaymentRow payment={item} />}
    />
  );
}

function PaymentRow({ payment }: { payment: PaymentEntry }) {
  const { language, t } = useLanguage();
  const mutedColor = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  const tintMuted = useThemeColor({}, 'tintMuted');

  return (
    <Card style={styles.card}>
      <View style={styles.rowHeader}>
        <View style={styles.amountRow}>
          <View style={[styles.iconBadge, { backgroundColor: tintMuted }]}>
            <Ionicons name="card" size={15} color={tint} />
          </View>
          <Text style={styles.amount}>{payment.amountLabel}</Text>
        </View>
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
    gap: 6
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent'
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'transparent'
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center'
  },
  amount: {
    fontSize: 20,
    fontWeight: '800'
  },
  meta: {
    fontSize: 14
  }
});
