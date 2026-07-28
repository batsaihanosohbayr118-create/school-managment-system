import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';

/** Shared shell for a tab whose data-fetching hasn't been wired up yet. */
export default function PlaceholderScreen({ title, note }: { title: string; note: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.note}>{note}</Text>
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
  note: {
    marginTop: 16,
    fontSize: 15,
    opacity: 0.6
  }
});
