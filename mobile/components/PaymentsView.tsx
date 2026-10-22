import { useCallback, useRef } from 'react';
import { FlatList, Image, Platform, Pressable, RefreshControl, StyleSheet, View as RNView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { statusTone } from '@/components/Badge';
import { GradientHeaderButton, gradientHeaderItem } from '@/components/GradientHeaderButton';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SkeletonList } from '@/components/Skeleton';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';
import { isOutstandingAppFee, usePaymentLock } from '@/lib/payment-lock';
import { useAuth } from '@/lib/auth-context';
import { useApiData } from '@/lib/use-api';
import { translateValue } from '@shared/i18n-tables';
import { LUNCH_FEE_PER_DAY } from '@shared/lunch';
import { formatAmountLabel, groupThousands } from '@shared/money';
import type { PaymentEntry } from '@shared/api-types';
import { type Palette, paymentPalettes as palettes } from '@/components/payment-palette';

const PAYMENT_ART = require('@/assets/images/payment.png');
const PAYMENT_ART_RATIO = 1086 / 1448;

/** Status pills are solid gradients with a soft glow of their own color — no outline. */
const statusStyles = {
  success: { icon: 'checkmark-circle', colors: ['#34d399', '#059669'], glow: '#10b981' },
  danger: { icon: 'alert-circle', colors: ['#ff6b81', '#e11d48'], glow: '#f43f5e' },
  warning: { icon: 'time', colors: ['#fbbf24', '#ea580c'], glow: '#f59e0b' },
  neutral: { icon: 'ellipse', colors: ['#7c8db5', '#4b5878'], glow: '#64748b' }
} as const;

/**
 * The payments list. `locked` is the payment gate (app/payment-required):
 * only outstanding payments, no way back, a notice explaining why, and sign-out.
 */
