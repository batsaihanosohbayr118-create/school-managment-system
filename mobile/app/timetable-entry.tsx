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
  const placeholderColor = useThemeColor({}, 'muted');
  const inputBg = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const dangerColor = useThemeColor({}, 'danger');

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

  const inputStyle = [styles.input, { color: textColor, backgroundColor: inputBg, borderColor }];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add timetable slot</Text>

      <Text style={[styles.label, { color: placeholderColor }]}>Subject</Text>
      <TextInput style={inputStyle} placeholderTextColor={placeholderColor} value={subject} onChangeText={setSubject} editable={!submitting} autoFocus />

      <Text style={[styles.label, { color: placeholderColor }]}>Day</Text>
      <TextInput
        style={inputStyle}
        placeholder="e.g. Monday"
        placeholderTextColor={placeholderColor}
        value={day}
        onChangeText={setDay}
        editable={!submitting}
      />

      <Text style={[styles.label, { color: placeholderColor }]}>Time</Text>
      <TextInput
        style={inputStyle}
        placeholder="e.g. 09:00-09:45"
        placeholderTextColor={placeholderColor}
        value={time}
        onChangeText={setTime}
        editable={!submitting}
      />

      <Text style={[styles.label, { color: placeholderColor }]}>Class</Text>
      <TextInput
        style={inputStyle}
        placeholder="e.g. Grade 8A"
        placeholderTextColor={placeholderColor}
        value={className}
        onChangeText={setClassName}
        editable={!submitting}
      />

      <Text style={[styles.label, { color: placeholderColor }]}>Teacher</Text>
      <TextInput style={inputStyle} placeholderTextColor={placeholderColor} value={teacher} onChangeText={setTeacher} editable={!submitting} />

      {error ? <Text style={[styles.error, { color: dangerColor }]}>{error}</Text> : null}

      <Pressable
        style={[styles.submit, { backgroundColor: tint }, (submitting || !subject || !day || !time) && styles.submitDisabled]}
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
