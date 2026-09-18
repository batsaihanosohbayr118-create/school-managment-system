import { useCallback, useState } from 'react';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';

import {
  AssignmentPanel,
  FilePanel,
  LessonPanel,
  TopicPanel,
  VideoPanel
} from './subject-content';
import { Card } from '@/components/Card';
import { Text, View, useThemeColor } from '@/components/Themed';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';
import { ApiError } from '@shared/api-error';
import type { SubjectContent } from '@shared/api-types';

type PanelId = 'file' | 'topic' | 'lesson' | 'video' | 'assignment';

const ACCENT_BY_ID: Record<PanelId, 'pink' | 'tint' | 'purple' | 'success' | 'warning'> = {
  file: 'pink',
  topic: 'tint',
  lesson: 'purple',
  video: 'success',
  assignment: 'warning'
};

function emptyContent(subjectId: string): SubjectContent {
  return { subjectId, topics: [], lessons: [], assignments: [] };
}

export default function SubjectAddScreen() {
  const { id, name, mode, type } = useLocalSearchParams<{ id: string; name?: string; mode?: string; type?: PanelId }>();
  const subjectId = id ?? '';
  const { t } = useLanguage();
  const router = useRouter();
  const tint = useThemeColor({}, 'tint');
  const mutedColor = useThemeColor({}, 'muted');
  const dangerColor = useThemeColor({}, 'danger');
  const [content, setContent] = useState<SubjectContent>(emptyContent(subjectId));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!subjectId) return;
    setError(null);
    try {
      setContent((await api.subjectContent(subjectId)) ?? emptyContent(subjectId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.subjectContent.loadFailed);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const sections: { id: PanelId; icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }[] = [
    { id: 'file', icon: 'cloud-upload-outline', ...t.subjectContent.sections.file },
    { id: 'topic', icon: 'list-outline', ...t.subjectContent.sections.topic },
    { id: 'lesson', icon: 'book-outline', ...t.subjectContent.sections.lesson },
    { id: 'video', icon: 'videocam-outline', ...t.subjectContent.sections.video },
    { id: 'assignment', icon: 'clipboard-outline', ...t.subjectContent.sections.assignment }
  ];

  const selectedSection = sections.find((section) => section.id === type);
  const showMenu = mode === 'menu' || !selectedSection;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <Stack.Screen options={{ title: selectedSection?.title ?? t.subjectContent.addContent, headerBackTitle: name || t.nav.subjects.label }} />

        {showMenu ? (
          <>
            <Text style={[styles.intro, { color: mutedColor }]}>{name || t.nav.subjects.label}</Text>
            {sections.map((section) => (
              <MenuRow
                key={section.id}
                section={section}
                onPress={() => router.push({ pathname: '/subject-add', params: { id: subjectId, name: name || '', type: section.id } })}
              />
            ))}
          </>
        ) : loading ? (
          <ActivityIndicator color={tint} style={styles.loading} />
        ) : error ? (
          <Text style={{ color: dangerColor }}>{error}</Text>
        ) : (
          <>
            <Text style={styles.pageTitle}>{selectedSection.title}</Text>
            <View style={styles.formCard}>
              {type === 'file' && <FilePanel subjectId={subjectId} content={content} onChange={setContent} />}
              {type === 'topic' && <TopicPanel subjectId={subjectId} content={content} onChange={setContent} />}
              {type === 'lesson' && <LessonPanel subjectId={subjectId} content={content} onChange={setContent} />}
              {type === 'video' && <VideoPanel subjectId={subjectId} content={content} onChange={setContent} />}
              {type === 'assignment' && <AssignmentPanel subjectId={subjectId} content={content} onChange={setContent} />}
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function MenuRow({
  section,
  onPress
}: {
  section: { id: PanelId; icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string };
  onPress: () => void;
}) {
  const accent = ACCENT_BY_ID[section.id];
  const accentColor = useThemeColor({}, accent);
  const accentMuted = useThemeColor({}, `${accent}Muted` as const);
  const mutedColor = useThemeColor({}, 'muted');

  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <Card style={styles.menuCard}>
        <View style={[styles.iconBox, { backgroundColor: accentColor }]}>
          {section.id === 'assignment' ? (
            <FontAwesome5 name="clipboard-check" size={17} color="#fff" />
          ) : (
            <Ionicons name={section.icon} size={19} color="#fff" />
          )}
        </View>
        <View style={styles.titleGroup}>
          <Text style={styles.title}>{section.title}</Text>
          <Text style={[styles.subtitle, { color: mutedColor }]} numberOfLines={2}>{section.subtitle}</Text>
        </View>
        <View style={[styles.chevronBubble, { backgroundColor: accentMuted }]}>
          <Ionicons name="chevron-forward" size={16} color={accentColor} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },
  intro: { fontSize: 14, marginBottom: 10 },
  pageTitle: { fontSize: 22, fontWeight: '800', marginBottom: 14 },
  menuCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginBottom: 10 },
  pressed: { opacity: 0.75 },
  iconBox: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  titleGroup: { flex: 1, minWidth: 0, gap: 2, backgroundColor: 'transparent' },
  title: { fontSize: 16, fontWeight: '700' },
  subtitle: { fontSize: 13 },
  chevronBubble: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  formCard: {},
  loading: { marginTop: 40 }
});