export function PaymentsView({ locked = false }: { locked?: boolean }) {
  const { data, error, loading, refetch, isOffline } = useApiData('payments', api.payments);
  const { refresh: refreshLock } = usePaymentLock();
  const { session, signOut } = useAuth();
  const { t } = useLanguage();
  const isDark = useColorScheme() === 'dark';
  const palette = isDark ? palettes.dark : palettes.light;
  // expo-router (SDK 56+) forbids importing @react-navigation/* for useHeaderHeight;
  // on iOS the list insets itself under the transparent header, elsewhere a
  // fixed allowance for the standard header height is enough.
  const headerHeight = useSafeAreaInsets().top + 56;
  const isIOS = Platform.OS === 'ios';
  // Explicit pixel size: a percentage width with aspectRatio let the Image
  // fall back to the PNG's own 1086px height and push the art off screen.
  const artWidth = Math.min(useWindowDimensions().width * 0.58, 230);
  const router = useRouter();
  const backButton = (
    <GradientHeaderButton icon="chevron-back" colors={palette.button} onPress={() => router.back()} accessibilityLabel={t.qpay.back} />
  );

  // Coming back from the QPay screen should show the new Paid status; the
  // first focus is skipped because useApiData already fetches on mount.
  const focusedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focusedOnce.current) {
        refetch();
        // Back from QPay on the gate: re-check so a paid user is let in.
        if (locked) refreshLock();
      }
      focusedOnce.current = true;
    }, [refetch, locked, refreshLock])
  );

  let body;
  if (loading) {
    body = (
      <RNView style={{ paddingTop: headerHeight }}>
        <SkeletonList />
      </RNView>
    );
  } else if (error && !isOffline) {
    body = (
      <View style={[styles.center, { backgroundColor: 'transparent' }]}>
        <Text style={{ color: isDark ? '#fca5a5' : '#b91c1c' }}>{error.message}</Text>
      </View>
    );
  } else {
    body = (
      <FlatList showsVerticalScrollIndicator={false}
        style={styles.list}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingTop: isIOS ? 12 : headerHeight + 12 }]}
        // The app fee belongs to the lock screen. An unpaid lunch fee is an
        // abandoned checkout from the lunch screen, so only paid ones are listed.
        data={(data?.payments ?? []).filter(
          locked ? isOutstandingAppFee : (payment) => payment.kind === 'tuition' || (payment.kind === 'lunch' && payment.status.trim().toLowerCase() === 'paid')
        )}
        keyExtractor={(payment) => payment.id}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refetch}
            tintColor={palette.icon}
            colors={[palette.icon]}
            progressViewOffset={isIOS ? undefined : headerHeight}
          />
        }
        ListHeaderComponent={
          <>
            {isOffline ? <OfflineBanner /> : null}
            {locked ? <LockNotice palette={palette} /> : null}
          </>
        }
        ListEmptyComponent={<EmptyPayments palette={palette} />}
        ListFooterComponent={
          <RNView style={styles.promo}>
            <Image
              source={PAYMENT_ART}
              style={{ width: artWidth, height: artWidth * PAYMENT_ART_RATIO }}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
            <Text style={[styles.promoTitle, { color: palette.text }]}>{t.qpay.promoTitle}</Text>
            <Text style={[styles.promoSubtitle, { color: palette.meta }]}>{t.qpay.promoSubtitle}</Text>
            {locked ? (
              <RNView style={styles.lockActions}>
                <Pressable onPress={() => signOut()} style={({ pressed }) => [styles.signOut, pressed && styles.buttonPressed]} accessibilityRole="button">
                  <Ionicons name="log-out-outline" size={18} color={palette.meta} />
                  <Text style={[styles.signOutText, { color: palette.meta }]}>{t.common.logout}</Text>
                </Pressable>
              </RNView>
            ) : null}
            {!locked && session?.role === 'parent' ? <LunchLink palette={palette} /> : null}
          </RNView>
        }
        renderItem={({ item }) => <PaymentCard payment={item} palette={palette} />}
      />
    );
  }

  return (
    <RNView style={styles.screen}>
      <Stack.Screen
        options={{
          headerTransparent: true,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: 'transparent' },
          headerTintColor: palette.text,
          headerBackVisible: false,
          ...(locked
            ? { title: t.qpay.lockTitle, gestureEnabled: false }
            : { headerLeft: () => backButton, unstable_headerLeftItems: gradientHeaderItem(backButton) }),
          headerTitleStyle: { color: palette.text, fontWeight: '800' }
        }}
      />
      <LinearGradient colors={palette.background} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={StyleSheet.absoluteFill} />
      <RNView pointerEvents="none" style={[styles.orb, styles.orbTop, { backgroundColor: palette.orbA }]} />
      <RNView pointerEvents="none" style={[styles.orb, styles.orbBottom, { backgroundColor: palette.orbB }]} />
      {body}
    </RNView>
  );
}

/**
 * No payments: the same glass card as a payment, so the screen keeps its look
 * instead of the app-wide EmptyState's plain themed box.
 */
function EmptyPayments({ palette }: { palette: Palette }) {
  const { t } = useLanguage();
  return (
    <RNView style={[styles.cardShadow, { shadowColor: palette.glow }]}>
      <LinearGradient
        colors={palette.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, styles.emptyCard, { borderColor: palette.cardBorder }]}
      >
        <RNView style={[styles.emptyIcon, { backgroundColor: palette.iconBg, borderColor: palette.iconBorder }]}>
          <Ionicons name="checkmark-done" size={28} color={palette.icon} />
        </RNView>
        <Text style={[styles.emptyTitle, { color: palette.text }]}>{t.common.noPaymentsYet}</Text>
        <Text style={[styles.emptyBody, { color: palette.meta }]}>{t.qpay.emptyHint}</Text>
      </LinearGradient>
    </RNView>
  );
}

