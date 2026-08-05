import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Text, View, useThemeColor } from '@/components/Themed';
import { useLanguage } from '@/lib/language-context';

export default function NotFoundScreen() {
  const { t } = useLanguage();
  const tint = useThemeColor({}, 'tint');

  return (
    <>
      <Stack.Screen options={{ title: t.notFound.title }} />
      <View style={styles.container}>
        <Text style={styles.title}>{t.notFound.body}</Text>

        <Link href="/" style={styles.link}>
          <Text style={[styles.linkText, { color: tint }]}>{t.notFound.goHome}</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
