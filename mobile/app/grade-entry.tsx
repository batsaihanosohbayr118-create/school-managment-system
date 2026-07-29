import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';

import { Text, View, useThemeColor } from '@/components/Themed';
import { api } from '@/lib/api';
import { ApiError } from '@shared/api-error';

export default function GradeEntryScreen() {
  const router = useRouter();
  // TextInput isn't a Themed component, so it doesn't pick up dark mode's
  // colors on its own — typed text was invisible (black on black) before.
  const textColor = useThemeColor({}, 'text');
  const placeholderColor = useThemeColor({}, 'muted');
  const inputBg = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const dangerColor = useThemeColor({}, 'danger');

  const [student, setStudent] = useState('');
  const [subject, setSubject] = useState('');
  const [score, setScore] = useState('');
  const [semester, setSemester] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await api.postGrade({ student: student.trim(), subject: subject.trim(), score: score.trim(), semester: semester.trim() });
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the grade.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = [styles.input, { color: textColor, backgroundColor: inputBg, borderColor }];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter grade</Text>

      <Text style={[styles.label, { color: placeholderColor }]}>Student</Text>
      <TextInput
        style={inputStyle}
        placeholderTextColor={placeholderColor}
        value={student}
        onChangeText={setStudent}
        editable={!submitting}
        autoFocus
      />

      <Text style={[styles.label, { color: placeholderColor }]}>Subject</Text>
      <TextInput
        style={inputStyle}
        placeholderTextColor={placeholderColor}
        value={subject}
        onChangeText={setSubject}
        editable={!submitting}
      />

      <Text style={[styles.label, { color: placeholderColor }]}>Score</Text>
      <TextInput
        style={inputStyle}
        placeholderTextColor={placeholderColor}
        value={score}
        onChangeText={setScore}
        editable={!submitting}
        keyboardType="numeric"
      />

      <Text style={[styles.label, { color: placeholderColor }]}>Semester</Text>
      <TextInput
        style={inputStyle}
        placeholderTextColor={placeholderColor}
        value={semester}
        onChangeText={setSemester}
        editable={!submitting}
      />

      {error ? <Text style={[styles.error, { color: dangerColor }]}>{error}</Text> : null}

      <Pressable
        style={[styles.submit, { backgroundColor: tint }, (submitting || !student || !score) && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={submitting || !student || !score}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Save</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
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
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 16,
    marginTop: 4
  },
  error: {
    marginTop: 16
  },
  submit: {
    marginTop: 24,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 10
  },
  submitDisabled: {
    opacity: 0.5
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16
  }
});
