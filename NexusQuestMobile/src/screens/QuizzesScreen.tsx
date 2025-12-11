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
import { useTheme } from '../context/ThemeContext';
import BottomNavigation from '../components/BottomNavigation';

const QuizzesScreen = () => {
  const navigation = useNavigation();
  const { theme, colors } = useTheme();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<QuizLanguage | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<QuizDifficulty | 'all'>('all');
  const [showEnded, setShowEnded] = useState(false);

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
  }, [searchQuery, selectedLanguage, selectedDifficulty, showEnded, quizzes]);

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

    // Optionally exclude ended quizzes
    if (!showEnded) {
      filtered = filtered.filter((quiz) => quiz.status !== 'ended');
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
        return colors.success;
      case 'scheduled':
        return colors.warning;
      case 'ended':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'scheduled':
        return 'Scheduled';
      case 'ended':
        return 'Ended';
      default:
        return 'Unknown';
    }
  };

  const getDifficultyColor = (difficulty: QuizDifficulty) => {
    switch (difficulty) {
      case 'easy':
        return '#10b981';
      case 'medium':
        return '#f59e0b';
      case 'hard':
        return colors.error;
    }
  };

  const getDifficultyText = (difficulty: QuizDifficulty) => {
    switch (difficulty) {
      case 'easy':
        return 'Easy';
      case 'medium':
        return 'Medium';
      case 'hard':
        return 'Hard';
    }
  };

  const getLanguageText = (language: QuizLanguage | 'all') => {
    switch (language) {
      case 'all':
        return 'All';
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
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderQuizItem = ({ item }: { item: Quiz }) => (
    <TouchableOpacity
      style={[
        styles.quizCard,
        {
          backgroundColor: colors.card,
          shadowColor: theme === 'dark' ? '#000' : '#000',
        },
      ]}
      onPress={() => navigation.navigate('QuizDetail' as never, { quizId: item._id } as never)}
    >
      <View style={styles.quizHeader}>
        <Text style={[styles.quizTitle, { color: colors.text }]}>{item.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <Text style={[styles.quizDescription, { color: colors.textSecondary }]} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.quizInfo}>
        <View style={styles.infoItem}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Language:</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{getLanguageText(item.language)}</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Difficulty:</Text>
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
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Points:</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{item.points}</Text>
        </View>
      </View>

      <View style={styles.quizDates}>
        <View style={styles.dateItem}>
          <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Starts:</Text>
          <Text style={[styles.dateValue, { color: colors.text }]}>{formatDate(item.startTime)}</Text>
        </View>
        <View style={styles.dateItem}>
          <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Ends:</Text>
          <Text style={[styles.dateValue, { color: colors.text }]}>{formatDate(item.endTime)}</Text>
        </View>
      </View>

      <View
        style={[
          styles.durationContainer,
          {
            backgroundColor: theme === 'dark' ? '#020617' : '#f3f4f6',
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.durationText, { color: colors.text }]}>
          Duration: {item.duration} min
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={styles.loadingText}>Loading quizzes...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
      >
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: theme === 'dark' ? '#020617' : '#f3f4f6',
              color: colors.text,
            },
          ]}
          placeholder="Search quizzes..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9ca3af"
        />
      </View>

      {/* Language Filter */}
      <View style={[styles.filterContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
      >
        <Text style={[styles.filterLabel, { color: colors.text }]}>Language:</Text>
        <FlatList
          horizontal
          data={languages}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterButton,
                {
                  backgroundColor:
                    selectedLanguage === item
                      ? colors.primary
                      : theme === 'dark'
                      ? '#020617'
                      : '#f3f4f6',
                },
              ]}
              onPress={() => setSelectedLanguage(item)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  {
                    color:
                      selectedLanguage === item ? '#ffffff' : colors.textSecondary,
                  },
                ]}
              >
                {getLanguageText(item)}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Difficulty Filter */}
      <View
        style={[
          styles.filterContainer,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.filterLabel, { color: colors.text }]}>Difficulty:</Text>
        <FlatList
          horizontal
          data={difficulties}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterButton,
                {
                  backgroundColor:
                    selectedDifficulty === item
                      ? colors.primary
                      : theme === 'dark'
                      ? '#020617'
                      : '#f3f4f6',
                },
              ]}
              onPress={() => setSelectedDifficulty(item)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  {
                    color:
                      selectedDifficulty === item
                        ? '#ffffff'
                        : colors.textSecondary,
                  },
                ]}
              >
                {item === 'all' ? 'All' : getDifficultyText(item as QuizDifficulty)}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Ended Filter Toggle */}
      <View
        style={[
          styles.endedFilterContainer,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.endedFilterButton,
            { borderColor: colors.border, backgroundColor: showEnded ? colors.primary : 'transparent' },
          ]}
          onPress={() => setShowEnded((prev) => !prev)}
        >
          <Text
            style={[
              styles.endedFilterText,
              { color: showEnded ? '#ffffff' : colors.textSecondary },
            ]}
          >
            {showEnded ? 'Hide ended quizzes' : 'Show ended quizzes'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quiz List */}
      {filteredQuizzes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No quizzes available</Text>
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

      <BottomNavigation navigation={navigation} activeRoute="Quizzes" />
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
    textAlign: 'left',
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
    textAlign: 'left',
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
  endedFilterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    alignItems: 'flex-start',
  },
  endedFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  endedFilterText: {
    fontSize: 13,
    fontWeight: '500',
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
    textAlign: 'left',
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
    textAlign: 'left',
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
    textAlign: 'left',
  },
  dateValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'left',
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
