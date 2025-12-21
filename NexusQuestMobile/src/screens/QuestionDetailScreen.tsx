import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import {
  getQuestion,
  Question,
  Answer,
  voteQuestion,
  voteAnswer,
  createAnswer,
  acceptAnswer,
} from '../services/forumService';
import { getStoredUser, User } from '../services/authService';

export default function QuestionDetailScreen({ route, navigation }: any) {
  const { questionId } = route.params;
  const { colors } = useTheme();
  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAnswer, setNewAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const styles = getStyles(colors);

  useEffect(() => {
    loadData();
  }, [questionId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [response, user] = await Promise.all([
        getQuestion(questionId),
        getStoredUser(),
      ]);
      
      if (response?.success) {
        setQuestion(response.question);
        setAnswers(response.answers);
      }
      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading question:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVoteQuestion = async (type: 'up' | 'down') => {
    if (!question) return;
    
    const result = await voteQuestion(question._id, type);
    if (result.success) {
      loadData();
    }
  };

  const handleVoteAnswer = async (answerId: string, type: 'up' | 'down') => {
    const result = await voteAnswer(answerId, type);
    if (result.success) {
      loadData();
    }
  };

  const handleSubmitAnswer = async () => {
    if (!newAnswer.trim()) {
      Alert.alert('Error', 'Please enter your answer');
      return;
    }

    setSubmitting(true);
    const result = await createAnswer(questionId, { content: newAnswer });
    setSubmitting(false);

    if (result.success) {
      setNewAnswer('');
      loadData();
      Alert.alert('Success', 'Your answer has been posted!');
    } else {
      Alert.alert('Error', result.message || 'Failed to post answer');
    }
  };

  const handleAcceptAnswer = async (answerId: string) => {
    Alert.alert(
      'Accept Answer',
      'Mark this answer as accepted?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            const result = await acceptAnswer(answerId);
            if (result.success) {
              loadData();
            } else {
              Alert.alert('Error', result.message || 'Failed to accept answer');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getVoteScore = (item: Question | Answer) => {
    return (item.upvotes?.length || 0) - (item.downvotes?.length || 0);
  };

  const isAuthor = question?.author?._id === currentUser?._id;

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!question) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.errorText}>Question not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Question</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Question Card */}
        <View style={styles.questionCard}>
          <View style={styles.voteSection}>
            <TouchableOpacity onPress={() => handleVoteQuestion('up')} style={styles.voteButton}>
              <Text style={styles.voteIcon}>▲</Text>
            </TouchableOpacity>
            <Text style={styles.voteScore}>{getVoteScore(question)}</Text>
            <TouchableOpacity onPress={() => handleVoteQuestion('down')} style={styles.voteButton}>
              <Text style={styles.voteIcon}>▼</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.questionContent}>
            <Text style={styles.questionTitle}>
              {question.isResolved && '✅ '}
              {question.title}
            </Text>

            <View style={styles.tagsRow}>
              <View style={styles.languageTag}>
                <Text style={styles.languageTagText}>{question.programmingLanguage}</Text>
              </View>
              {question.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.questionBody}>{question.content}</Text>

            {question.codeSnippet && (
              <View style={styles.codeBlock}>
                <Text style={styles.codeText}>{question.codeSnippet}</Text>
              </View>
            )}

            <View style={styles.metaRow}>
              <Text style={styles.authorName}>Asked by {question.author?.name}</Text>
              <Text style={styles.dateText}>{formatDate(question.createdAt)}</Text>
            </View>
          </View>
        </View>

        {/* Answers Section */}
        <View style={styles.answersHeader}>
          <Text style={styles.answersTitle}>
            {answers.length} {answers.length === 1 ? 'Answer' : 'Answers'}
          </Text>
        </View>

        {answers.map((answer) => (
          <View
            key={answer._id}
            style={[styles.answerCard, answer.isAccepted && styles.acceptedAnswer]}
          >
            <View style={styles.voteSection}>
              <TouchableOpacity onPress={() => handleVoteAnswer(answer._id, 'up')} style={styles.voteButton}>
                <Text style={styles.voteIcon}>▲</Text>
              </TouchableOpacity>
              <Text style={styles.voteScore}>{getVoteScore(answer)}</Text>
              <TouchableOpacity onPress={() => handleVoteAnswer(answer._id, 'down')} style={styles.voteButton}>
                <Text style={styles.voteIcon}>▼</Text>
              </TouchableOpacity>
              {answer.isAccepted && <Text style={styles.acceptedIcon}>✓</Text>}
            </View>

            <View style={styles.answerContent}>
              <Text style={styles.answerBody}>{answer.content}</Text>

              {answer.codeSnippet && (
                <View style={styles.codeBlock}>
                  <Text style={styles.codeText}>{answer.codeSnippet}</Text>
                </View>
              )}

              <View style={styles.metaRow}>
                <Text style={styles.authorName}>{answer.author?.name}</Text>
                <Text style={styles.dateText}>{formatDate(answer.createdAt)}</Text>
              </View>

              {isAuthor && !question.isResolved && !answer.isAccepted && (
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => handleAcceptAnswer(answer._id)}
                >
                  <Text style={styles.acceptButtonText}>✓ Accept Answer</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        {/* Add Answer */}
        <View style={styles.addAnswerSection}>
          <Text style={styles.addAnswerTitle}>Your Answer</Text>
          <TextInput
            style={styles.answerInput}
            placeholder="Write your answer here..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={6}
            value={newAnswer}
            onChangeText={setNewAnswer}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmitAnswer}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Post Answer</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorText: {
      color: colors.text,
      fontSize: 18,
      marginBottom: 20,
    },
    backButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
    },
    backButtonText: {
      color: '#fff',
      fontWeight: 'bold',
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
    backBtn: {
      padding: 8,
    },
    backBtnText: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: '600',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    content: {
      flex: 1,
      padding: 15,
    },
    questionCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 15,
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 20,
    },
    voteSection: {
      alignItems: 'center',
      marginRight: 15,
      paddingTop: 5,
    },
    voteButton: {
      padding: 8,
    },
    voteIcon: {
      fontSize: 18,
      color: colors.textSecondary,
    },
    voteScore: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginVertical: 5,
    },
    acceptedIcon: {
      fontSize: 24,
      color: colors.success || '#22c55e',
      marginTop: 10,
    },
    questionContent: {
      flex: 1,
    },
    questionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 10,
      lineHeight: 26,
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 15,
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
    questionBody: {
      fontSize: 16,
      color: colors.text,
      lineHeight: 24,
      marginBottom: 15,
    },
    codeBlock: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 12,
      marginBottom: 15,
    },
    codeText: {
      fontFamily: 'monospace',
      fontSize: 13,
      color: colors.text,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    authorName: {
      fontSize: 13,
      color: colors.primary,
    },
    dateText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    answersHeader: {
      marginBottom: 15,
    },
    answersTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    answerCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 15,
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    acceptedAnswer: {
      borderColor: colors.success || '#22c55e',
      borderWidth: 2,
    },
    answerContent: {
      flex: 1,
    },
    answerBody: {
      fontSize: 15,
      color: colors.text,
      lineHeight: 22,
      marginBottom: 10,
    },
    acceptButton: {
      backgroundColor: colors.success || '#22c55e',
      paddingHorizontal: 15,
      paddingVertical: 8,
      borderRadius: 6,
      alignSelf: 'flex-start',
      marginTop: 10,
    },
    acceptButtonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 13,
    },
    addAnswerSection: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 15,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 10,
    },
    addAnswerTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 12,
    },
    answerInput: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 12,
      fontSize: 15,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 120,
      marginBottom: 12,
    },
    submitButton: {
      backgroundColor: colors.primary,
      padding: 15,
      borderRadius: 10,
      alignItems: 'center',
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 16,
    },
  });
