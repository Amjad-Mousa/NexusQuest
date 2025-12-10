import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { fetchConversations, type Conversation } from '../services/chatService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';

export default function ChatScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  const loadConversations = async () => {
    try {
      const userStr = await AsyncStorage.getItem('nexusquest-user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUserId(user.id);
      }
      
      const convs = await fetchConversations();
      setConversations(convs);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadConversations();
  }, []);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    }
  };

  const styles = getStyles(colors);

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => navigation.navigate('ChatDetail', {
        userId: item.id,
        userName: item.name,
      })}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.conversationName}>{item.name}</Text>
          <Text style={styles.conversationTime}>{formatTime(item.lastMessageAt)}</Text>
        </View>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{item.role}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptyText}>
            Start chatting with teachers or other students!
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
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
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: 10,
    fontSize: 14,
  },
  listContent: {
    padding: 15,
  },
  conversationItem: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  conversationName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  conversationTime: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  roleText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});
