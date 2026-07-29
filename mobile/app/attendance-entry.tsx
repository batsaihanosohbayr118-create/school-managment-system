import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';

import { Text, View, useThemeColor } from '@/components/Themed';
import { api } from '@/lib/api';
import { ApiError } from '@shared/api-error';

const STATUSES = ['Present', 'Absent', 'Late'] as const;

export default function AttendanceEntryScreen() {
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
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('Present');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await api.postAttendance({ student: student.trim(), subject: subject.trim(), date, status });
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save attendance.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = [styles.input, { color: textColor, backgroundColor: inputBg, borderColor }];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Take attendance</Text>

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

      <Text style={[styles.label, { color: placeholderColor }]}>Date (YYYY-MM-DD)</Text>
      <TextInput
        style={inputStyle}
        placeholderTextColor={placeholderColor}
        value={date}
        onChangeText={setDate}
        editable={!submitting}
      />

      <Text style={[styles.label, { color: placeholderColor }]}>Status</Text>
      <View style={styles.statusRow}>
        {STATUSES.map((option) => {
          const active = status === option;
          return (
            <Pressable
              key={option}
              style={[styles.statusOption, { borderColor: active ? tint : borderColor, backgroundColor: active ? tint : 'transparent' }]}
              onPress={() => setStatus(option)}
              disabled={submitting}
            >
              <Text style={[styles.statusText, active && styles.statusTextActive]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <Text style={[styles.error, { color: dangerColor }]}>{error}</Text> : null}

      <Pressable
        style={[styles.submit, { backgroundColor: tint }, (submitting || !student || !status) && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={submitting || !student || !status}
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
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6
  },
  statusOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center'
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700'
  },
  statusTextActive: {
    color: '#fff'
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
