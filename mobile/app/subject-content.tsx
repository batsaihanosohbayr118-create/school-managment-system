import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  type TextStyle
} from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/Card';
import { ExternalLink } from '@/components/ExternalLink';
import { Text, View, useThemeColor } from '@/components/Themed';
import { api, resolveApiUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { ApiError } from '@shared/api-error';
import { translateValue } from '@shared/i18n-tables';
import type { SubjectAssignment, SubjectContent, SubjectLesson, SubjectTopic } from '@shared/api-types';

type ContentCategory = 'topic' | 'lesson' | 'video' | 'assignment';

const CATEGORY_ACCENT: Record<ContentCategory, 'tint' | 'purple' | 'success' | 'warning'> = {
  topic: 'tint',
  lesson: 'purple',
  video: 'success',
  assignment: 'warning'
};

const CATEGORY_ICON: Record<ContentCategory, keyof typeof Ionicons.glyphMap> = {
  topic: 'list-outline',
  lesson: 'book-outline',
  video: 'videocam-outline',
  assignment: 'clipboard-outline'
};

/** The assignments category uses this FontAwesome5 glyph everywhere instead of Ionicons' plain clipboard, to match the "clipboard-check" badge already used for it in the subjects list. */
function CategoryIcon({ category, size, color }: { category: ContentCategory; size: number; color: string }) {
  if (category === 'assignment') return <FontAwesome5 name="clipboard-check" size={size - 2} color={color} />;
  return <Ionicons name={CATEGORY_ICON[category]} size={size} color={color} />;
}

function emptyContent(subjectId: string): SubjectContent {
  return { subjectId, topics: [], lessons: [], assignments: [] };
}

export default function SubjectContentScreen() {
  const { id, name, category } = useLocalSearchParams<{ id: string; name?: string; category?: ContentCategory }>();
  const subjectId = id ?? '';
  const { session } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const isTeacher = session?.role === 'teacher';
  const dangerColor = useThemeColor({}, 'danger');
  const tint = useThemeColor({}, 'tint');
  const cardAltColor = useThemeColor({}, 'cardAlt');

  const [content, setContent] = useState<SubjectContent>(emptyContent(subjectId));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!subjectId) return;
    setError(null);
    try {
      const data = await api.subjectContent(subjectId);
      setContent(data ?? emptyContent(subjectId));
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: name || t.nav.subjects.label }} />

      {loading ? (
        <ActivityIndicator color={tint} style={styles.loading} />
      ) : error ? (
        <Text style={{ color: dangerColor }}>{error}</Text>
      ) : (
        <>
          {category ? (
            <CategoryContent category={category} content={content} />
          ) : (
            <>
              <SectionHeader icon="grid-outline" label={t.subjectContent.addContent} />
              <View style={[styles.categoryGrid, { backgroundColor: cardAltColor }]}>
                <CategoryCard
                  category="topic"
                  title={t.subjectContent.topics}
                  count={content.topics.length}
                  onPress={() => router.push({ pathname: '/subject-content', params: { id: subjectId, name: name || '', category: 'topic' } })}
                />
                <CategoryCard
                  category="lesson"
                  title={t.subjectContent.sections.lesson.title}
                  count={content.lessons.filter((lesson) => !lesson.videoUrl).length}
                  onPress={() => router.push({ pathname: '/subject-content', params: { id: subjectId, name: name || '', category: 'lesson' } })}
                />
                <CategoryCard
                  category="video"
                  title={t.subjectContent.sections.video.title}
                  count={content.lessons.filter((lesson) => lesson.videoUrl).length}
                  onPress={() => router.push({ pathname: '/subject-content', params: { id: subjectId, name: name || '', category: 'video' } })}
                />
                <CategoryCard
                  category="assignment"
                  title={t.subjectContent.assignments}
                  count={content.assignments.length}
                  onPress={() => router.push({ pathname: '/subject-content', params: { id: subjectId, name: name || '', category: 'assignment' } })}
                />
              </View>
            </>
          )}

          {isTeacher ? (
            <>
              <SectionHeader icon="add-circle-outline" label={t.subjectContent.addContent} />
              <Pressable
                onPress={() => router.push({ pathname: '/subject-add', params: { id: subjectId, name: name || '', mode: 'menu' } })}
                style={styles.addContentButton}
              >
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.addContentButtonText}>{t.subjectContent.addContent}</Text>
                <Ionicons name="chevron-forward" size={18} color="#fff" />
              </Pressable>
            </>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

function CategoryCard({
  category,
  title,
  count,
  onPress
}: {
  category: ContentCategory;
  title: string;
  count: number;
  onPress: () => void;
}) {
  const accent = CATEGORY_ACCENT[category];
  const accentColor = useThemeColor({}, accent);
  const accentMuted = useThemeColor({}, `${accent}Muted` as const);
  const mutedColor = useThemeColor({}, 'muted');
  const borderColor = useThemeColor({}, 'border');

  return (
    <Pressable style={[styles.categoryCard, { backgroundColor: accentMuted, borderColor }]} onPress={onPress}>
      <View style={[styles.categoryIcon, { backgroundColor: accentColor }]}>
        <CategoryIcon category={category} size={21} color="#fff" />
      </View>
      <Text style={styles.categoryTitle}>{title}</Text>
      <View style={styles.categoryFooter}>
        <Text style={[styles.categoryCount, { color: mutedColor }]}>{count}</Text>
        <Ionicons name="chevron-forward" size={17} color={accentColor} />
      </View>
    </Pressable>
  );
}

function CategoryContent({
  category,
  content
}: {
  category: ContentCategory;
  content: SubjectContent;
}) {
  const { t } = useLanguage();
  const accent = CATEGORY_ACCENT[category];
  const accentColor = useThemeColor({}, accent);
  const accentMuted = useThemeColor({}, `${accent}Muted` as const);
  const lessonItems = content.lessons.filter((lesson) => category === 'video' ? lesson.videoUrl : !lesson.videoUrl);
  const title = category === 'topic'
    ? t.subjectContent.categoryLabels.topic
    : category === 'lesson'
      ? t.subjectContent.categoryLabels.lesson
      : category === 'video'
        ? t.subjectContent.categoryLabels.video
        : t.subjectContent.categoryLabels.assignment;
  const icon = category === 'topic' ? 'list-outline' : category === 'lesson' ? 'book-outline' : category === 'video' ? 'videocam-outline' : 'clipboard-outline';

  const emptyLabel = category === 'topic'
    ? t.subjectContent.noTopicsYet
    : category === 'lesson'
      ? t.subjectContent.noLessonsYet
      : category === 'video'
        ? t.subjectContent.noVideosYet
        : t.subjectContent.noAssignmentsYet;

  return (
    <>
      <SectionHeader icon={icon} label={title} category={category} />
      {category === 'topic' ? (
        content.topics.length === 0 ? (
          <CategoryEmptyState category={category} label={emptyLabel} accentColor={accentColor} accentMuted={accentMuted} />
        ) : content.topics.map((topic) => (
          <TopicCard key={topic.id} topic={topic} lessons={[]} />
        ))
      ) : category === 'assignment' ? (
        content.assignments.length === 0 ? (
          <CategoryEmptyState category={category} label={emptyLabel} accentColor={accentColor} accentMuted={accentMuted} />
        ) : content.assignments.map((assignment) => (
          <AssignmentCard key={assignment.id} assignment={assignment} />
        ))
      ) : lessonItems.length === 0 ? (
        <CategoryEmptyState category={category} label={emptyLabel} accentColor={accentColor} accentMuted={accentMuted} />
      ) : category === 'video' ? (
        <Card style={styles.card}>
          <View style={styles.videoGrid}>
            {lessonItems.map((lesson) => <VideoLessonCard key={lesson.id} lesson={lesson} />)}
          </View>
        </Card>
      ) : (
        lessonItems.map((lesson) => (
          <LessonListItem key={lesson.id} lesson={lesson} accentColor={accentColor} accentMuted={accentMuted} />
        ))
      )}
    </>
  );
}

/** A dashed, tinted card with an icon bubble — matches the "Today is a quiet day" empty schedule treatment on the home screen, instead of a bare line of muted text. */
function CategoryEmptyState({
  category,
  label,
  accentColor,
  accentMuted
}: {
  category: ContentCategory;
  label: string;
  accentColor: string;
  accentMuted: string;
}) {
  return (
    <View style={[styles.emptyCard, { borderColor: accentColor, backgroundColor: accentMuted }]}>
      <View style={[styles.emptyIconBubble, { backgroundColor: accentColor }]}>
        <CategoryIcon category={category} size={22} color="#fff" />
      </View>
      <Text style={[styles.emptyCardText, { color: accentColor }]}>{label}</Text>
    </View>
  );
}

function SectionHeader({
  icon,
  label,
  category
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  /** When set, overrides `icon` with CategoryIcon's per-category glyph (assignment gets the clipboard-check look everywhere else it appears). */
  category?: ContentCategory;
}) {
  const mutedColor = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  return (
    <View style={styles.sectionHeader}>
      {category ? <CategoryIcon category={category} size={14} color={tint} /> : <Ionicons name={icon} size={14} color={tint} />}
      <Text style={[styles.sectionTitle, { color: mutedColor }]}>{label}</Text>
    </View>
  );
}

function TopicCard({ topic, lessons }: { topic: SubjectTopic; lessons: SubjectLesson[] }) {
  const { language } = useLanguage();
  const mutedColor = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  const borderColor = useThemeColor({}, 'border');
  const videoLessons = lessons.filter((lesson) => lesson.videoUrl);
  const otherLessons = lessons.filter((lesson) => !lesson.videoUrl);

  return (
    <Card style={styles.card}>
      <Text style={styles.cardTitle}>{translateValue(topic.title, language)}</Text>
      {topic.description ? <Text style={[styles.cardMeta, { color: mutedColor }]}>{translateValue(topic.description, language)}</Text> : null}

      {videoLessons.length > 0 ? (
        <View style={styles.videoGrid}>
          {videoLessons.map((lesson) => (
            <VideoLessonCard key={lesson.id} lesson={lesson} />
          ))}
        </View>
      ) : null}

      {otherLessons.map((lesson, index) => (
        <LessonRow key={lesson.id} lesson={lesson} isLast={index === otherLessons.length - 1} borderColor={borderColor} tint={tint} mutedColor={mutedColor} />
      ))}
    </Card>
  );
}

/** A thumbnail-style tile with a play button — visually distinct from a plain file/text row, since a video is watched, not opened like a document. */
function VideoLessonCard({ lesson }: { lesson: SubjectLesson }) {
  const thumbnail = videoThumbnailUrl(lesson.videoUrl!);

  return (
    <Pressable
      onPress={() => Linking.openURL(resolveApiUrl(lesson.videoUrl!))}
      style={({ pressed }) => [styles.videoCard, pressed && styles.pressed]}
    >
        <View style={styles.videoThumb}>
          <Image
            source={thumbnail ? { uri: thumbnail } : require('../assets/images/logo.png')}
            style={styles.videoThumbImage}
            resizeMode="cover"
          />
          <View style={styles.videoPlayButton}>
            <Ionicons name="play" size={16} color="#fff" />
          </View>
          {lesson.duration ? (
            <View style={styles.videoDurationBadge}>
              <Text style={styles.videoDurationText}>{lesson.duration}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.videoLessonTitle} numberOfLines={2}>{lesson.title}</Text>
    </Pressable>
  );
}

function videoThumbnailUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const videoId = parsed.hostname.includes('youtu.be')
      ? parsed.pathname.slice(1)
      : parsed.searchParams.get('v');
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
  } catch {
    return null;
  }
}

function LessonRow({
  lesson,
  isLast,
  borderColor,
  tint,
  mutedColor
}: {
  lesson: SubjectLesson;
  isLast: boolean;
  borderColor: string;
  tint: string;
  mutedColor: string;
}) {
  const url = lesson.fileUrl;
  const icon = lesson.fileUrl ? 'document-attach-outline' : 'reader-outline';

  const row = (
    <View style={[styles.lessonRow, !isLast && { borderBottomColor: borderColor, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <Ionicons name={icon} size={16} color={tint} />
      <View style={styles.lessonInfo}>
        <Text style={styles.lessonTitle} numberOfLines={1}>{lesson.title}</Text>
        {lesson.duration ? <Text style={[styles.cardMeta, { color: mutedColor }]}>{lesson.duration}</Text> : null}
      </View>
      {url ? <Ionicons name="open-outline" size={16} color={mutedColor} /> : null}
    </View>
  );

  if (!url) return row;

  return (
    <ExternalLink href={resolveApiUrl(url)} asChild>
      <Pressable>{row}</Pressable>
    </ExternalLink>
  );
}

/** One lesson per card, matching AssignmentCard/TopicCard's look on the standalone "Хичээл" category page — the shared-box-with-dividers treatment (LessonRow, still used nested inside a topic) reads as cramped as the only thing on a page. */
function LessonListItem({ lesson, accentColor, accentMuted }: { lesson: SubjectLesson; accentColor: string; accentMuted: string }) {
  const mutedColor = useThemeColor({}, 'muted');
  const url = lesson.fileUrl;
  const icon = lesson.fileUrl ? 'document-attach-outline' : 'reader-outline';

  const card = (
    <Card style={[styles.card, styles.lessonCard]}>
      <View style={[styles.lessonIconBubble, { backgroundColor: accentMuted }]}>
        <Ionicons name={icon} size={19} color={accentColor} />
      </View>
      <View style={styles.lessonCardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{lesson.title}</Text>
        {lesson.duration ? <Text style={[styles.cardMeta, { color: mutedColor }]}>{lesson.duration}</Text> : null}
      </View>
      {url ? <Ionicons name="open-outline" size={18} color={accentColor} /> : null}
    </Card>
  );

  if (!url) return card;

  return (
    <ExternalLink href={resolveApiUrl(url)} asChild>
      <Pressable style={({ pressed }) => pressed && styles.pressed}>{card}</Pressable>
    </ExternalLink>
  );
}

function AssignmentCard({ assignment }: { assignment: SubjectAssignment }) {
  const mutedColor = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle}>{assignment.title}</Text>
        {assignment.maxScore !== undefined ? (
          <Text style={[styles.maxScore, { color: tint }]}>{assignment.maxScore}</Text>
        ) : null}
      </View>
      {assignment.description ? <Text style={[styles.cardMeta, { color: mutedColor }]}>{assignment.description}</Text> : null}
      {assignment.type || assignment.dueDate ? (
        <Text style={[styles.cardMeta, { color: mutedColor }]}>
          {[assignment.type, assignment.dueDate].filter(Boolean).join(' · ')}
        </Text>
      ) : null}
    </Card>
  );
}

type Status = { type: 'idle' | 'success' | 'error'; message?: string };

function StatusLine({ status }: { status: Status }) {
  const successColor = useThemeColor({}, 'success');
  const dangerColor = useThemeColor({}, 'danger');
  if (status.type === 'idle') return null;
  return (
    <Text style={[styles.status, { color: status.type === 'error' ? dangerColor : successColor }]}>
      {status.message}
    </Text>
  );
}

function TopicPicker({ topics, value, onChange }: { topics: SubjectTopic[]; value: string; onChange: (id: string) => void }) {
  const { language } = useLanguage();
  const tint = useThemeColor({}, 'tint');
  const tintMuted = useThemeColor({}, 'tintMuted');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');

  return (
    <View style={styles.topicPicker}>
      {topics.map((topic) => {
        const selected = topic.id === value;
        return (
          <Pressable
            key={topic.id}
            onPress={() => onChange(topic.id)}
            style={[
              styles.topicChip,
              { borderColor: selected ? tint : borderColor, backgroundColor: selected ? tintMuted : 'transparent' }
            ]}
          >
            <Text style={{ color: selected ? tint : textColor, fontWeight: selected ? '700' : '500', fontSize: 13 }}>
              {translateValue(topic.title, language)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A label above a plain bordered input — matches the entry-form look used by attendance-entry.tsx/grade-entry.tsx/timetable-entry.tsx (label, then box), not an icon-in-box style. */
function FormField({
  label,
  placeholder,
  value,
  onChangeText,
  multiline,
  keyboardType,
  autoCapitalize
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric';
  autoCapitalize?: 'none' | 'sentences';
}) {
  const textColor = useThemeColor({}, 'text');
  const placeholderColor = useThemeColor({}, 'muted');
  const inputBg = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');

  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: placeholderColor }]}>{label}</Text>
      <TextInput
        style={[
          styles.plainInput,
          { color: textColor, backgroundColor: inputBg, borderColor },
          multiline && styles.plainInputMultiline
        ]}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        underlineColorAndroid="transparent"
      />
    </View>
  );
}

function SubmitButton({ onPress, loading, label, color }: { onPress: () => void; loading: boolean; label: string; color: string }) {
  return (
    <Pressable style={[styles.submit, { backgroundColor: color }, loading && styles.submitDisabled]} onPress={onPress} disabled={loading}>
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{label}</Text>}
    </Pressable>
  );
}

export type PanelProps = { subjectId: string; content: SubjectContent; onChange: (content: SubjectContent) => void };

export function FilePanel({ subjectId, content, onChange }: PanelProps) {
  const { t } = useLanguage();
  const placeholderColor = useThemeColor({}, 'muted');
  const accentColor = useThemeColor({}, 'pink');
  const [assets, setAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [title, setTitle] = useState('');
  const [topicId, setTopicId] = useState('');
  const [duration, setDuration] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>({ type: 'idle' });

  async function pickFiles() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setStatus({ type: 'error', message: t.mobileForms.photoPermissionDenied });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsMultipleSelection: true, quality: 0.8 });
    if (!result.canceled) setAssets(result.assets);
  }

  async function handleSubmit() {
    if (assets.length === 0) {
      setStatus({ type: 'error', message: t.subjectContent.chooseFileFirst });
      return;
    }
    setLoading(true);
    setStatus({ type: 'idle' });
    try {
      const formData = new FormData();
      for (const [index, asset] of assets.entries()) {
        const name = asset.fileName ?? `photo-${index + 1}.jpg`;
        // The RN-only `{ uri, name, type }` shorthand for FormData.append silently
        // produces an empty part on some runtimes (the server saw "No files were
        // uploaded" despite the picker returning an asset) — fetching the picked
        // asset's own uri back into a real Blob is slower but actually reliable,
        // and works the same way on native and web.
        const response = await fetch(asset.uri);
        const raw = await response.blob();
        const blob = raw.type ? raw : new Blob([raw], { type: asset.mimeType ?? 'image/jpeg' });
        formData.append('files', blob, name);
      }
      if (title) formData.append('title', title);
      if (topicId) formData.append('topicId', topicId);
      if (duration) formData.append('duration', duration);

      const updated = await api.uploadSubjectFile(subjectId, formData);
      onChange(updated);
      setStatus({ type: 'success', message: t.subjectContent.fileAdded });
      setAssets([]);
      setTitle('');
      setTopicId('');
      setDuration('');
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof ApiError ? err.message : t.mobileForms.saveFailed });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.panel}>
      <Pressable style={[styles.filePicker, { borderColor: placeholderColor }]} onPress={pickFiles}>
        <Ionicons name="images-outline" size={22} color={placeholderColor} />
        <Text style={{ color: placeholderColor, fontWeight: '600' }}>
          {assets.length > 0 ? t.subjectContent.filesSelected(assets.length) : t.subjectContent.chooseFile}
        </Text>
      </Pressable>

      {content.topics.length > 0 ? <TopicPicker topics={content.topics} value={topicId} onChange={setTopicId} /> : null}
      <FormField label={t.subjectContent.fieldLabels.name} placeholder={t.subjectContent.lessonTitlePlaceholder} value={title} onChangeText={setTitle} />
      <FormField label={t.subjectContent.fieldLabels.duration} placeholder={t.subjectContent.durationPlaceholder} value={duration} onChangeText={setDuration} />

      <SubmitButton onPress={handleSubmit} loading={loading} label={t.subjectContent.upload} color={accentColor} />
      <StatusLine status={status} />
    </View>
  );
}

export function TopicPanel({ subjectId, content, onChange }: PanelProps) {
  const { t } = useLanguage();
  const accentColor = useThemeColor({}, 'tint');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>({ type: 'idle' });

  async function handleSubmit() {
    if (!title.trim()) {
      setStatus({ type: 'error', message: t.subjectContent.fillRequiredFields });
      return;
    }
    setLoading(true);
    setStatus({ type: 'idle' });
    try {
      const topic: SubjectTopic = { id: `T-${Date.now()}`, title: title.trim(), description: description.trim() || undefined };
      const next: SubjectContent = { ...content, topics: [...content.topics, topic] };
      await api.saveSubjectContent(subjectId, next);
      onChange(next);
      setStatus({ type: 'success', message: t.subjectContent.topicAdded });
      setTitle('');
      setDescription('');
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof ApiError ? err.message : t.mobileForms.saveFailed });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.panel}>
      <FormField label={t.subjectContent.fieldLabels.name} placeholder={t.subjectContent.topicTitlePlaceholder} value={title} onChangeText={setTitle} />
      <FormField
        label={t.subjectContent.fieldLabels.description}
        placeholder={t.subjectContent.topicDescriptionPlaceholder}
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <SubmitButton onPress={handleSubmit} loading={loading} label={t.subjectContent.addTopicAction} color={accentColor} />
      <StatusLine status={status} />
    </View>
  );
}

