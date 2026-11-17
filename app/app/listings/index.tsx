// My listings (US-15, FR-LST-06): the vendor's active and previous listings, newest first, each with its photo,
// status, perishability category and pickup urgency (ListingCard, FR-RTE-04). Tapping one opens its details. Each card
// has its bag counts (D-101, D-102). D-102: three tabs: Active (published, pickup not ended; soonest end first), Drafts
// (not published, still publishable; newest first) and Past (ended listings and drafts whose pickup passed; newest
// pickup first).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { getMyListings, getShop, type Listing, type Shop } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ListingCard } from '@/components/ListingCard';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { SegmentedControl } from '@/components/SegmentedControl';
import { hasEnded, isAllCollected } from '@/listings/bagCounts';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, spacing } from '@/theme';

type Problem = 'unreachable' | 'unexpected';
type Tab = 'active' | 'drafts' | 'past';

function tabOf(listing: Listing, now: number): Tab {
  // D-103: a listing whose bags were all collected needs nothing more from the vendor.
  if (hasEnded(listing, now) || isAllCollected(listing)) return 'past';
  return listing.status === 'Draft' ? 'drafts' : 'active';
}

export default function MyListingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { direction } = useLanguage();
  const { token, signOut } = useAuth();
  const [listings, setListings] = useState<Listing[] | null>(null);
  // D-64: formal vendors post with Create listing, informal vendors with Quick Post; null until known.
  const [vendorType, setVendorType] = useState<Shop['vendorType'] | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  // Try again loads the list once more by counting up.
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState<Tab>('active');
  const [now] = useState(() => Date.now());
  const byTab = useMemo(() => {
    const groups: Record<Tab, Listing[]> = { active: [], drafts: [], past: [] };
    for (const listing of listings ?? []) groups[tabOf(listing, now)].push(listing);
    groups.active.sort((a, b) => Date.parse(a.pickupEnd) - Date.parse(b.pickupEnd));
    groups.past.sort((a, b) => Date.parse(b.pickupEnd) - Date.parse(a.pickupEnd));
    return groups;
  }, [listings, now]);

  // D-103: loaded again every time the screen is shown, so the counts are current after the vendor hands bags over.
  useFocusEffect(
    useCallback(() => {
      if (token === null) return;
      let active = true;
      void getMyListings(token).then((result) => {
        if (!active) return;
        if (result.kind === 'ok') setListings(result.listings);
        else if (result.kind === 'unauthorized' || result.kind === 'suspended') void signOut();
        else setProblem(result.kind);
      });
      return () => {
        active = false;
      };
      // `attempt` is not read here: Try again changes it so the list is loaded once more.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, signOut, attempt]),
  );

  useEffect(() => {
    if (token === null) return;
    let active = true;
    void getShop(token).then((result) => {
      if (active && result.kind === 'ok') setVendorType(result.shop.vendorType);
    });
    return () => {
      active = false;
    };
  }, [token]);

  if (token === null) return <Redirect href="/" />;
  const session = token;

  return (
    <Screen scroll>
      <View testID="my-listings" style={[styles.content, { direction }]}>
        <AppText variant="heading" accessibilityRole="header">
          {t('myListings.title')}
        </AppText>
        {problem !== null ? (
          <>
            <Notice tone="error" message={t(`listing.problems.${problem}`)} />
            <Button
              variant="secondary"
              label={t('myListings.retry')}
              onPress={() => {
                setProblem(null);
                setAttempt((n) => n + 1);
              }}
            />
          </>
        ) : listings === null ? (
          <ActivityIndicator color={colors.primary} />
        ) : listings.length === 0 ? (
          <>
            {vendorType === 'informal' ? (
              <>
                <AppText color="textMuted">{t('myListings.emptyInformal')}</AppText>
                <Button
                  label={t('vendorHome.quickPost')}
                  onPress={() => {
                    router.push('/listings/quick');
                  }}
                />
              </>
            ) : vendorType === 'formal' ? (
              <>
                <AppText color="textMuted">{t('myListings.empty')}</AppText>
                <Button
                  label={t('vendorHome.createListing')}
                  onPress={() => {
                    router.push('/listings/new');
                  }}
                />
              </>
            ) : (
              <ActivityIndicator color={colors.primary} />
            )}
          </>
        ) : (
          <>
            <SegmentedControl
              accessibilityLabel={t('myListings.tabsLabel')}
              value={tab}
              onChange={setTab}
              options={(['active', 'drafts', 'past'] as const).map((value) => ({
                value,
                label: t('myListings.tab', {
                  tab: t(
                    `myListings.tab${value === 'active' ? 'Active' : value === 'drafts' ? 'Drafts' : 'Past'}`,
                  ),
                  count: byTab[value].length,
                }),
              }))}
            />
            {byTab[tab].length === 0 ? (
              <AppText color="textMuted">{t('myListings.emptyTab')}</AppText>
            ) : (
              byTab[tab].map((listing) => (
                <ListingCard
                  key={listing.id}
                  token={session}
                  listing={listing}
                  onPress={() => {
                    router.push(`/listings/${listing.id}`);
                  }}
                />
              ))
            )}
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
});
