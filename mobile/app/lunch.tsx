import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/Card';
import { GradientHeaderButton, gradientHeaderItem } from '@/components/GradientHeaderButton';
import { Text, View, useThemeColor } from '@/components/Themed';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';
import { ApiError } from '@shared/api-error';
import { LUNCH_FEE_PER_DAY, MAX_LUNCH_DAYS } from '@shared/lunch';

/** Matches the card image's blue; used by the back button and the picked days. */
const LUNCH_GRADIENT: [string, string] = ['#3b82f6', '#1d4ed8'];
const SELECTED_DAY = '#2563eb';

const LUNCH_CARD_IMAGE = require('@/assets/images/lunch-card.png');

function formatMoney(amount: number) {
  return `${amount.toLocaleString('en-US')}₮`;
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isWeekend(year: number, month: number, day: number) {
  const weekday = new Date(year, month, day).getDay();
  return weekday === 0 || weekday === 6;
}

/** The month as rows of 7 cells, Monday first; null pads the first and last week. */
function monthGrid(year: number, month: number): (number | null)[][] {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const leading = (new Date(year, month, 1).getDay() + 6) % 7;
  const cells: (number | null)[] = [...Array<null>(leading).fill(null), ...Array.from({ length: lastDay }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}

export default function LunchScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const [paying, setPaying] = useState(false);
  const mutedColor = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  const moneyColor = useThemeColor({}, 'success');
  const borderColor = useThemeColor({}, 'border');
  const today = new Date();
  const [visible, setVisible] = useState({ year: today.getFullYear(), month: today.getMonth() });
  // Keyed by YYYY-MM-DD, so days picked in other months stay in the total.
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { year, month } = visible;
  const weeks = monthGrid(year, month);
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());
  const monthSchoolDays = weeks.flat().filter((day): day is number => day !== null && !isWeekend(year, month, day));
  const allMonthSelected = monthSchoolDays.length > 0 && monthSchoolDays.every((day) => selected.has(dateKey(year, month, day)));

  const shiftMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    setVisible({ year: next.getFullYear(), month: next.getMonth() });
  };

  const toggleDay = (key: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleMonth = () => {
    setSelected((current) => {
      const next = new Set(current);
      for (const day of monthSchoolDays) {
        const key = dateKey(year, month, day);
        if (allMonthSelected) next.delete(key);
        else next.add(key);
      }
      return next;
    });
  };

  const tooManyDays = selected.size > MAX_LUNCH_DAYS;

  const backButton = (
    <GradientHeaderButton icon="chevron-back" colors={LUNCH_GRADIENT} onPress={() => router.back()} accessibilityLabel={t.qpay.back} />
  );

  /** The server issues the record and its amount; QPay then pays it like any other payment. */
  const pay = async () => {
    if (selected.size === 0 || tooManyDays || paying) return;
    setPaying(true);
    try {
      const { paymentId, amountLabel } = await api.createLunchPayment([...selected]);
      router.push({ pathname: '/qpay', params: { paymentId, amountLabel } });
    } catch (error) {
      Alert.alert(error instanceof ApiError ? error.message : t.qpay.createFailed);
    } finally {
      setPaying(false);
    }
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{ headerBackVisible: false, headerLeft: () => backButton, unstable_headerLeftItems: gradientHeaderItem(backButton) }}
      />
      <View style={styles.heroShadow}>
        <Image source={LUNCH_CARD_IMAGE} style={styles.hero} resizeMode="cover" accessibilityIgnoresInvertColors />
      </View>

      <View style={styles.price}>
        <View style={styles.priceIcon}>
          <Ionicons name="restaurant-outline" size={18} color="#fff" />
        </View>
        <View style={styles.priceCopy}>
          <Text style={styles.priceLabel}>{t.lunch.title}</Text>
          <Text style={[styles.priceUnit, { color: mutedColor }]}>{t.lunch.unit}</Text>
        </View>
        <Text style={[styles.priceAmount, { color: moneyColor }]}>{formatMoney(LUNCH_FEE_PER_DAY)}</Text>
      </View>

      <Card style={styles.calendar}>
        <View style={styles.monthHeader}>
          <Pressable onPress={() => shiftMonth(-1)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t.lunch.previousMonth}>
            <Ionicons name="chevron-back" size={22} color={tint} />
          </Pressable>
          <Text style={styles.monthTitle}>{t.lunch.monthTitle(year, month)}</Text>
          <Pressable onPress={() => shiftMonth(1)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t.lunch.nextMonth}>
            <Ionicons name="chevron-forward" size={22} color={tint} />
          </Pressable>
        </View>

        <View style={styles.week}>
          {t.lunch.weekdays.map((label, index) => (
            <Text key={label} style={[styles.weekday, { color: index >= 5 ? `${mutedColor}80` : mutedColor }]}>{label}</Text>
          ))}
        </View>

        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.week}>
            {week.map((day, dayIndex) => {
              if (day === null) return <View key={dayIndex} style={styles.cell} />;
              const key = dateKey(year, month, day);
              const weekend = isWeekend(year, month, day);
              const isSelected = selected.has(key);
              const isToday = key === todayKey;
              return (
                <View key={dayIndex} style={styles.cell}>
                  <Pressable
                    disabled={weekend}
                    onPress={() => toggleDay(key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected, disabled: weekend }}
                    style={({ pressed }) => [
                      styles.day,
                      isSelected && { backgroundColor: SELECTED_DAY },
                      !isSelected && isToday && { borderWidth: 1.5, borderColor: tint },
                      pressed && styles.dayPressed
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        weekend && { color: `${mutedColor}60` },
                        isSelected && styles.dayTextSelected
                      ]}
                    >
                      {day}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}

        <View style={[styles.calendarActions, { borderTopColor: borderColor }]}>
          <Pressable onPress={toggleMonth} hitSlop={6} accessibilityRole="button">
            <Text style={[styles.actionText, { color: tint }]}>{allMonthSelected ? t.lunch.unselectMonth : t.lunch.selectMonth}</Text>
          </Pressable>
          {selected.size > 0 ? (
            <Pressable onPress={() => setSelected(new Set())} hitSlop={6} accessibilityRole="button">
              <Text style={[styles.actionText, { color: mutedColor }]}>{t.lunch.clear}</Text>
            </Pressable>
          ) : null}
        </View>
      </Card>

      <Card style={styles.total}>
        <View style={styles.totalCopy}>
          <Text style={[styles.totalLabel, { color: mutedColor }]}>{t.lunch.totalLabel}</Text>
          <Text style={[styles.totalDays, { color: mutedColor }]}>
            {t.lunch.selectedDays(selected.size)} × {formatMoney(LUNCH_FEE_PER_DAY)}
          </Text>
        </View>
        <Text style={[styles.totalAmount, { color: moneyColor }]}>{formatMoney(selected.size * LUNCH_FEE_PER_DAY)}</Text>
      </Card>

      <Pressable
        onPress={pay}
        disabled={selected.size === 0 || tooManyDays || paying}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.payButton,
          (selected.size === 0 || tooManyDays) && styles.payButtonDisabled,
          pressed && styles.dayPressed
        ]}
      >
        {paying ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="qr-code-outline" size={20} color="#fff" />
            <Text style={styles.payButtonText}>{t.qpay.payButton}</Text>
          </>
        )}
      </Pressable>
      {tooManyDays ? (
        <Text style={[styles.note, { color: '#dc2626' }]}>{t.lunch.tooManyDays(MAX_LUNCH_DAYS)}</Text>
      ) : selected.size === 0 ? (
        <Text style={[styles.note, { color: mutedColor }]}>{t.lunch.selectToPay}</Text>
      ) : null}

      <Text style={[styles.note, { color: mutedColor }]}>{t.lunch.note}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    padding: 16
  },
  // The wrapper owns the size: a require()d Image given a percentage width plus
  // aspectRatio falls back to the PNG's own pixel size and overflows the screen.
  heroShadow: {
    width: '100%',
    aspectRatio: 1000 / 563,
    borderRadius: 22,
    backgroundColor: 'transparent',
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6
  },
  // lunch-card.png is cropped to the card itself, so it fills the wrapper exactly.
  hero: {
    width: '100%',
    height: '100%',
    borderRadius: 22
  },
  price: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
    marginBottom: 16,
    paddingHorizontal: 4,
    backgroundColor: 'transparent'
  },
  priceIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb'
  },
  priceCopy: {
    flex: 1,
    gap: 2,
    backgroundColor: 'transparent'
  },
  priceLabel: {
    fontSize: 15,
    fontWeight: '700'
  },
  priceUnit: {
    fontSize: 13
  },
  priceAmount: {
    fontSize: 22,
    fontWeight: '800'
  },
  calendar: {
    paddingHorizontal: 10,
    paddingBottom: 6
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    marginBottom: 10,
    backgroundColor: 'transparent'
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '800'
  },
  week: {
    flexDirection: 'row',
    backgroundColor: 'transparent'
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    paddingBottom: 6
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 3,
    backgroundColor: 'transparent'
  },
  day: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center'
  },
  dayPressed: {
    opacity: 0.7
  },
  dayText: {
    fontSize: 15,
    fontWeight: '600'
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: '800'
  },
  calendarActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 10,
    paddingHorizontal: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent'
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700'
  },
  total: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  totalCopy: {
    flexShrink: 1,
    gap: 3,
    backgroundColor: 'transparent'
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  totalDays: {
    fontSize: 14
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '800'
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    borderRadius: 16,
    marginTop: 4,
    marginBottom: 6,
    backgroundColor: '#1d4ed8'
  },
  payButtonDisabled: {
    opacity: 0.45
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800'
  },
  note: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6
  }
});
