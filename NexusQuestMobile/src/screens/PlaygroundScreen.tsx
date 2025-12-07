import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const DEFAULT_CODE: Record<string, string> = {
  python: `# Python Playground
print("Hello from Python!")

name = input("Enter your name: ")
print(f"Welcome, {name}!")`,
  javascript: `// JavaScript Playground
console.log("Hello from JavaScript!");

const numbers = [1, 2, 3, 4, 5];
const sum = numbers.reduce((a, b) => a + b, 0);
console.log("Sum:", sum);`,
  java: `// Java Playground
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from Java!");
        
        Scanner scanner = new Scanner(System.in);
        System.out.print("Enter your name: ");
        String name = scanner.nextLine();
        System.out.println("Welcome, " + name + "!");
        scanner.close();
    }
}`,
  cpp: `// C++ Playground
#include <iostream>
#include <string>
using namespace std;

int main() {
    cout << "Hello from C++!" << endl;
    
    string name;
    cout << "Enter your name: ";
    getline(cin, name);
    cout << "Welcome, " << name << "!" << endl;
    
    return 0;
}`,
};

type Language = 'python' | 'javascript' | 'java' | 'cpp';

export default function PlaygroundScreen({ navigation }: any) {
  const [language, setLanguage] = useState<Language>('python');
  const [code, setCode] = useState(DEFAULT_CODE.python);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
    setCode(DEFAULT_CODE[newLanguage]);
    setOutput('');
  };

  const handleRunCode = async () => {
    if (!code.trim()) {
      Alert.alert('Error', 'Please write some code first!');
      return;
    }

    setIsRunning(true);
    setOutput('Running...\n');

    try {
      const token = await AsyncStorage.getItem('nexusquest-token');
      const API_URL = 'http://192.168.1.100:9876';
      
      // Use simple endpoint that returns all output at once
      const response = await fetch(`${API_URL}/api/simple-playground/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: code,
          language: language,
          sessionId: sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to execute code');
      }

      const result = await response.json();
      
      if (result.success) {
        setOutput(result.output || 'Code executed (no output)');
      } else {
        setOutput(`Error: ${result.error || 'Execution failed'}`);
      }
    } catch (error: any) {
      setOutput(`Error: ${error.message || 'Failed to execute code'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSendInput = async () => {
    if (!inputValue.trim()) return;

    try {
      await api.post('/api/playground/input', {
        sessionId: sessionId,
        input: inputValue + '\n',
      });
      setInputValue('');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to send input');
    }
  };

  const languageButtons = [
    { value: 'python' as Language, label: 'Python', color: '#3b82f6' },
    { value: 'javascript' as Language, label: 'JavaScript', color: '#eab308' },
    { value: 'java' as Language, label: 'Java', color: '#ef4444' },
    { value: 'cpp' as Language, label: 'C++', color: '#a855f7' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Playground</Text>
        <TouchableOpacity
          style={[styles.runButton, isRunning && styles.runButtonDisabled]}
          onPress={handleRunCode}
          disabled={isRunning}
        >
          {isRunning ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.runButtonText}>▶ Run</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Language Selector */}
      <View style={styles.languageSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {languageButtons.map((lang) => (
            <TouchableOpacity
              key={lang.value}
              style={[
                styles.languageButton,
                language === lang.value && { backgroundColor: lang.color },
              ]}
              onPress={() => handleLanguageChange(lang.value)}
            >
              <Text
                style={[
                  styles.languageButtonText,
                  language === lang.value && styles.languageButtonTextActive,
                ]}
              >
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Code Editor */}
      <View style={styles.editorContainer}>
        <Text style={styles.sectionTitle}>Code Editor</Text>
        <TextInput
          style={styles.codeInput}
          value={code}
          onChangeText={setCode}
          multiline
          placeholder="Write your code here..."
          placeholderTextColor="#64748b"
          autoCapitalize="none"
          autoCorrect={false}
          textAlignVertical="top"
        />
      </View>

      {/* Output */}
      <View style={styles.outputContainer}>
        <Text style={styles.sectionTitle}>Output</Text>
        <ScrollView style={styles.outputScroll}>
          <Text style={styles.outputText}>{output || 'Output will appear here...'}</Text>
        </ScrollView>
      </View>

      {/* Input Field (for programs that need input) */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.inputField}
          value={inputValue}
          onChangeText={setInputValue}
          placeholder="Send input to program..."
          placeholderTextColor="#64748b"
          onSubmitEditing={handleSendInput}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSendInput}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    paddingTop: 60,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backButton: {
    width: 40,
  },
  backText: {
    color: '#3b82f6',
    fontSize: 24,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  runButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  runButtonDisabled: {
    opacity: 0.6,
  },
  runButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  languageSelector: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  languageButton: {
    backgroundColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  languageButtonText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  languageButtonTextActive: {
    color: '#fff',
  },
  editorContainer: {
    flex: 1,
    padding: 15,
  },
  sectionTitle: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  codeInput: {
    flex: 1,
    backgroundColor: '#1e293b',
    color: '#e2e8f0',
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    fontFamily: 'monospace',
    borderWidth: 1,
    borderColor: '#334155',
  },
  outputContainer: {
    height: 200,
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  outputScroll: {
    flex: 1,
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  outputText: {
    color: '#10b981',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 10,
  },
  inputField: {
    flex: 1,
    backgroundColor: '#0f172a',
    color: '#fff',
    padding: 10,
    borderRadius: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sendButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
