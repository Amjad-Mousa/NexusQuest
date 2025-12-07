import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Switch, FlatList } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import quizService from '../services/quizService';
import { QuizDifficulty, QuizLanguage, TestCase } from '../types/quiz';

const defaultTestCase = { input: '', expectedOutput: '', isHidden: false };

const CreateQuizScreen = ({ navigation, route }: any) => {
  const { theme, colors } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(10);
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('easy');
  const [language, setLanguage] = useState<QuizLanguage>('python');
  const [starterCode, setStarterCode] = useState('');
  const [solution, setSolution] = useState('');
  const [showSolution, setShowSolution] = useState(false);
  const [testCases, setTestCases] = useState<TestCase[]>([defaultTestCase]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [duration, setDuration] = useState(30);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // TODO: Add student assignment logic if needed

  const handleAddTestCase = () => {
    setTestCases([...testCases, { ...defaultTestCase }]);
  };

  const handleRemoveTestCase = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const handleTestCaseChange = (index: number, field: keyof TestCase, value: string | boolean) => {
    const updated = [...testCases];
    updated[index] = { ...updated[index], [field]: value };
    setTestCases(updated);
  };

  const handleSubmit = async () => {
    setError('');
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }
    if (testCases.length === 0) {
      setError('At least one test case is required.');
      return;
    }
    setSaving(true);
    try {
      // Prepare payload
      const now = new Date();
      const start = startTime ? new Date(startTime) : new Date(now.getTime() + 60 * 60 * 1000);
      const end = endTime ? new Date(endTime) : new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const payload = {
        title,
        description,
        points,
        difficulty,
        language,
        starterCode,
        solution,
        testCases,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        duration,
        assignedTo: [], // TODO: add assignment UI if needed
      };
      await quizService.createQuiz(payload);
      setSaving(false);
      navigation.goBack();
    } catch (e: any) {
      setError(e.message || 'Failed to create quiz.');
      setSaving(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background, padding: 16 }}>
      <Text style={[styles.label, { color: colors.text }]}>Title</Text>
      <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border }]}
        value={title} onChangeText={setTitle} placeholder="Quiz title" placeholderTextColor={colors.border} />

      <Text style={[styles.label, { color: colors.text }]}>Description</Text>
      <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, minHeight: 60 }]} multiline
        value={description} onChangeText={setDescription} placeholder="Describe the quiz..." placeholderTextColor={colors.border} />

      <Text style={[styles.label, { color: colors.text }]}>Points</Text>
      <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border }]} keyboardType="numeric"
        value={points.toString()} onChangeText={v => setPoints(Number(v))} />

      <Text style={[styles.label, { color: colors.text }]}>Difficulty</Text>
      <View style={styles.row}>
        {(['easy', 'medium', 'hard'] as QuizDifficulty[]).map(d => (
          <TouchableOpacity key={d} style={[styles.chip, difficulty === d && { backgroundColor: colors.primary }]}
            onPress={() => setDifficulty(d)}>
            <Text style={{ color: difficulty === d ? '#fff' : colors.text }}>{d.charAt(0).toUpperCase() + d.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.text }]}>Language</Text>
      <View style={styles.row}>
        {(['python', 'javascript', 'java', 'cpp'] as QuizLanguage[]).map(l => (
          <TouchableOpacity key={l} style={[styles.chip, language === l && { backgroundColor: colors.primary }]}
            onPress={() => setLanguage(l)}>
            <Text style={{ color: language === l ? '#fff' : colors.text }}>{l.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.text }]}>Starter Code (optional)</Text>
      <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, minHeight: 60, fontFamily: 'monospace' }]} multiline
        value={starterCode} onChangeText={setStarterCode} placeholder="# Starter code for the quiz..." placeholderTextColor={colors.border} />

      <View style={styles.rowBetween}>
        <Text style={[styles.label, { color: colors.text }]}>Correct Solution</Text>
        <Switch value={showSolution} onValueChange={setShowSolution} />
      </View>
      {showSolution && (
        <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, minHeight: 80, fontFamily: 'monospace' }]} multiline
          value={solution} onChangeText={setSolution} placeholder="# Write the correct solution here..." placeholderTextColor={colors.border} />
      )}

      <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>Test Cases</Text>
      <FlatList
        data={testCases}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item, index }) => (
          <View style={[styles.testCaseBox, { borderColor: colors.border }]}>
            <Text style={{ color: colors.text }}>Test #{index + 1}</Text>
            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, minHeight: 40, fontFamily: 'monospace' }]} multiline
              value={item.input} onChangeText={v => handleTestCaseChange(index, 'input', v)} placeholder="Input (stdin)" placeholderTextColor={colors.border} />
            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, minHeight: 40, fontFamily: 'monospace' }]} multiline
              value={item.expectedOutput} onChangeText={v => handleTestCaseChange(index, 'expectedOutput', v)} placeholder="Expected Output" placeholderTextColor={colors.border} />
            <View style={styles.rowBetween}>
              <Text style={{ color: colors.text }}>Hidden</Text>
              <Switch value={item.isHidden} onValueChange={v => handleTestCaseChange(index, 'isHidden', v)} />
              <TouchableOpacity onPress={() => handleRemoveTestCase(index)}>
                <Text style={{ color: 'red' }}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListFooterComponent={
          <TouchableOpacity onPress={handleAddTestCase} style={[styles.addBtn, { borderColor: colors.primary }]}>
            <Text style={{ color: colors.primary }}>+ Add Test Case</Text>
          </TouchableOpacity>
        }
      />

      {/* TODO: Add schedule and assignment UI if needed */}

      {error ? <Text style={{ color: 'red', marginVertical: 8 }}>{error}</Text> : null}
      <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSubmit} disabled={saving}>
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>{saving ? 'Saving...' : 'Create Quiz'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  label: { fontWeight: 'bold', marginTop: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 8, padding: 8, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  chip: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 16, marginRight: 8, backgroundColor: '#eee' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  testCaseBox: { borderWidth: 1, borderRadius: 8, padding: 8, marginBottom: 12 },
  addBtn: { borderWidth: 1, borderRadius: 8, padding: 10, alignItems: 'center', marginBottom: 16 },
  saveBtn: { borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 16 },
});

export default CreateQuizScreen;