export function LessonPanel({ subjectId, content, onChange }: PanelProps) {
  const { t } = useLanguage();
  const placeholderColor = useThemeColor({}, 'muted');
  const accentColor = useThemeColor({}, 'purple');
  // Defaults to the only/first topic — this panel only mounts while its
  // accordion section is open, so re-opening it re-runs this default against
  // the current topic list. Requiring an explicit tap when there is just one
  // topic is friction with no payoff.
  const [topicId, setTopicId] = useState(() => content.topics[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('');
  const [objectives, setObjectives] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>({ type: 'idle' });

  if (content.topics.length === 0) {
    return <Text style={[styles.emptyText, { color: placeholderColor }]}>{t.subjectContent.needsTopicFirst}</Text>;
  }

  async function handleSubmit() {
    if (!title.trim() || !topicId) {
      setStatus({ type: 'error', message: t.subjectContent.fillRequiredFields });
      return;
    }
    setLoading(true);
    setStatus({ type: 'idle' });
    try {
      const lesson: SubjectLesson = {
        id: `L-${Date.now()}`,
        title: title.trim(),
        topicId,
        duration: duration.trim() || undefined,
        objectives: objectives.split('\n').map((o) => o.trim()).filter(Boolean)
      };
      const next: SubjectContent = { ...content, lessons: [...content.lessons, lesson] };
      await api.saveSubjectContent(subjectId, next);
      onChange(next);
      setStatus({ type: 'success', message: t.subjectContent.lessonAdded });
      setTopicId('');
      setTitle('');
      setDuration('');
      setObjectives('');
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof ApiError ? err.message : t.mobileForms.saveFailed });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.panel}>
      <TopicPicker topics={content.topics} value={topicId} onChange={setTopicId} />
      <FormField label={t.subjectContent.fieldLabels.name} placeholder={t.subjectContent.lessonTitlePlaceholder} value={title} onChangeText={setTitle} />
      <FormField label={t.subjectContent.fieldLabels.duration} placeholder={t.subjectContent.durationPlaceholder} value={duration} onChangeText={setDuration} />
      <FormField
        label={t.subjectContent.fieldLabels.objectives}
        placeholder={t.subjectContent.objectivesPlaceholder}
        value={objectives}
        onChangeText={setObjectives}
        multiline
      />
      <SubmitButton onPress={handleSubmit} loading={loading} label={t.subjectContent.addLessonAction} color={accentColor} />
      <StatusLine status={status} />
    </View>
  );
}

