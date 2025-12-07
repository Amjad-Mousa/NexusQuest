import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator 
} from 'react-native';
import { getStoredUser, logout, User } from '../services/authService';
import { useTheme } from '../context/ThemeContext';
import { 
  getTeacherStats, 
  getStudentsList, 
  getPendingSubmissions,
  TeacherStats,
  StudentStats,
  QuizSubmission 
} from '../services/teacherService';

type TabType = 'overview' | 'tasks' | 'quizzes' | 'students';

export default function TeacherDashboardScreen({ navigation }: any) {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [students, setStudents] = useState<StudentStats[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<QuizSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const { theme, toggleTheme, colors } = useTheme();

  useEffect(() => {
    loadUser();
    loadData();
  }, []);

  const loadUser = async () => {
    const userData = await getStoredUser();
    setUser(userData);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, studentsData, submissionsData] = await Promise.all([
        getTeacherStats().catch(() => ({
          totalStudents: 0,
          activeStudents: 0,
          totalQuizzes: 0,
          pendingSubmissions: 0,
          averageClassScore: 0
        })),
        getStudentsList().catch(() => []),
        getPendingSubmissions().catch(() => [])
      ]);
      
      setStats(statsData);
      setStudents(studentsData);
      setPendingSubmissions(submissionsData);
    } catch (error) {
      console.error('Error loading teacher data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await logout();
    navigation.replace('Login');
  };

  const styles = getStyles(colors);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Teacher Dashboard</Text>
          <Text style={styles.subtitle}>Welcome, {user?.name}!</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={toggleTheme} style={styles.themeButton}>
            <Text style={styles.themeText}>{theme === 'dark' ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'tasks' && styles.tabActive]}
          onPress={() => setActiveTab('tasks')}
        >
          <Text style={[styles.tabText, activeTab === 'tasks' && styles.tabTextActive]}>
            Tasks
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'quizzes' && styles.tabActive]}
          onPress={() => setActiveTab('quizzes')}
        >
          <Text style={[styles.tabText, activeTab === 'quizzes' && styles.tabTextActive]}>
            Quizzes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'students' && styles.tabActive]}
          onPress={() => setActiveTab('students')}
        >
          <Text style={[styles.tabText, activeTab === 'students' && styles.tabTextActive]}>
            Students
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
        {/* Quick Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎯 Quick Actions</Text>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Quizzes')}
          >
            <Text style={styles.actionIcon}>📝</Text>
            <View style={styles.actionContent}>
              <Text style={styles.actionText}>Manage Quizzes</Text>
              <Text style={styles.actionSubtext}>Create and edit quizzes</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Tutorials')}
          >
            <Text style={styles.actionIcon}>📚</Text>
            <View style={styles.actionContent}>
              <Text style={styles.actionText}>Tutorials</Text>
              <Text style={styles.actionSubtext}>View learning materials</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Chat')}
          >
            <Text style={styles.actionIcon}>💬</Text>
            <View style={styles.actionContent}>
              <Text style={styles.actionText}>Messages</Text>
              <Text style={styles.actionSubtext}>Chat with students</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Pending Submissions */}
        {pendingSubmissions.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>⏳ Pending Submissions ({pendingSubmissions.length})</Text>
            {pendingSubmissions.slice(0, 5).map((submission) => (
              <TouchableOpacity 
                key={submission.id}
                style={styles.submissionItem}
                onPress={() => navigation.navigate('QuizDetail', { 
                  quizId: submission.quizId,
                  submissionId: submission.id 
                })}
              >
                <View style={styles.submissionInfo}>
                  <Text style={styles.submissionStudent}>{submission.studentName}</Text>
                  <Text style={styles.submissionQuiz}>{submission.quizTitle}</Text>
                  <Text style={styles.submissionDate}>
                    {new Date(submission.submittedAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.submissionScore}>
                  <Text style={styles.scoreText}>
                    {submission.score}/{submission.maxScore}
                  </Text>
                  {submission.needsGrading && (
                    <Text style={styles.needsGradingBadge}>Needs Review</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
            {pendingSubmissions.length > 5 && (
              <TouchableOpacity style={styles.viewAllButton}>
                <Text style={styles.viewAllText}>View All Submissions →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
          </>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>📚 Your Tasks</Text>
              <TouchableOpacity style={styles.addButton}>
                <Text style={styles.addButtonText}>+ Create</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>📝</Text>
              <Text style={styles.emptyStateTitle}>No Tasks Yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Create tasks for your students to practice coding
              </Text>
              <TouchableOpacity style={styles.createButton}>
                <Text style={styles.createButtonText}>Create Task</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Quizzes Tab */}
        {activeTab === 'quizzes' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>📝 Your Quizzes</Text>
              <TouchableOpacity style={styles.addButton}>
                <Text style={styles.addButtonText}>+ Create</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>🎯</Text>
              <Text style={styles.emptyStateTitle}>No Quizzes Yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Create quizzes to assess your students' knowledge
              </Text>
              <TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate('Quizzes')}>
                <Text style={styles.createButtonText}>Browse Quizzes</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>👥 Your Students</Text>
        {students.length > 0 ? (
          <>
            {students.map((student, index) => (
              <TouchableOpacity 
                key={student.id}
                style={styles.studentItem}
                onPress={() => {/* Navigate to student details */}}
              >
                <View style={styles.studentRank}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{student.name}</Text>
                  <Text style={styles.studentStats}>
                    {student.completedTutorials} tutorials • {student.completedQuizzes} quizzes
                  </Text>
                </View>
                <View style={styles.studentScore}>
                  <Text style={styles.scoreValue}>{student.averageScore.toFixed(0)}%</Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>👥</Text>
            <Text style={styles.emptyStateTitle}>No Students Yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Students will appear here once they start taking your courses
            </Text>
          </View>
        )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: colors.textSecondary,
    fontSize: 16,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  themeButton: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  themeText: {
    fontSize: 20,
  },
  logoutButton: {
    backgroundColor: colors.error,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statBox: {
    width: '48%',
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 5,
    textAlign: 'center',
  },
  averageScoreBox: {
    backgroundColor: colors.primary + '20',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  averageScoreLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 5,
  },
  averageScoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  actionContent: {
    flex: 1,
  },
  actionText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  actionSubtext: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  submissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  submissionInfo: {
    flex: 1,
  },
  submissionStudent: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  submissionQuiz: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  submissionDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  submissionScore: {
    alignItems: 'flex-end',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  needsGradingBadge: {
    backgroundColor: colors.warning + '30',
    color: colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 4,
  },
  viewAllButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewAllText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  studentRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  studentStats: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  studentScore: {
    alignItems: 'flex-end',
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.success,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 64,
    marginBottom: 15,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 30,
    lineHeight: 20,
  },
});
