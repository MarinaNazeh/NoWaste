import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { isServerHealthy } from '@/api/client';

type Status = 'checking' | 'connected' | 'notReachable';

const textKey: Record<Status, string> = {
  checking: 'home.serverChecking',
  connected: 'home.serverConnected',
  notReachable: 'home.serverNotReachable',
};

/** Shows whether the app can reach GET /health on the server. */
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
    <Text accessibilityRole="text" style={styles.text}>
      {t(textKey[status])}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 18,
    color: '#1A1A1A',
  },
});
