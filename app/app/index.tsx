// Home screen of the skeleton: shows whether the server is reachable. Role home screens come with the user stories.
import { StyleSheet, View } from 'react-native';
import { ServerStatus } from '@/components/ServerStatus';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <ServerStatus />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
});
