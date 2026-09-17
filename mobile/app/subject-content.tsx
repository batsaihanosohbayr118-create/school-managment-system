import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/Card';
import { ExternalLink } from '@/components/ExternalLink';
import { Text, View, useThemeColor } from '@/components/Themed';
import { api, resolveApiUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { ApiError } from '@shared/api-error';
import { translateValue } from '@shared/i18n-tables';
import type { SubjectAssignment, SubjectContent, SubjectLesson, SubjectTopic } from '@shared/api-types';

function emptyContent(subjectId: string): SubjectContent {
  return { subjectId, topics: [], lessons: [], assignments: [] };
}

export default function SubjectContentScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const subjectId = id ?? '';
  const { session } = useAuth();
  const { t } = useLanguage();
  const isTeacher = session?.role === 'teacher';
  const mutedColor = useThemeColor({}, 'muted');
  const dangerColor = useThemeColor({}, 'danger');
  const tint = useThemeColor({}, 'tint');

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

  const lessonsByTopic = new Map<string, SubjectLesson[]>();
  for (const lesson of content.lessons) {
    const list = lessonsByTopic.get(lesson.topicId) ?? [];
    list.push(lesson);
    lessonsByTopic.set(lesson.topicId, list);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: name || t.nav.subjects.label }} />

      {loading ? (
        <ActivityIndicator color={tint} style={styles.loading} />
      ) : error ? (
        <Text style={{ color: dangerColor }}>{error}</Text>
      ) : (
        <>
          <SectionHeader icon="list-outline" label={t.subjectContent.topics} />
          {content.topics.length === 0 ? (
            <Text style={[styles.emptyText, { color: mutedColor }]}>{t.subjectContent.noTopicsYet}</Text>
          ) : (
            content.topics.map((topic) => (
              <TopicCard key={topic.id} topic={topic} lessons={lessonsByTopic.get(topic.id) ?? []} />
            ))
          )}

          <SectionHeader icon="clipboard-outline" label={t.subjectContent.assignments} />
          {content.assignments.length === 0 ? (
            <Text style={[styles.emptyText, { color: mutedColor }]}>{t.subjectContent.noAssignmentsYet}</Text>
          ) : (
            content.assignments.map((assignment) => <AssignmentCard key={assignment.id} assignment={assignment} />)
          )}

          {isTeacher ? (
            <>
              <SectionHeader icon="add-circle-outline" label={t.subjectContent.addContent} />
              <AddContentAccordion subjectId={subjectId} content={content} onChange={setContent} />
            </>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

function SectionHeader({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const mutedColor = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={14} color={tint} />
      <Text style={[styles.sectionTitle, { color: mutedColor }]}>{label}</Text>
    </View>
  );
}

function TopicCard({ topic, lessons }: { topic: SubjectTopic; lessons: SubjectLesson[] }) {
  const { language } = useLanguage();
  const mutedColor = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  const borderColor = useThemeColor({}, 'border');

  return (
    <Card style={styles.card}>
      <Text style={styles.cardTitle}>{translateValue(topic.title, language)}</Text>
      {topic.description ? <Text style={[styles.cardMeta, { color: mutedColor }]}>{translateValue(topic.description, language)}</Text> : null}

      {lessons.map((lesson, index) => (
        <LessonRow key={lesson.id} lesson={lesson} isLast={index === lessons.length - 1} borderColor={borderColor} tint={tint} mutedColor={mutedColor} />
      ))}
    </Card>
  );
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
  const url = lesson.fileUrl || lesson.videoUrl;
  const icon = lesson.videoUrl ? 'videocam-outline' : lesson.fileUrl ? 'document-attach-outline' : 'reader-outline';

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

function useFieldStyle() {
  const textColor = useThemeColor({}, 'text');
  const placeholderColor = useThemeColor({}, 'muted');
  const inputBg = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'border');
  return { style: [styles.input, { color: textColor, backgroundColor: inputBg, borderColor }], placeholderColor };
}

function SubmitButton({ onPress, loading, label }: { onPress: () => void; loading: boolean; label: string }) {
  const tint = useThemeColor({}, 'tint');
  return (
    <Pressable style={[styles.submit, { backgroundColor: tint }, loading && styles.submitDisabled]} onPress={onPress} disabled={loading}>
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{label}</Text>}
    </Pressable>
  );
}

type PanelId = 'file' | 'topic' | 'lesson' | 'video' | 'assignment';

function AddContentAccordion({
  subjectId,
  content,
  onChange
}: {
  subjectId: string;
  content: SubjectContent;
  onChange: (content: SubjectContent) => void;
}) {
  const { t } = useLanguage();
  const [openId, setOpenId] = useState<PanelId | null>('file');
  const toggle = (id: PanelId) => setOpenId((current) => (current === id ? null : id));
  const tint = useThemeColor({}, 'tint');
  const tintMuted = useThemeColor({}, 'tintMuted');
  const mutedColor = useThemeColor({}, 'muted');

  const sections: { id: PanelId; icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }[] = [
    { id: 'file', icon: 'cloud-upload-outline', ...t.subjectContent.sections.file },
    { id: 'topic', icon: 'list-outline', ...t.subjectContent.sections.topic },
    { id: 'lesson', icon: 'book-outline', ...t.subjectContent.sections.lesson },
    { id: 'video', icon: 'videocam-outline', ...t.subjectContent.sections.video },
    { id: 'assignment', icon: 'clipboard-outline', ...t.subjectContent.sections.assignment }
  ];

  return (
    <Card style={styles.accordion}>
      {sections.map((section, index) => {
        const isOpen = openId === section.id;
        return (
          <View key={section.id} style={index > 0 ? styles.accordionDivider : undefined}>
            <Pressable style={styles.accordionHeader} onPress={() => toggle(section.id)}>
              <View style={[styles.accordionIcon, { backgroundColor: isOpen ? tint : tintMuted }]}>
                <Ionicons name={section.icon} size={17} color={isOpen ? '#fff' : tint} />
              </View>
              <View style={styles.accordionTitleGroup}>
                <Text style={styles.accordionTitle}>{section.title}</Text>
                <Text style={[styles.accordionSubtitle, { color: mutedColor }]} numberOfLines={1}>{section.subtitle}</Text>
              </View>
              <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={mutedColor} />
            </Pressable>
            {isOpen ? (
              <View style={styles.accordionBody}>
                {section.id === 'file' && <FilePanel subjectId={subjectId} content={content} onChange={onChange} />}
                {section.id === 'topic' && <TopicPanel subjectId={subjectId} content={content} onChange={onChange} />}
                {section.id === 'lesson' && <LessonPanel subjectId={subjectId} content={content} onChange={onChange} />}
                {section.id === 'video' && <VideoPanel subjectId={subjectId} content={content} onChange={onChange} />}
                {section.id === 'assignment' && <AssignmentPanel subjectId={subjectId} content={content} onChange={onChange} />}
              </View>
            ) : null}
          </View>
        );
      })}
    </Card>
  );
}

type PanelProps = { subjectId: string; content: SubjectContent; onChange: (content: SubjectContent) => void };

function FilePanel({ subjectId, content, onChange }: PanelProps) {
  const { t } = useLanguage();
  const { style: fieldStyle, placeholderColor } = useFieldStyle();
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
      assets.forEach((asset, index) => {
        const name = asset.fileName ?? `photo-${index + 1}.jpg`;
        // React Native's FormData accepts this { uri, name, type } shape in place of a Blob.
        formData.append('files', { uri: asset.uri, name, type: asset.mimeType ?? 'image/jpeg' } as unknown as Blob);
      });
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
      <TextInput style={fieldStyle} placeholder={t.subjectContent.lessonTitlePlaceholder} placeholderTextColor={placeholderColor} value={title} onChangeText={setTitle} />
      <TextInput style={fieldStyle} placeholder={t.subjectContent.durationPlaceholder} placeholderTextColor={placeholderColor} value={duration} onChangeText={setDuration} />

      <SubmitButton onPress={handleSubmit} loading={loading} label={t.subjectContent.upload} />
      <StatusLine status={status} />
    </View>
  );
}

function TopicPanel({ subjectId, content, onChange }: PanelProps) {
  const { t } = useLanguage();
  const { style: fieldStyle, placeholderColor } = useFieldStyle();
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
      <TextInput style={fieldStyle} placeholder={t.subjectContent.topicTitlePlaceholder} placeholderTextColor={placeholderColor} value={title} onChangeText={setTitle} />
      <TextInput
        style={[fieldStyle, styles.multiline]}
        placeholder={t.subjectContent.topicDescriptionPlaceholder}
        placeholderTextColor={placeholderColor}
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <SubmitButton onPress={handleSubmit} loading={loading} label={t.subjectContent.addTopicAction} />
      <StatusLine status={status} />
    </View>
  );
}

function LessonPanel({ subjectId, content, onChange }: PanelProps) {
  const { t } = useLanguage();
  const { style: fieldStyle, placeholderColor } = useFieldStyle();
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
      <TextInput style={fieldStyle} placeholder={t.subjectContent.lessonTitlePlaceholder} placeholderTextColor={placeholderColor} value={title} onChangeText={setTitle} />
      <TextInput style={fieldStyle} placeholder={t.subjectContent.durationPlaceholder} placeholderTextColor={placeholderColor} value={duration} onChangeText={setDuration} />
      <TextInput
        style={[fieldStyle, styles.multiline]}
        placeholder={t.subjectContent.objectivesPlaceholder}
        placeholderTextColor={placeholderColor}
        value={objectives}
        onChangeText={setObjectives}
        multiline
      />
      <SubmitButton onPress={handleSubmit} loading={loading} label={t.subjectContent.addLessonAction} />
      <StatusLine status={status} />
    </View>
  );
}