export function VideoPanel({ subjectId, content, onChange }: PanelProps) {
  const { t } = useLanguage();
  const placeholderColor = useThemeColor({}, 'muted');
  const accentColor = useThemeColor({}, 'success');
  const [topicId, setTopicId] = useState(() => content.topics[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [duration, setDuration] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>({ type: 'idle' });

  if (content.topics.length === 0) {
    return <Text style={[styles.emptyText, { color: placeholderColor }]}>{t.subjectContent.needsTopicFirst}</Text>;
  }

  async function handleSubmit() {
    if (!title.trim() || !topicId || !videoUrl.trim()) {
      setStatus({ type: 'error', message: t.subjectContent.fillRequiredFields });
      return;
    }
    setLoading(true);
    setStatus({ type: 'idle' });
    try {
      const lesson: SubjectLesson = {
        id: `L-${Date.now()}`,
        title: title.trim(),
        topicId,
        duration: duration.trim() || undefined,
        videoUrl: videoUrl.trim()
      };
      const next: SubjectContent = { ...content, lessons: [...content.lessons, lesson] };
      await api.saveSubjectContent(subjectId, next);
      onChange(next);
      setStatus({ type: 'success', message: t.subjectContent.videoLessonAdded });
      setTopicId('');
      setTitle('');
      setVideoUrl('');
      setDuration('');
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof ApiError ? err.message : t.mobileForms.saveFailed });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.panel}>
      <TopicPicker topics={content.topics} value={topicId} onChange={setTopicId} />
      <FormField label={t.subjectContent.fieldLabels.name} placeholder={t.subjectContent.lessonTitlePlaceholder} value={title} onChangeText={setTitle} />
      <FormField label={t.subjectContent.fieldLabels.videoUrl} placeholder={t.subjectContent.videoUrlPlaceholder} value={videoUrl} onChangeText={setVideoUrl} autoCapitalize="none" />
      <FormField label={t.subjectContent.fieldLabels.duration} placeholder={t.subjectContent.durationPlaceholder} value={duration} onChangeText={setDuration} />
      <SubmitButton onPress={handleSubmit} loading={loading} label={t.subjectContent.addVideoLessonAction} color={accentColor} />
      <StatusLine status={status} />
    </View>
  );
}

