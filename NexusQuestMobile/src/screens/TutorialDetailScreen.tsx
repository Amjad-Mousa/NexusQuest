import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { getTutorial, type Tutorial } from '../services/tutorialService';

export default function TutorialDetailScreen({ route, navigation }: any) {
  const { tutorialId } = route.params;
  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTutorial();
  }, [tutorialId]);

  const loadTutorial = async () => {
    try {
      const t = await getTutorial(tutorialId);
      setTutorial(t);
    } catch (error) {
      console.error('Failed to load tutorial:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return '#10b981';
      case 'intermediate':
        return '#f59e0b';
      case 'advanced':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!tutorial) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Tutorial not found</Text>
      </View>
    );
  }

  // Build markdown content from tutorial sections
  const markdownContent = tutorial.sections
    .map((section) => {
      const heading = `## ${section.title}`;
      const body = section.content || '';
      const code = section.codeExample
        ? `\n\n\n\n
\n\n`
        : '';
      return `${heading}\n\n${body}${code}`;
    })
    .join('\n\n---\n\n');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {tutorial.title}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.title}>{tutorial.title}</Text>
          <Text style={styles.description}>{tutorial.description}</Text>
          
          <View style={styles.badges}>
            <View style={styles.languageBadge}>
              <Text style={styles.languageText}>{tutorial.language}</Text>
            </View>
            <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(tutorial.difficulty) }]}>
              <Text style={styles.difficultyText}>{tutorial.difficulty}</Text>
            </View>
          </View>
        </View>

        <View style={styles.markdownContainer}>
          <Markdown
            style={{
              body: { color: '#cbd5e1', fontSize: 16, lineHeight: 24 },
              heading1: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
              heading2: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 15, marginBottom: 10 },
              heading3: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 10, marginBottom: 5 },
              code_block: { backgroundColor: '#1e293b', padding: 10, borderRadius: 8, color: '#e2e8f0', fontFamily: 'monospace' },
              code_inline: { backgroundColor: '#1e293b', padding: 2, borderRadius: 4, color: '#e2e8f0', fontFamily: 'monospace' },
              link: { color: '#3b82f6' },
              list_item: { color: '#cbd5e1', marginBottom: 5 },
            }}
          >
            {markdownContent}
          </Markdown>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingTop: 60,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backButton: {
    marginRight: 15,
  },
  backText: {
    color: '#3b82f6',
    fontSize: 24,
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: '#1e293b',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    color: '#94a3b8',
    lineHeight: 22,
    marginBottom: 15,
  },
  badges: {
    flexDirection: 'row',
    gap: 10,
  },
  languageBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  languageText: {
    color: '#3b82f6',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  difficultyText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  markdownContainer: {
    padding: 15,
    paddingBottom: 40,
  },
});
