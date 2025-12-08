import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getTopLeaderboard, getMyLeaderboardRank, LeaderboardEntry, LeaderboardMe } from '../services/statsService';
import { getStoredUser } from '../services/authService';

export default function LeaderboardScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<LeaderboardMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<'user' | 'teacher'>('user');
  const [selectedTab, setSelectedTab] = useState<'user' | 'teacher'>('user');

  useEffect(() => {
    loadLeaderboard();
  }, [selectedTab]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const user = await getStoredUser();
      setCurrentUserId(user?.id || null);
      setCurrentUserRole(user?.role || 'user');

      const [topData, myRankData] = await Promise.all([
        getTopLeaderboard(50, selectedTab),
        getMyLeaderboardRank(),
      ]);

      setLeaderboard(topData);
      setMyRank(myRankData);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const renderLeaderboardItem = ({ item }: { item: LeaderboardEntry }) => {
    const isCurrentUser = item.userId === currentUserId;

    return (
      <View
        style={[
          styles.leaderboardItem,
          { backgroundColor: isCurrentUser ? colors.primary + '20' : colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.rankContainer}>
          <Text style={[styles.rankText, { color: item.rank <= 3 ? '#FFD700' : colors.text }]}>
            {getMedalEmoji(item.rank)}
          </Text>
        </View>
        <View style={styles.userInfo}>
          {item.avatarImage ? (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.nameContainer}>
            <Text style={[styles.nameText, { color: colors.text }]} numberOfLines={1}>
              {item.name}
              {isCurrentUser && <Text style={styles.youBadge}> (You)</Text>}
            </Text>
          </View>
        </View>
        <View style={styles.pointsContainer}>
          <Text style={[styles.pointsText, { color: colors.primary }]}>{item.totalPoints}</Text>
          <Text style={[styles.pointsLabel, { color: colors.textSecondary }]}>pts</Text>
        </View>
      </View>
    );
  };

  const styles = getStyles(colors);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading leaderboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backText, { color: colors.primary }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>🏆 Leaderboard</Text>
      </View>

      {myRank && (
        <View style={[styles.myRankCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.myRankLabel, { color: colors.textSecondary }]}>Your Rank</Text>
          <View style={styles.myRankContent}>
            <Text style={[styles.myRankNumber, { color: colors.primary }]}>#{myRank.rank}</Text>
            <Text style={[styles.myRankPoints, { color: colors.text }]}>{myRank.totalPoints} points</Text>
            <Text style={[styles.myRankOutOf, { color: colors.textSecondary }]}>out of {myRank.outOf}</Text>
          </View>
        </View>
      )}

      <FlatList
        data={leaderboard}
        renderItem={renderLeaderboardItem}
        keyExtractor={(item) => item.userId}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No leaderboard data available</Text>
          </View>
        }
      />
    </View>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    loadingText: {
      marginTop: 10,
      fontSize: 14,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 15,
      paddingTop: 60,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      marginRight: 15,
    },
    backText: {
      fontSize: 24,
      fontWeight: '600',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
    },
    myRankCard: {
      margin: 15,
      padding: 20,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
    },
    myRankLabel: {
      fontSize: 14,
      marginBottom: 10,
    },
    myRankContent: {
      alignItems: 'center',
    },
    myRankNumber: {
      fontSize: 36,
      fontWeight: 'bold',
    },
    myRankPoints: {
      fontSize: 18,
      fontWeight: '600',
      marginTop: 5,
    },
    myRankOutOf: {
      fontSize: 14,
      marginTop: 5,
    },
    listContent: {
      padding: 15,
    },
    leaderboardItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 15,
      borderRadius: 12,
      marginBottom: 10,
      borderWidth: 1,
    },
    rankContainer: {
      width: 50,
      alignItems: 'center',
    },
    rankText: {
      fontSize: 18,
      fontWeight: 'bold',
    },
    userInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 10,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 'bold',
    },
    nameContainer: {
      flex: 1,
      marginLeft: 12,
    },
    nameText: {
      fontSize: 16,
      fontWeight: '600',
    },
    youBadge: {
      color: '#10b981',
      fontSize: 14,
      fontWeight: 'bold',
    },
    pointsContainer: {
      alignItems: 'flex-end',
    },
    pointsText: {
      fontSize: 20,
      fontWeight: 'bold',
    },
    pointsLabel: {
      fontSize: 12,
      marginTop: 2,
    },
    emptyContainer: {
      padding: 40,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 16,
    },
  });
