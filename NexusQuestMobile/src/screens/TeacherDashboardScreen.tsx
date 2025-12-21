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
import BottomNavigation from '../components/BottomNavigation';
import { getUnreadNotifications } from '../services/notificationService';

export default function TeacherDashboardScreen({ navigation }: any) {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [students, setStudents] = useState<StudentStats[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<QuizSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { theme, toggleTheme, colors } = useTheme();

  useEffect(() => {
    loadUser();
    loadData();
  }, []);

  const loadUser = async () => {
    const userData = await getStoredUser();
    setUser(userData);
    // Load notifications count
    const notifData = await getUnreadNotifications();
    setUnreadCount(notifData.count || 0);
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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'T'}</Text>
            </View>
            <View>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.userName}>{user?.name || 'Teacher'}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.iconButton}>
              <Text style={styles.iconText}>🔔</Text>
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleTheme} style={styles.iconButton}>
              <Text style={styles.iconText}>{theme === 'dark' ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.iconButton}>
              <Text style={styles.iconText}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.primary + '20' }]}>
            <Text style={styles.statIcon}>👥</Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats?.totalStudents || 0}</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.success + '20' }]}>
            <Text style={styles.statIcon}>✅</Text>
            <Text style={[styles.statValue, { color: colors.success }]}>{stats?.activeStudents || 0}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.warning + '20' }]}>
            <Text style={styles.statIcon}>📝</Text>
            <Text style={[styles.statValue, { color: colors.warning }]}>{stats?.totalQuizzes || 0}</Text>
            <Text style={styles.statLabel}>Quizzes</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('CreateQuiz')}
          >
            <View style={[styles.actionIconBg, { backgroundColor: colors.primary + '20' }]}>
              <Text style={styles.actionIcon}>📝</Text>
            </View>
            <Text style={styles.actionText}>Create Quiz</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('CreateTask')}
          >
            <View style={[styles.actionIconBg, { backgroundColor: colors.success + '20' }]}>
              <Text style={styles.actionIcon}>📚</Text>
            </View>
            <Text style={styles.actionText}>Create Task</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('Quizzes')}
          >
            <View style={[styles.actionIconBg, { backgroundColor: colors.warning + '20' }]}>
              <Text style={styles.actionIcon}>🎯</Text>
            </View>
            <Text style={styles.actionText}>My Quizzes</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('Tutorials')}
          >
            <View style={[styles.actionIconBg, { backgroundColor: colors.error + '20' }]}>
              <Text style={styles.actionIcon}>📖</Text>
            </View>
            <Text style={styles.actionText}>Tutorials</Text>
          </TouchableOpacity>
        </View>

        {/* Top Students */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Students</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        {students.length > 0 ? (
          <View style={styles.studentsCard}>
            {students.slice(0, 5).map((student, index) => (
              <View key={student.id} style={styles.studentRow}>
                <View style={[styles.rankBadge, index < 3 && styles.topRankBadge]}>
                  <Text style={[styles.rankNumber, index < 3 && styles.topRankNumber]}>
                    {index + 1}
                  </Text>
                </View>
                <View style={styles.studentAvatar}>
                  <Text style={styles.studentAvatarText}>{student.name.charAt(0)}</Text>
                </View>
                <View style={styles.studentDetails}>
                  <Text style={styles.studentName}>{student.name}</Text>
                  <Text style={styles.studentMeta}>
                    {student.completedQuizzes} quizzes completed
                  </Text>
                </View>
                <View style={styles.scoreContainer}>
                  <Text style={styles.scoreValue}>{student.totalPoints || 0}</Text>
                  <Text style={styles.scoreLabel}>pts</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No Students Yet</Text>
            <Text style={styles.emptySubtext}>
              Students will appear here once they join
            </Text>
          </View>
        )}

        {/* Pending Submissions */}
        {pendingSubmissions.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pending Reviews</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingSubmissions.length}</Text>
              </View>
            </View>
            <View style={styles.submissionsCard}>
              {pendingSubmissions.slice(0, 3).map((submission) => (
                <TouchableOpacity 
                  key={submission.id}
                  style={styles.submissionRow}
                  onPress={() => navigation.navigate('QuizDetail', { 
                    quizId: submission.quizId,
                    submissionId: submission.id 
                  })}
                >
                  <View style={styles.submissionLeft}>
                    <Text style={styles.submissionStudent}>{submission.studentName}</Text>
                    <Text style={styles.submissionQuiz}>{submission.quizTitle}</Text>
                  </View>
                  <View style={styles.submissionRight}>
                    <Text style={styles.submissionScore}>
                      {submission.score}/{submission.maxScore}
                    </Text>
                    <Text style={styles.reviewBadge}>Review</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>🚪 Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNavigation navigation={navigation} activeRoute="TeacherDashboard" />
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
    backgroundColor: colors.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 18,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -30,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 10,
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  actionCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIconBg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionIcon: {
    fontSize: 24,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  studentsCard: {
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  topRankBadge: {
    backgroundColor: colors.primary,
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  topRankNumber: {
    color: '#fff',
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  studentAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  studentMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  scoreLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  badge: {
    backgroundColor: colors.error,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  submissionsCard: {
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  submissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  submissionLeft: {
    flex: 1,
  },
  submissionStudent: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  submissionQuiz: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  submissionRight: {
    alignItems: 'flex-end',
  },
  submissionScore: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  reviewBadge: {
    fontSize: 10,
    color: colors.warning,
    backgroundColor: colors.warning + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    overflow: 'hidden',
  },
  logoutButton: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.error + '40',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.error,
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
