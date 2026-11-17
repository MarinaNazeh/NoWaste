// My reservations (FR-RES-08, US-31, D-94): ?scope=active lists the reservations still to collect, each held one with
// its countdown (D-96); ?scope=past lists the ended ones, the newest first. A card opens the reservation.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { getMyReservations, type Reservation } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { Countdown, useNow } from '@/components/Countdown';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { useLanguage } from '@/i18n/LanguageProvider';
import { formatDateTime } from '@/listings/formatDateTime';
import { listingText } from '@/listings/listingText';
import { colors, minTouchSize, radius, spacing } from '@/theme';

export default function MyReservationsScreen() {
  const { t } = useTranslation();
  const { direction, language } = useLanguage();
  const { token, signOut } = useAuth();
  const params = useLocalSearchParams<{ scope?: string }>();
  const scope = params.scope === 'past' ? 'past' : 'active';
  const [reservations, setReservations] = useState<Reservation[] | null>(null);
  // D-97: ticks every second, so the screen changes when the pickup slot starts.
  const now = useNow();
  const [failed, setFailed] = useState(false);

  const show = useCallback(
    (result: Awaited<ReturnType<typeof getMyReservations>>) => {
      if (result.kind === 'ok') setReservations(result.reservations);
      else if (result.kind === 'unauthorized' || result.kind === 'suspended') void signOut();
      else setFailed(true);
    },
    [signOut],
  );

  useEffect(() => {
    if (token === null) return;
    let active = true;
    void getMyReservations(token, scope).then((result) => {
      if (active) show(result);
    });
    return () => {
      active = false;
    };
  }, [token, scope, show]);

  // A hold that runs out while the list is open: load the list again so it leaves Active.
  const reload = useCallback(() => {
    if (token !== null) void getMyReservations(token, scope).then(show);
  }, [token, scope, show]);

  if (token === null) return <Redirect href="/" />;

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: t(scope === 'active' ? 'profile.active' : 'profile.past') }} />
      <View testID={`reservations-${scope}`} style={[styles.content, { direction }]}>
        {failed ? <Notice tone="error" message={t('reservation.failed')} /> : null}
        {reservations === null ? (
          failed ? null : (
            <ActivityIndicator color={colors.primary} />
          )
        ) : reservations.length === 0 ? (
          <AppText color="textMuted">
            {t(scope === 'active' ? 'reservation.activeEmpty' : 'reservation.pastEmpty')}
          </AppText>
        ) : (
          reservations.map((reservation) => {
            const name =
              listingText(
                { ...reservation.listing, descriptionAr: null, descriptionEn: null, foodType: null },
                language,
              ).name ?? t('quickPost.title');
            return (
              <Pressable
                key={reservation.id}
                testID={`reservation-card-${reservation.id}`}
                accessibilityRole="button"
                onPress={() => {
                  router.push({ pathname: '/reservations/[id]', params: { id: reservation.id } });
                }}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              >
                <AppText variant="label">{name}</AppText>
                <AppText color="textMuted">{reservation.listing.shopName}</AppText>
                <AppText>{t(`reservation.statuses.${reservation.status}`)}</AppText>
                {reservation.status === 'Held' &&
                reservation.slotStart !== null &&
                Date.parse(reservation.slotStart) > now ? (
                  <Countdown
                    labelKey="reservation.startsIn"
                    warn={false}
                    until={reservation.slotStart}
                    onEnd={reload}
                  />
                ) : reservation.status === 'Held' && reservation.holdExpiresAt !== null ? (
                  <Countdown until={reservation.holdExpiresAt} onEnd={reload} />
                ) : (
                  <AppText color="textMuted">
                    {t('offers.pickupWindow', {
                      start: formatDateTime(reservation.listing.pickupStart, language),
                      end: formatDateTime(reservation.listing.pickupEnd, language),
                    })}
                  </AppText>
                )}
              </Pressable>
            );
          })
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  card: {
    minHeight: minTouchSize,
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: {
    backgroundColor: colors.accent,
  },
});
