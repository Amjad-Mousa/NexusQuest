import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import quizService from '../services/quizService';
import { Quiz, QuizDifficulty, QuizLanguage } from '../types/quiz';

const QuizzesScreen = () => {
  const navigation = useNavigation();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<QuizLanguage | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<QuizDifficulty | 'all'>('all');

  const languages: Array<QuizLanguage | 'all'> = ['all', 'python', 'javascript', 'java', 'cpp'];
  const difficulties: Array<QuizDifficulty | 'all'> = ['all', 'easy', 'medium', 'hard'];

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const data = await quizService.getAllQuizzes();
      console.log('Fetched quizzes:', data);
      setQuizzes(data || []);
      setFilteredQuizzes(data || []);
    } catch (error) {
      console.error('Error loading quizzes:', error);
      setQuizzes([]);
      setFilteredQuizzes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  useEffect(() => {
    filterQuizzes();
  }, [searchQuery, selectedLanguage, selectedDifficulty, quizzes]);

  const filterQuizzes = () => {
    let filtered = [...quizzes];

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (quiz) =>
          quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          quiz.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by language
    if (selectedLanguage !== 'all') {
      filtered = filtered.filter((quiz) => quiz.language === selectedLanguage);
    }

    // Filter by difficulty
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter((quiz) => quiz.difficulty === selectedDifficulty);
    }

    setFilteredQuizzes(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchQuizzes();
    setRefreshing(false);
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

  const getDifficultyColor = (difficulty: QuizDifficulty) => {
    switch (difficulty) {
      case 'easy':
        return '#10b981';
      case 'medium':
        return '#f59e0b';
      case 'hard':
        return '#ef4444';
    }
  };

  const getDifficultyText = (difficulty: QuizDifficulty) => {
    switch (difficulty) {
      case 'easy':
        return 'سهل';
      case 'medium':
        return 'متوسط';
      case 'hard':
        return 'صعب';
    }
  };

  const getLanguageText = (language: QuizLanguage | 'all') => {
    switch (language) {
      case 'all':
        return 'الكل';
      case 'python':
        return 'Python';
      case 'javascript':
        return 'JavaScript';
      case 'java':
        return 'Java';
      case 'cpp':
        return 'C++';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderQuizItem = ({ item }: { item: Quiz }) => (
    <TouchableOpacity
      style={styles.quizCard}
      onPress={() => navigation.navigate('QuizDetail' as never, { quizId: item._id } as never)}
    >
      <View style={styles.quizHeader}>
        <Text style={styles.quizTitle}>{item.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <Text style={styles.quizDescription} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.quizInfo}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>اللغة:</Text>
          <Text style={styles.infoValue}>{getLanguageText(item.language)}</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>الصعوبة:</Text>
          <View
            style={[
              styles.difficultyBadge,
              { backgroundColor: getDifficultyColor(item.difficulty) },
            ]}
          >
            <Text style={styles.difficultyText}>{getDifficultyText(item.difficulty)}</Text>
          </View>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>النقاط:</Text>
          <Text style={styles.infoValue}>{item.points}</Text>
        </View>
      </View>

      <View style={styles.quizDates}>
        <View style={styles.dateItem}>
          <Text style={styles.dateLabel}>يبدأ:</Text>
          <Text style={styles.dateValue}>{formatDate(item.startTime)}</Text>
        </View>
        <View style={styles.dateItem}>
          <Text style={styles.dateLabel}>ينتهي:</Text>
          <Text style={styles.dateValue}>{formatDate(item.endTime)}</Text>
        </View>
      </View>

      <View style={styles.durationContainer}>
        <Text style={styles.durationText}>المدة: {item.duration} دقيقة</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={styles.loadingText}>جاري تحميل الكويزات...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث عن كويز..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9ca3af"
        />
      </View>

      {/* Language Filter */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>اللغة:</Text>
        <FlatList
          horizontal
          data={languages}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedLanguage === item && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedLanguage(item)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedLanguage === item && styles.filterButtonTextActive,
                ]}
              >
                {getLanguageText(item)}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Difficulty Filter */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>الصعوبة:</Text>
        <FlatList
          horizontal
          data={difficulties}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedDifficulty === item && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedDifficulty(item)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedDifficulty === item && styles.filterButtonTextActive,
                ]}
              >
                {item === 'all' ? 'الكل' : getDifficultyText(item as QuizDifficulty)}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Quiz List */}
      {filteredQuizzes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>لا توجد كويزات</Text>
        </View>
      ) : (
        <FlatList
          data={filteredQuizzes}
          keyExtractor={(item) => item._id}
          renderItem={renderQuizItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
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
  searchContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'right',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'right',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#7c3aed',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#4b5563',
  },
  filterButtonTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  quizCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quizTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  quizDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    textAlign: 'right',
  },
  quizInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginRight: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  quizDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
    textAlign: 'right',
  },
  dateValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'right',
  },
  durationContainer: {
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  durationText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#9ca3af',
  },
});

export default QuizzesScreen;