/** Parents pick lunch days and pay for them on their own screen (app/lunch). */
function LunchLink({ palette }: { palette: Palette }) {
  const { t } = useLanguage();
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push('/lunch')}
      accessibilityRole="button"
      style={({ pressed }) => [styles.lunchShadow, { shadowColor: palette.glow }, pressed && styles.buttonPressed]}
    >
      <LinearGradient colors={palette.button} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.lunchLink}>
        <RNView style={styles.lunchIcon}>
          <Ionicons name="restaurant-outline" size={20} color="#fff" />
        </RNView>
        <RNView style={styles.lunchCopy}>
          <Text style={styles.lunchTitle}>{t.lunch.homeLink}</Text>
          <Text style={styles.lunchSubtitle}>{t.lunch.paymentsLinkSubtitle(`${groupThousands(String(LUNCH_FEE_PER_DAY))}₮`)}</Text>
        </RNView>
        <Ionicons name="chevron-forward" size={22} color="#fff" />
      </LinearGradient>
    </Pressable>
  );
}

/** Same in both themes: the copy is white, and the card is the screen's one bold surface. */
const NOTICE_GRADIENT = ['#3b82f6', '#4f46e5', '#7c3aed'] as const;

function LockNotice({ palette }: { palette: Palette }) {
  const { t } = useLanguage();
  return (
    <RNView style={[styles.noticeShadow, { shadowColor: palette.glow }]}>
      <LinearGradient colors={NOTICE_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.notice}>
        <RNView pointerEvents="none" style={[styles.noticeOrb, styles.noticeOrbTop]} />
        <RNView pointerEvents="none" style={[styles.noticeOrb, styles.noticeOrbBottom]} />

        <RNView style={styles.noticeHeader}>
          <RNView style={styles.noticeIconRing}>
            <RNView style={styles.noticeIcon}>
              <Ionicons name="lock-closed" size={22} color="#4f46e5" />
            </RNView>
          </RNView>
          <RNView style={styles.noticeEyebrow}>
            <Ionicons name="phone-portrait-outline" size={13} color="#fff" />
            <Text style={styles.noticeEyebrowText}>{t.qpay.lockEyebrow}</Text>
          </RNView>
        </RNView>

        <Text style={styles.noticeTitle}>{t.qpay.lockHeading}</Text>
        <Text style={styles.noticeBody}>{t.qpay.lockBody}</Text>

        <RNView style={styles.noticePerks}>
          <RNView style={styles.noticePerk}>
            <Ionicons name="flash" size={14} color="#fde68a" />
            <Text style={styles.noticePerkText}>{t.qpay.lockPerkInstant}</Text>
          </RNView>
          <RNView style={styles.noticePerk}>
            <Ionicons name="shield-checkmark" size={14} color="#a7f3d0" />
            <Text style={styles.noticePerkText}>{t.qpay.lockPerkSecure}</Text>
          </RNView>
        </RNView>
      </LinearGradient>
    </RNView>
  );
}

function PaymentCard({ payment, palette }: { payment: PaymentEntry; palette: Palette }) {
  const { language, t } = useLanguage();
  const router = useRouter();
  const payable = payment.status.trim().toLowerCase() !== 'paid' && (payment.amount ?? 0) > 0;
  const status = statusStyles[toneKey(payment.status)];

  return (
    <RNView style={[styles.cardShadow, { shadowColor: palette.glow }]}>
      <LinearGradient
        colors={palette.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <RNView style={styles.cardHeader}>
          <RNView style={styles.amountRow}>
            <RNView style={[styles.iconCircle, { backgroundColor: palette.iconBg, borderColor: palette.iconBorder }]}>
              <Ionicons name="wallet" size={24} color={palette.icon} />
            </RNView>
            <Text style={[styles.amount, { color: palette.text }]} numberOfLines={1} adjustsFontSizeToFit>
              {formatAmountLabel(payment.amountLabel)}
            </Text>
          </RNView>
          <RNView style={[styles.pillShadow, { shadowColor: status.glow }]}>
            <LinearGradient colors={status.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pill}>
              <Ionicons name={status.icon} size={15} color="#fff" />
              <Text style={styles.pillText}>{translateValue(payment.status, language)}</Text>
            </LinearGradient>
          </RNView>
        </RNView>

        {/* Stacked rather than side by side so a long name is never cut off. */}
        <RNView style={[styles.meta, { borderTopColor: palette.divider }]}>
          <RNView style={styles.metaGroup}>
            <Ionicons name="person-outline" size={17} color={palette.meta} />
            <Text style={[styles.student, { color: palette.text }]}>{payment.student}</Text>
          </RNView>
          <RNView style={styles.metaGroup}>
            <Ionicons name="pricetag-outline" size={16} color={palette.meta} />
            <Text style={[styles.date, { color: palette.meta }]}>
              {translateValue(payment.kind === 'app' ? 'App fee' : payment.kind === 'lunch' ? 'Lunch fee' : 'Tuition', language)}
            </Text>
          </RNView>
          <RNView style={styles.metaGroup}>
            <Ionicons name="calendar-outline" size={16} color={palette.meta} />
            <Text style={[styles.date, { color: palette.meta }]}>
              {t.columns['Due date']} {payment.dueDate}
            </Text>
          </RNView>
        </RNView>

        {payable ? (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              router.push({ pathname: '/qpay', params: { paymentId: payment.id, amountLabel: formatAmountLabel(payment.amountLabel) } });
            }}
            style={({ pressed }) => [styles.buttonShadow, { shadowColor: palette.glow }, pressed && styles.buttonPressed]}
            accessibilityRole="button"
          >
            <LinearGradient colors={palette.button} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
              <Ionicons name="qr-code-outline" size={22} color="#fff" />
              <Text style={styles.buttonText}>{t.qpay.payButton}</Text>
            </LinearGradient>
          </Pressable>
        ) : null}
      </LinearGradient>
    </RNView>
  );
}

