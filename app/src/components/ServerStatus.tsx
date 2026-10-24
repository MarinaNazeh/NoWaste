import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { isServerHealthy } from '@/api/client';
import { AppText } from './AppText';
import { colors, radius, spacing } from '@/theme';

type Status = 'checking' | 'connected' | 'notReachable';

const textKey: Record<Status, string> = {
  checking: 'home.serverChecking',
  connected: 'home.serverConnected',
  notReachable: 'home.serverNotReachable',
};

/** Shows whether the app can reach GET /health on the server (skeleton check, kept for demos and debugging). */
export function ServerStatus() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    let active = true;
    void isServerHealthy().then((healthy) => {
      if (active) {
        setStatus(healthy ? 'connected' : 'notReachable');
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <View style={styles.pill}>
      <View
        style={[
          styles.dot,
          {
            backgroundColor:
              status === 'connected' ? colors.leaf : status === 'checking' ? colors.border : colors.error,
          },
        ]}
      />
      <AppText variant="caption" color="textMuted">
        {t(textKey[status])}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
  },
});
