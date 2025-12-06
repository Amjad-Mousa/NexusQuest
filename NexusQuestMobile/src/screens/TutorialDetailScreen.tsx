import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import api from '../services/api';

interface Task {
  _id: string;
  title: string;
  description: string;
  points: number;
}

interface Section {
  _id: string;
  title: string;
  content: string;
  tasks: Task[];
}

interface Tutorial {
  _id: string;
  title: string;
  description: string;
  language: string;
  difficulty: string;
  sections: Section[];
}

export default function TutorialDetailScreen({ route, navigation }: any) {
  const { tutorialId } = route.params;
  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTutorial();
  }, [tutorialId]);

  const loadTutorial = async () => {
    try {
      const response = await api.get(`/api/tutorials/${tutorialId}`);
      if (response.data) {
        setTutorial(response.data);
      }
    } catch (error) {
      console.error('Failed to load tutorial:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
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

        <View style={styles.sectionsContainer}>
          <Text style={styles.sectionsTitle}>Sections ({tutorial.sections?.length || 0})</Text>
          
          {tutorial.sections?.map((section, index) => (
            <View key={section._id} style={styles.sectionCard}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => toggleSection(section._id)}
              >
                <View style={styles.sectionTitleContainer}>
                  <View style={styles.sectionNumber}>
                    <Text style={styles.sectionNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                </View>
                <Text style={styles.expandIcon}>
                  {expandedSections.has(section._id) ? '▼' : '▶'}
                </Text>
              </TouchableOpacity>

              {expandedSections.has(section._id) && (
                <View style={styles.sectionContent}>
                  <Text style={styles.sectionText}>{section.content}</Text>
                  
                  {section.tasks && section.tasks.length > 0 && (
                    <View style={styles.tasksContainer}>
                      <Text style={styles.tasksTitle}>Tasks:</Text>
                      {section.tasks.map((task) => (
                        <View key={task._id} style={styles.taskItem}>
                          <View style={styles.taskHeader}>
                            <Text style={styles.taskTitle}>{task.title}</Text>
                            <View style={styles.pointsBadge}>
                              <Text style={styles.pointsText}>{task.points} pts</Text>
                            </View>
                          </View>
                          <Text style={styles.taskDescription}>{task.description}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          ))}
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
  sectionsContainer: {
    padding: 15,
  },
  sectionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  sectionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  expandIcon: {
    color: '#64748b',
    fontSize: 12,
    marginLeft: 10,
  },
  sectionContent: {
    padding: 15,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  sectionText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 15,
  },
  tasksContainer: {
    marginTop: 10,
  },
  tasksTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
  },
  taskItem: {
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  taskTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  pointsBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pointsText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  taskDescription: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
  },
});
