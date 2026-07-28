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
  // text color on its own — typed text was invisible (black on black).
  const textColor = useThemeColor({}, 'text');
  const placeholderColor = useThemeColor({}, 'tabIconDefault');
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Take attendance</Text>

      <Text style={styles.label}>Student</Text>
      <TextInput
        style={[styles.input, { color: textColor }]}
        placeholderTextColor={placeholderColor}
        value={student}
        onChangeText={setStudent}
        editable={!submitting}
        autoFocus
      />

      <Text style={styles.label}>Subject</Text>
      <TextInput
        style={[styles.input, { color: textColor }]}
        placeholderTextColor={placeholderColor}
        value={subject}
        onChangeText={setSubject}
        editable={!submitting}
      />

      <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
      <TextInput
        style={[styles.input, { color: textColor }]}
        placeholderTextColor={placeholderColor}
        value={date}
        onChangeText={setDate}
        editable={!submitting}
      />

      <Text style={styles.label}>Status</Text>
      <View style={styles.statusRow}>
        {STATUSES.map((option) => (
          <Pressable
            key={option}
            style={[styles.statusOption, status === option && styles.statusOptionActive]}
            onPress={() => setStatus(option)}
            disabled={submitting}
          >
            <Text style={[styles.statusText, status === option && styles.statusTextActive]}>{option}</Text>
          </Pressable>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.submit, (submitting || !student || !status) && styles.submitDisabled]}
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
    fontWeight: 'bold',
    marginBottom: 12
  },
  label: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 12
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8888',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6
  },
  statusOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8888',
    alignItems: 'center'
  },
  statusOptionActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb'
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600'
  },
  statusTextActive: {
    color: '#fff'
  },
  error: {
    color: '#dc2626',
    marginTop: 16
  },
  submit: {
    marginTop: 24,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 8
  },
  submitDisabled: {
    opacity: 0.5
  },
  submitText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16
  }
});
