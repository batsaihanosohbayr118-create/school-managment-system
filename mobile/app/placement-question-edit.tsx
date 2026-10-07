import { useEffect, useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text, View, useThemeColor } from '@/components/Themed';
import { api } from '@/lib/api';
import { readCache } from '@/lib/api-cache';
import { useLanguage } from '@/lib/language-context';
import { ApiError } from '@shared/api-error';
import type { PlacementResponse } from '@shared/api-types';
import { ANSWER_LETTERS, CEFR_LEVELS, type AnswerLetter, type CefrLevel } from '@shared/placement';

/**
 * Adds a placement question, or edits one when opened with `?id=`. The
 * question is read from the 'placement' cache the list screen just filled,
 * so editing does not need its own fetch.
 */
export default function PlacementQuestionEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t } = useLanguage();
  const textColor = useThemeColor({}, 'text');
  const mutedColor = useThemeColor({}, 'muted');
  const inputBg = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const tintMuted = useThemeColor({}, 'tintMuted');
  const dangerColor = useThemeColor({}, 'danger');
  const successColor = useThemeColor({}, 'success');

  const [level, setLevel] = useState<CefrLevel>('A1');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [answer, setAnswer] = useState<AnswerLetter>('A');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    readCache<PlacementResponse>('placement').then((cached) => {
      const existing = cached?.questions.find((item) => item.id === id);
      if (!existing) return;
      setLevel((CEFR_LEVELS as readonly string[]).includes(existing.level) ? (existing.level as CefrLevel) : 'A1');
      setQuestion(existing.question);
      setOptions([0, 1, 2, 3].map((index) => existing.options[index] ?? ''));
      setAnswer((ANSWER_LETTERS as readonly string[]).includes(existing.answer ?? '') ? (existing.answer as AnswerLetter) : 'A');
    });
  }, [id]);

  const canSave = question.trim() !== '' && options.every((option) => option.trim() !== '');

  async function handleSave() {
    setError(null);
    setSubmitting(true);
    const body = { level, question: question.trim(), options: options.map((option) => option.trim()), answer };
    try {
      if (id) {
        await api.updatePlacementQuestion(id, body);
      } else {
        await api.createPlacementQuestion(body);
      }
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.mobileForms.saveFailed);
    } finally {
      setSubmitting(false);
    }
  }

  function confirmDelete() {
    if (!id) return;
    Alert.alert(t.placement.deleteQuestion, t.placement.deleteQuestionBody, [
      { text: t.placement.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deletePlacementQuestion(id);
            router.back();
          } catch {
            Alert.alert(t.common.deleteFailed);
          }
        }
      }
    ]);
  }

  const inputStyle = [styles.input, { color: textColor, backgroundColor: inputBg, borderColor }];
  const title = id ? t.placement.editQuestion : t.placement.addQuestion;

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
        <Stack.Screen options={{ title }} />
        <Text style={styles.title}>{title}</Text>

        <Text style={[styles.label, { color: mutedColor }]}>{t.placement.level}</Text>
        <View style={styles.chipRow}>
          {CEFR_LEVELS.map((item) => (
            <Pressable
              key={item}
              onPress={() => setLevel(item)}
              style={[styles.chip, { borderColor: level === item ? tint : borderColor, backgroundColor: level === item ? tint : 'transparent' }]}
            >
              <Text style={[styles.chipText, { color: level === item ? '#fff' : textColor }]}>{item}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { color: mutedColor }]}>{t.placement.question}</Text>
        <TextInput
          style={[inputStyle, styles.multiline]}
          placeholderTextColor={mutedColor}
          placeholder="She ___ a student."
          value={question}
          onChangeText={setQuestion}
          editable={!submitting}
          multiline
        />

        <Text style={[styles.label, { color: mutedColor }]}>
          {t.placement.options} · {t.placement.correctAnswer}
        </Text>
        {ANSWER_LETTERS.map((letter, index) => {
          const isAnswer = answer === letter;

          return (
            <View key={letter} style={styles.optionRow}>
              <Pressable
                onPress={() => setAnswer(letter)}
                accessibilityLabel={`${t.placement.correctAnswer} ${letter}`}
                style={[styles.optionLetter, { backgroundColor: isAnswer ? successColor : tintMuted }]}
              >
                {isAnswer ? (
                  <Ionicons name="checkmark" size={18} color="#fff" />
                ) : (
                  <Text style={[styles.optionLetterText, { color: tint }]}>{letter}</Text>
                )}
              </Pressable>
              <TextInput
                style={[inputStyle, styles.optionInput, isAnswer && { borderColor: successColor }]}
                placeholderTextColor={mutedColor}
                placeholder={letter}
                value={options[index]}
                onChangeText={(value) => setOptions((current) => current.map((option, i) => (i === index ? value : option)))}
                editable={!submitting}
              />
            </View>
          );
        })}

        {error ? <Text style={[styles.error, { color: dangerColor }]}>{error}</Text> : null}

        <Pressable
          style={[styles.submit, { backgroundColor: tint }, (submitting || !canSave) && styles.submitDisabled]}
          onPress={handleSave}
          disabled={submitting || !canSave}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{t.mobileForms.save}</Text>}
        </Pressable>

        {id ? (
          <Pressable style={styles.deleteButton} onPress={confirmDelete} disabled={submitting}>
            <Ionicons name="trash-outline" size={17} color={dangerColor} />
            <Text style={[styles.deleteText, { color: dangerColor }]}>{t.placement.deleteQuestion}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    padding: 20,
    paddingBottom: 48,
    gap: 6
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 14
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    backgroundColor: 'transparent'
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5
  },
  chipText: {
    fontWeight: '800',
    fontSize: 15
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 16,
    marginTop: 4
  },
  multiline: {
    minHeight: 72,
    textAlignVertical: 'top'
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    backgroundColor: 'transparent'
  },
  optionLetter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4
  },
  optionLetterText: {
    fontWeight: '800',
    fontSize: 15
  },
  optionInput: {
    flex: 1
  },
  error: {
    marginTop: 16
  },
  submit: {
    marginTop: 24,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3
  },
  submitDisabled: {
    opacity: 0.5
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16
  },
  deleteButton: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10
  },
  deleteText: {
    fontWeight: '700',
    fontSize: 15
  }
});
