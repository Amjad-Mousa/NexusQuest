import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

type TaskDifficulty = 'easy' | 'medium' | 'hard';
type TaskLanguage = 'python' | 'javascript' | 'java' | 'cpp';

interface TestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

export default function CreateTaskScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { task } = route.params || {};
  const isEditing = !!task;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState('10');
  const [difficulty, setDifficulty] = useState<TaskDifficulty>('easy');
  const [language, setLanguage] = useState<TaskLanguage>('python');
  const [starterCode, setStarterCode] = useState('');
  const [solution, setSolution] = useState('');
  const [testCases, setTestCases] = useState<TestCase[]>([
    { input: '', expectedOutput: '', isHidden: false },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setPoints(String(task.points || 10));
      setDifficulty(task.difficulty || 'easy');
      setLanguage(task.language || 'python');
      setStarterCode(task.starterCode || '');
      setSolution(task.solution || '');
      setTestCases(task.testCases || [{ input: '', expectedOutput: '', isHidden: false }]);
    }
  }, [task]);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Error', 'Please fill in title and description');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title,
        description,
        points: parseInt(points) || 10,
        difficulty,
        language,
        starterCode,
        solution,
        testCases: testCases.filter(tc => tc.input || tc.expectedOutput),
      };

      if (isEditing) {
        await api.put(`/api/tasks/${task._id}`, payload);
        Alert.alert('Success', 'Task updated successfully');
      } else {
        await api.post('/api/tasks', payload);
        Alert.alert('Success', 'Task created successfully');
      }
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const addTestCase = () => {
    setTestCases([...testCases, { input: '', expectedOutput: '', isHidden: false }]);
  };

  const removeTestCase = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const updateTestCase = (index: number, field: keyof TestCase, value: any) => {
    const updated = [...testCases];
    updated[index] = { ...updated[index], [field]: value };
    setTestCases(updated);
  };

  const styles = getStyles(colors);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Task' : 'Create Task'}</Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={saving}
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View style={styles.field}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Task title"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the task..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Points, Difficulty, Language */}
        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Points</Text>
            <TextInput
              style={styles.input}
              value={points}
              onChangeText={setPoints}
              placeholder="10"
              keyboardType="numeric"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Difficulty</Text>
            <View style={styles.pickerRow}>
              {(['easy', 'medium', 'hard'] as TaskDifficulty[]).map((diff) => (
                <TouchableOpacity
                  key={diff}
                  style={[
                    styles.pickerButton,
                    difficulty === diff && styles.pickerButtonActive,
                  ]}
                  onPress={() => setDifficulty(diff)}
                >
                  <Text
                    style={[
                      styles.pickerButtonText,
                      difficulty === diff && styles.pickerButtonTextActive,
                    ]}
                  >
                    {diff}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Language</Text>
          <View style={styles.pickerRow}>
            {(['python', 'javascript', 'java', 'cpp'] as TaskLanguage[]).map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[
                  styles.pickerButton,
                  language === lang && styles.pickerButtonActive,
                ]}
                onPress={() => setLanguage(lang)}
              >
                <Text
                  style={[
                    styles.pickerButtonText,
                    language === lang && styles.pickerButtonTextActive,
                  ]}
                >
                  {lang === 'cpp' ? 'C++' : lang}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Starter Code */}
        <View style={styles.field}>
          <Text style={styles.label}>Starter Code (optional)</Text>
          <TextInput
            style={[styles.input, styles.codeArea]}
            value={starterCode}
            onChangeText={setStarterCode}
            placeholder="# Starter code for the task..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={6}
          />
        </View>

        {/* Solution */}
        <View style={styles.field}>
          <Text style={styles.label}>Solution (hidden from students)</Text>
          <TextInput
            style={[styles.input, styles.codeArea]}
            value={solution}
            onChangeText={setSolution}
            placeholder="# Write the correct solution here..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={6}
          />
        </View>

        {/* Test Cases */}
        <View style={styles.field}>
          <View style={styles.fieldHeader}>
            <Text style={styles.label}>Test Cases</Text>
            <TouchableOpacity onPress={addTestCase} style={styles.addButton}>
              <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>
          {testCases.map((testCase, index) => (
            <View key={index} style={styles.testCaseCard}>
              <View style={styles.testCaseHeader}>
                <Text style={styles.testCaseTitle}>Test #{index + 1}</Text>
                <View style={styles.testCaseActions}>
                  <TouchableOpacity
                    onPress={() => updateTestCase(index, 'isHidden', !testCase.isHidden)}
                    style={styles.hiddenToggle}
                  >
                    <Text style={styles.hiddenToggleText}>
                      {testCase.isHidden ? '👁️ Hidden' : '👁️ Visible'}
                    </Text>
                  </TouchableOpacity>
                  {testCases.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeTestCase(index)}
                      style={styles.removeButton}
                    >
                      <Text style={styles.removeButtonText}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <Text style={styles.testCaseLabel}>Input (stdin)</Text>
              <TextInput
                style={[styles.input, styles.testCaseInput]}
                value={testCase.input}
                onChangeText={(text) => updateTestCase(index, 'input', text)}
                placeholder="5"
                placeholderTextColor={colors.textSecondary}
                multiline
              />
              <Text style={styles.testCaseLabel}>Expected Output</Text>
              <TextInput
                style={[styles.input, styles.testCaseInput]}
                value={testCase.expectedOutput}
                onChangeText={(text) => updateTestCase(index, 'expectedOutput', text)}
                placeholder="25"
                placeholderTextColor={colors.textSecondary}
                multiline
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 15,
      paddingTop: 60,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      padding: 5,
    },
    backText: {
      fontSize: 24,
      color: colors.primary,
      fontWeight: '600',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      flex: 1,
      textAlign: 'center',
    },
    saveButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: 8,
      minWidth: 70,
      alignItems: 'center',
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 14,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    field: {
      marginBottom: 20,
    },
    fieldHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
      fontSize: 14,
      color: colors.text,
    },
    textArea: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    codeArea: {
      minHeight: 120,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: 12,
      textAlignVertical: 'top',
    },
    row: {
      flexDirection: 'row',
      marginBottom: 20,
    },
    pickerRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    pickerButton: {
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pickerButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    pickerButtonText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    pickerButtonTextActive: {
      color: '#fff',
    },
    addButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    addButtonText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
    testCaseCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
    },
    testCaseHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    testCaseTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    testCaseActions: {
      flexDirection: 'row',
      gap: 8,
    },
    hiddenToggle: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: colors.background,
    },
    hiddenToggleText: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    removeButton: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: colors.error + '20',
    },
    removeButtonText: {
      fontSize: 11,
      color: colors.error,
      fontWeight: '600',
    },
    testCaseLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 6,
      marginTop: 8,
    },
    testCaseInput: {
      minHeight: 60,
      fontSize: 12,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
  });
