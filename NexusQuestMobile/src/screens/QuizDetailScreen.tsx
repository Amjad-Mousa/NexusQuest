import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import quizService from '../services/quizService';
import { Quiz } from '../types/quiz';

const QuizDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { quizId } = route.params as { quizId: string };

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuizDetail();
  }, [quizId]);

  const fetchQuizDetail = async () => {
    try {
      setLoading(true);
      const data = await quizService.getQuizById(quizId);
      setQuiz(data);
    } catch (error) {
      console.error('Error loading quiz:', error);
      Alert.alert('خطأ', 'فشل تحميل تفاصيل الكويز');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return '#10b981';
      case 'scheduled':
        return '#f59e0b';
      case 'ended':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'active':
        return 'جاري';
      case 'scheduled':
        return 'مجدول';
      case 'ended':
        return 'منتهي';
      default:
        return 'غير معروف';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return '#10b981';
      case 'medium':
        return '#f59e0b';
      case 'hard':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'سهل';
      case 'medium':
        return 'متوسط';
      case 'hard':
        return 'صعب';
      default:
        return difficulty;
    }
  };

  const getLanguageText = (language: string) => {
    switch (language) {
      case 'python':
        return 'Python';
      case 'javascript':
        return 'JavaScript';
      case 'java':
        return 'Java';
      case 'cpp':
        return 'C++';
      default:
        return language;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={styles.loadingText}>جاري تحميل الكويز...</Text>
      </View>
    );
  }

  if (!quiz) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>الكويز غير موجود</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{quiz.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(quiz.status) }]}>
          <Text style={styles.statusText}>{getStatusText(quiz.status)}</Text>
        </View>
      </View>

      {/* Info Cards */}
      <View style={styles.infoGrid}>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>اللغة</Text>
          <Text style={styles.infoValue}>{getLanguageText(quiz.language)}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>الصعوبة</Text>
          <View
            style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(quiz.difficulty) }]}
          >
            <Text style={styles.difficultyText}>{getDifficultyText(quiz.difficulty)}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>النقاط</Text>
          <Text style={styles.infoValue}>{quiz.points}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>المدة</Text>
          <Text style={styles.infoValue}>{quiz.duration} دقيقة</Text>
        </View>
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>الوصف</Text>
        <Text style={styles.description}>{quiz.description}</Text>
      </View>

      {/* Dates */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>المواعيد</Text>
        <View style={styles.dateContainer}>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>تاريخ البداية:</Text>
            <Text style={styles.dateValue}>{formatDate(quiz.startTime)}</Text>
          </View>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>تاريخ النهاية:</Text>
            <Text style={styles.dateValue}>{formatDate(quiz.endTime)}</Text>
          </View>
        </View>
      </View>

      {/* Starter Code */}
      {quiz.starterCode && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الكود الأساسي</Text>
          <View style={styles.codeContainer}>
            <Text style={styles.codeText}>{quiz.starterCode}</Text>
          </View>
        </View>
      )}

      {/* Test Cases */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>حالات الاختبار</Text>
        <Text style={styles.testCaseNote}>
          عدد حالات الاختبار: {quiz.testCases.length}
        </Text>
        {quiz.testCases
          .filter((tc) => !tc.isHidden)
          .map((testCase, index) => (
            <View key={index} style={styles.testCaseCard}>
              <Text style={styles.testCaseTitle}>حالة اختبار {index + 1}</Text>
              <View style={styles.testCaseContent}>
                <Text style={styles.testCaseLabel}>المدخلات:</Text>
                <Text style={styles.testCaseValue}>{testCase.input || 'لا يوجد'}</Text>
              </View>
              <View style={styles.testCaseContent}>
                <Text style={styles.testCaseLabel}>المخرجات المتوقعة:</Text>
                <Text style={styles.testCaseValue}>{testCase.expectedOutput}</Text>
              </View>
            </View>
          ))}
      </View>

      {/* Created By */}
      {quiz.createdBy && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>أنشئ بواسطة</Text>
          <Text style={styles.creatorText}>{quiz.createdBy.name}</Text>
        </View>
      )}

      {/* Note about submission */}
      <View style={styles.noteContainer}>
        <Text style={styles.noteText}>
          📝 ملاحظة: عرض الكويزات متاح فقط. لتقديم الكويز، يرجى استخدام تطبيق الويب.
        </Text>
      </View>

      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>رجوع</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'right',
  },
  statusBadge: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  infoCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    textAlign: 'right',
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'right',
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-end',
  },
  difficultyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  section: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'right',
  },
  description: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
    textAlign: 'right',
  },
  dateContainer: {
    gap: 12,
  },
  dateItem: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
  },
  dateLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
    textAlign: 'right',
  },
  dateValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'right',
  },
  codeContainer: {
    backgroundColor: '#1f2937',
    padding: 16,
    borderRadius: 8,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#f9fafb',
    textAlign: 'left',
  },
  testCaseNote: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    textAlign: 'right',
  },
  testCaseCard: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  testCaseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'right',
  },
  testCaseContent: {
    marginBottom: 8,
  },
  testCaseLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
    textAlign: 'right',
  },
  testCaseValue: {
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: 6,
    textAlign: 'right',
  },
  creatorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'right',
  },
  creatorEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'right',
  },
  noteContainer: {
    backgroundColor: '#fef3c7',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  noteText: {
    fontSize: 14,
    color: '#92400e',
    textAlign: 'right',
    lineHeight: 20,
  },
  backButton: {
    backgroundColor: '#7c3aed',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default QuizDetailScreen;