export function AssignmentPanel({ subjectId, content, onChange }: PanelProps) {
  const { t } = useLanguage();
  const accentColor = useThemeColor({}, 'warning');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>({ type: 'idle' });

  async function handleSubmit() {
    if (!title.trim()) {
      setStatus({ type: 'error', message: t.subjectContent.fillRequiredFields });
      return;
    }
    setLoading(true);
    setStatus({ type: 'idle' });
    try {
      const parsedScore = Number(maxScore);
      const assignment: SubjectAssignment = {
        id: `A-${Date.now()}`,
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate.trim() || undefined,
        maxScore: maxScore.trim() && !Number.isNaN(parsedScore) ? parsedScore : undefined,
        type: type.trim() || undefined
      };
      const next: SubjectContent = { ...content, assignments: [...content.assignments, assignment] };
      await api.saveSubjectContent(subjectId, next);
      onChange(next);
      setStatus({ type: 'success', message: t.subjectContent.assignmentAdded });
      setTitle('');
      setDescription('');
      setDueDate('');
      setMaxScore('');
      setType('');
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof ApiError ? err.message : t.mobileForms.saveFailed });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.panel}>
      <FormField label={t.subjectContent.fieldLabels.name} placeholder={t.subjectContent.assignmentTitlePlaceholder} value={title} onChangeText={setTitle} />
      <FormField
        label={t.subjectContent.fieldLabels.description}
        placeholder={t.subjectContent.assignmentDescriptionPlaceholder}
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <FormField label={t.subjectContent.fieldLabels.dueDate} placeholder={t.subjectContent.dueDatePlaceholder} value={dueDate} onChangeText={setDueDate} />
      <FormField label={t.subjectContent.fieldLabels.maxScore} placeholder={t.subjectContent.maxScorePlaceholder} value={maxScore} onChangeText={setMaxScore} keyboardType="numeric" />
      <FormField label={t.subjectContent.fieldLabels.type} placeholder={t.subjectContent.assignmentTypePlaceholder} value={type} onChangeText={setType} />
      <SubmitButton onPress={handleSubmit} loading={loading} label={t.subjectContent.addAssignmentAction} color={accentColor} />
      <StatusLine status={status} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 40
  },
  loading: {
    marginTop: 40
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
    marginBottom: 9
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // Not a plain `gap` + fixed-width combo: with only 2 items per row, any
    // width under 50% leaves the leftover space (100% - 2×width) sitting
    // entirely after the second card, not split — a visibly lopsided right
    // margin. `space-between` with a `width` of exactly half instead pins
    // card 1 to the left edge and card 2 to the right edge, so both sides
    // match by construction; `rowGap` alone (not `gap`, which would also
    // add unwanted horizontal columnGap on top of the space-between) spaces
    // the two rows apart.
    justifyContent: 'space-between',
    rowGap: 10,
    padding: 10,
    borderRadius: 14
  },
  categoryCard: {
    width: '48%',
    minHeight: 118,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'space-between'
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '700'
  },
  categoryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8
  },
  categoryCount: {
    fontSize: 13,
    fontWeight: '600'
  },
  addContentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 13,
    backgroundColor: '#2563eb'
  },
  addContentButtonText: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '700'
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  emptyText: {
    fontSize: 14
  },
  emptyCard: {
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 26,
    paddingHorizontal: 20,
    marginBottom: 10
  },
  emptyIconBubble: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  emptyCardText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center'
  },
  card: {
    gap: 4,
    marginBottom: 10
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent'
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1
  },
  cardMeta: {
    fontSize: 13
  },
  maxScore: {
    fontSize: 16,
    fontWeight: '800'
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10
  },
  lessonInfo: {
    flex: 1,
    minWidth: 0,
    gap: 1,
    backgroundColor: 'transparent'
  },
  lessonTitle: {
    fontSize: 14,
    fontWeight: '600'
  },
  lessonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  lessonIconBubble: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  lessonCardInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    backgroundColor: 'transparent'
  },
  pressed: {
    opacity: 0.75
  },
  videoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
    width: '100%'
  },
  videoCard: {
    width: '48%',
    flexBasis: '48%',
    flexGrow: 0,
    flexShrink: 0,
    minWidth: 0,
    gap: 6
  },
  videoThumb: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.82)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  videoThumbImage: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
    opacity: 0.92
  },
  videoPlayButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 2
  },
  videoDurationBadge: {
    position: 'absolute',
    right: 5,
    bottom: 5,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2
  },
  videoDurationText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700'
  },
  videoLessonTitle: {
    fontSize: 13,
    fontWeight: '600'
  },
  accordion: {
    padding: 0,
    marginBottom: 10,
    overflow: 'hidden'
  },
  accordionDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(127,127,127,0.2)'
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 14
  },
  accordionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  accordionTitleGroup: {
    flex: 1,
    minWidth: 0,
    gap: 1,
    backgroundColor: 'transparent'
  },
  accordionTitle: {
    fontSize: 15,
    fontWeight: '700'
  },
  accordionSubtitle: {
    fontSize: 12
  },
  accordionBody: {
    paddingHorizontal: 14,
    paddingBottom: 16
  },
  panel: {
    gap: 10
  },
  topicPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  topicChip: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  fieldGroup: {
    marginBottom: 14
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6
  },
  plainInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 16,
    // RN Web only — without it, a focused <input>/<textarea> keeps the
    // browser's own default focus ring, which on this dark background
    // rendered as a stray black-boxed square around the field.
    outlineWidth: 0
  } as TextStyle,
  plainInputMultiline: {
    minHeight: 70,
    textAlignVertical: 'top'
  },
  filePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 18
  },
  submit: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    alignItems: 'center',
    borderRadius: 10
  },
  submitDisabled: {
    opacity: 0.6
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15
  },
  status: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center'
  }
});
