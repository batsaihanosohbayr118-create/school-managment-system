import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { useAuth } from '@/lib/auth-context';

export default function HomeScreen() {
  const { session } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>
      {session ? <Text style={styles.subtitle}>{session.name || session.email}</Text> : null}
      <Text style={styles.placeholder}>Today's schedule and latest grades will show up here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 8
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold'
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7
  },
  placeholder: {
    marginTop: 24,
    fontSize: 15,
    opacity: 0.6
  }
});
