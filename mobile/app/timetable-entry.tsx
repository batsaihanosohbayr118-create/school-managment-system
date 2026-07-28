import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';

import { Text, View, useThemeColor } from '@/components/Themed';
import { api } from '@/lib/api';
import { ApiError } from '@shared/api-error';

export default function TimetableEntryScreen() {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [teacher, setTeacher] = useState('');
  const [className, setClassName] = useState('');
  const [day, setDay] = useState('');
  const [time, setTime] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const textColor = useThemeColor({}, 'text');
  const placeholderColor = useThemeColor({}, 'tabIconDefault');

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await api.postTimetable({
        subject: subject.trim(),
        teacher: teacher.trim(),
        class: className.trim(),
        day: day.trim(),
        time: time.trim()
      });
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the timetable slot.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add timetable slot</Text>

      <Text style={styles.label}>Subject</Text>
      <TextInput
        style={[styles.input, { color: textColor }]}
        placeholderTextColor={placeholderColor}
        value={subject}
        onChangeText={setSubject}
        editable={!submitting}
        autoFocus
      />

      <Text style={styles.label}>Day</Text>
      <TextInput
        style={[styles.input, { color: textColor }]}
        placeholder="e.g. Monday"
        placeholderTextColor={placeholderColor}
        value={day}
        onChangeText={setDay}
        editable={!submitting}
      />

      <Text style={styles.label}>Time</Text>
      <TextInput
        style={[styles.input, { color: textColor }]}
        placeholder="e.g. 09:00-09:45"
        placeholderTextColor={placeholderColor}
        value={time}
        onChangeText={setTime}
        editable={!submitting}
      />

      <Text style={styles.label}>Class</Text>
      <TextInput
        style={[styles.input, { color: textColor }]}
        placeholder="e.g. Grade 8A"
        placeholderTextColor={placeholderColor}
        value={className}
        onChangeText={setClassName}
        editable={!submitting}
      />

      <Text style={styles.label}>Teacher</Text>
      <TextInput
        style={[styles.input, { color: textColor }]}
        placeholderTextColor={placeholderColor}
        value={teacher}
        onChangeText={setTeacher}
        editable={!submitting}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.submit, (submitting || !subject || !day || !time) && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={submitting || !subject || !day || !time}
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