function VideoPanel({ subjectId, content, onChange }: PanelProps) {
  const { t } = useLanguage();
  const { style: fieldStyle, placeholderColor } = useFieldStyle();
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
      <TextInput style={fieldStyle} placeholder={t.subjectContent.lessonTitlePlaceholder} placeholderTextColor={placeholderColor} value={title} onChangeText={setTitle} />
      <TextInput style={fieldStyle} placeholder={t.subjectContent.videoUrlPlaceholder} placeholderTextColor={placeholderColor} value={videoUrl} onChangeText={setVideoUrl} autoCapitalize="none" />
      <TextInput style={fieldStyle} placeholder={t.subjectContent.durationPlaceholder} placeholderTextColor={placeholderColor} value={duration} onChangeText={setDuration} />
      <SubmitButton onPress={handleSubmit} loading={loading} label={t.subjectContent.addVideoLessonAction} />
      <StatusLine status={status} />
    </View>
  );
}

function AssignmentPanel({ subjectId, content, onChange }: PanelProps) {
  const { t } = useLanguage();
  const { style: fieldStyle, placeholderColor } = useFieldStyle();
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
      <TextInput style={fieldStyle} placeholder={t.subjectContent.assignmentTitlePlaceholder} placeholderTextColor={placeholderColor} value={title} onChangeText={setTitle} />
      <TextInput
        style={[fieldStyle, styles.multiline]}
        placeholder={t.subjectContent.assignmentDescriptionPlaceholder}
        placeholderTextColor={placeholderColor}
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <TextInput style={fieldStyle} placeholder={t.subjectContent.dueDatePlaceholder} placeholderTextColor={placeholderColor} value={dueDate} onChangeText={setDueDate} />
      <TextInput style={fieldStyle} placeholder={t.subjectContent.maxScorePlaceholder} placeholderTextColor={placeholderColor} value={maxScore} onChangeText={setMaxScore} keyboardType="numeric" />
      <TextInput style={fieldStyle} placeholder={t.subjectContent.assignmentTypePlaceholder} placeholderTextColor={placeholderColor} value={type} onChangeText={setType} />
      <SubmitButton onPress={handleSubmit} loading={loading} label={t.subjectContent.addAssignmentAction} />
      <StatusLine status={status} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    padding: 16,
    paddingBottom: 48
  },
  loading: {
    marginTop: 40
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 22,
    marginBottom: 10
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
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15
  },
  multiline: {
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
