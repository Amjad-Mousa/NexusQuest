import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getQuestions, Question } from '../services/forumService';
import BottomNavigation from '../components/BottomNavigation';

const LANGUAGES = ['all', 'javascript', 'python', 'java', 'cpp', 'general'];

export default function ForumScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const styles = getStyles(colors);

  const loadQuestions = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(1);
      }

      const currentPage = reset ? 1 : page;
      const response = await getQuestions({
        page: currentPage,
        limit: 15,
        language: selectedLanguage !== 'all' ? selectedLanguage : undefined,
        search: searchQuery || undefined,
      });

      if (response.success) {
        if (reset) {
          setQuestions(response.questions);
        } else {
          setQuestions(prev => [...prev, ...response.questions]);
        }
        setHasMore(currentPage < response.pagination.pages);
      }
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, selectedLanguage, searchQuery]);

  useEffect(() => {
    loadQuestions(true);
  }, [selectedLanguage]);

  const onRefresh = () => {
    setRefreshing(true);
    loadQuestions(true);
  };

  const handleSearch = () => {
    loadQuestions(true);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
      loadQuestions(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const getVoteScore = (question: Question) => {
    return (question.upvotes?.length || 0) - (question.downvotes?.length || 0);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💬 Forum</Text>
        <TouchableOpacity
          style={styles.askButton}
          onPress={() => navigation.navigate('AskQuestion')}
        >
          <Text style={styles.askButtonText}>+ Ask</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search questions..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
      </View>

      {/* Language Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {LANGUAGES.map(lang => (
          <TouchableOpacity
            key={lang}
            style={[
              styles.filterChip,
              selectedLanguage === lang && styles.filterChipActive,
            ]}
            onPress={() => setSelectedLanguage(lang)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedLanguage === lang && styles.filterChipTextActive,
              ]}
            >
              {lang === 'all' ? 'All' : lang.charAt(0).toUpperCase() + lang.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Questions List */}
      {loading && questions.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.questionsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onScrollEndDrag={loadMore}
        >
          {questions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>No questions found</Text>
              <Text style={styles.emptySubtext}>Be the first to ask!</Text>
            </View>
          ) : (
            questions.map(question => (
              <TouchableOpacity
                key={question._id}
                style={styles.questionCard}
                onPress={() => navigation.navigate('QuestionDetail', { questionId: question._id })}
              >
                <View style={styles.questionHeader}>
                  <View style={styles.voteContainer}>
                    <Text style={styles.voteScore}>{getVoteScore(question)}</Text>
                    <Text style={styles.voteLabel}>votes</Text>
                  </View>
                  <View style={styles.answerContainer}>
                    <Text style={[
                      styles.answerCount,
                      question.isResolved && styles.resolvedCount
                    ]}>
                      {question.answersCount}
                    </Text>
                    <Text style={styles.answerLabel}>answers</Text>
                  </View>
                  <View style={styles.viewContainer}>
                    <Text style={styles.viewCount}>{question.views}</Text>
                    <Text style={styles.viewLabel}>views</Text>
                  </View>
                </View>

                <Text style={styles.questionTitle} numberOfLines={2}>
                  {question.isResolved && '✅ '}
                  {question.title}
                </Text>

                <View style={styles.tagsContainer}>
                  <View style={styles.languageTag}>
                    <Text style={styles.languageTagText}>
                      {question.programmingLanguage}
                    </Text>
                  </View>
                  {question.tags.slice(0, 2).map((tag, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.questionFooter}>
                  <Text style={styles.authorText}>
                    {question.author?.name || 'Anonymous'}
                  </Text>
                  <Text style={styles.dateText}>{formatDate(question.createdAt)}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}

          {hasMore && questions.length > 0 && (
            <TouchableOpacity style={styles.loadMoreButton} onPress={loadMore}>
              <Text style={styles.loadMoreText}>Load More</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      <BottomNavigation navigation={navigation} activeRoute="Forum" />
    </View>
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
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      paddingTop: 60,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
    },
    askButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
    },
    askButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 14,
    },
    searchContainer: {
      padding: 15,
      paddingBottom: 10,
    },
    searchInput: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterContainer: {
      maxHeight: 50,
    },
    filterContent: {
      paddingHorizontal: 15,
      gap: 8,
    },
    filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 8,
    },
    filterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterChipText: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: '500',
    },
    filterChipTextActive: {
      color: '#fff',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    questionsList: {
      flex: 1,
      padding: 15,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingTop: 60,
    },
    emptyIcon: {
      fontSize: 48,
      marginBottom: 16,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    questionCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 15,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    questionHeader: {
      flexDirection: 'row',
      marginBottom: 12,
      gap: 15,
    },
    voteContainer: {
      alignItems: 'center',
    },
    voteScore: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    voteLabel: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    answerContainer: {
      alignItems: 'center',
    },
    answerCount: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    resolvedCount: {
      color: colors.success || '#22c55e',
    },
    answerLabel: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    viewContainer: {
      alignItems: 'center',
    },
    viewCount: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    viewLabel: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    questionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 10,
      lineHeight: 22,
    },
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 10,
    },
    languageTag: {
      backgroundColor: colors.primary + '20',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 4,
    },
    languageTagText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '500',
    },
    tag: {
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 4,
    },
    tagText: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    questionFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    authorText: {
      fontSize: 12,
      color: colors.primary,
    },
    dateText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    loadMoreButton: {
      backgroundColor: colors.surface,
      padding: 15,
      borderRadius: 10,
      alignItems: 'center',
      marginTop: 10,
    },
    loadMoreText: {
      color: colors.primary,
      fontWeight: '600',
    },
  });