function toneKey(status: string): keyof typeof statusStyles {
  const tone = statusTone(status);
  return tone === 'success' || tone === 'danger' || tone === 'warning' ? tone : 'neutral';
}

const styles = StyleSheet.create({
  screen: {
    flex: 1
  },
  orb: {
    position: 'absolute',
    borderRadius: 999
  },
  orbTop: {
    width: 360,
    height: 360,
    top: -160,
    left: -140
  },
  orbBottom: {
    width: 420,
    height: 420,
    bottom: -200,
    right: -160
  },
  list: {
    flex: 1
  },
  noticeShadow: {
    borderRadius: 26,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 22,
    elevation: 8
  },
  notice: {
    borderRadius: 26,
    padding: 20,
    gap: 8,
    overflow: 'hidden'
  },
  noticeOrb: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)'
  },
  noticeOrbTop: {
    width: 180,
    height: 180,
    top: -80,
    right: -50
  },
  noticeOrbBottom: {
    width: 120,
    height: 120,
    bottom: -60,
    left: -30
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  noticeIconRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)'
  },
  noticeIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff'
  },
  noticeEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)'
  },
  noticeEyebrowText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700'
  },
  noticeTitle: {
    color: '#fff',
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '800'
  },
  noticeBody: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500'
  },
  noticePerks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6
  },
  noticePerk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(15,10,60,0.25)'
  },
  noticePerkText: {
    color: '#fff',
    fontSize: 12.5,
    fontWeight: '700'
  },
  lockActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18
  },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '700'
  },
  lunchShadow: {
    // The footer centers its children; the link spans the full width below the promo.
    alignSelf: 'stretch',
    marginTop: 22,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6
  },
  lunchLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16
  },
  lunchIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)'
  },
  lunchCopy: {
    flex: 1,
    gap: 2
  },
  lunchTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800'
  },
  lunchSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '500'
  },
  promo: {
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 12
  },
  promoTitle: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3
  },
  promoSubtitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    textAlign: 'center'
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 24,
    gap: 16
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  cardShadow: {
    borderRadius: 26,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 6
  },
  card: {
    borderRadius: 26,
    padding: 18,
    gap: 16,
    overflow: 'hidden'
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexShrink: 1
  },
  emptyCard: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 28,
    borderWidth: 1
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center'
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center'
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  amount: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    flexShrink: 1
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999
  },
  pillShadow: {
    borderRadius: 999,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 4
  },
  pillText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700'
  },
  meta: {
    gap: 8,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth
  },
  metaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  student: {
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1
  },
  date: {
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 1
  },
  buttonShadow: {
    borderRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 6
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }]
  },
  button: {
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)'
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700'
  }
});
