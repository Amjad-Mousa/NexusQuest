import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface BottomNavigationProps {
  navigation: any;
  activeRoute: string;
}

export default function BottomNavigation({ navigation, activeRoute }: BottomNavigationProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const navItems = [
    { name: 'Dashboard', icon: '🏠', label: 'Home' },
    { name: 'Tutorials', icon: '📚', label: 'Tutorials' },
    { name: 'Quizzes', icon: '📝', label: 'Quizzes' },
    { name: 'Chat', icon: '💬', label: 'Chat' },
    { name: 'Leaderboard', icon: '🏆', label: 'Rank' },
  ];

  return (
    <View style={styles.container}>
      {navItems.map((item) => {
        const isActive = activeRoute === item.name;
        return (
          <TouchableOpacity
            key={item.name}
            style={styles.navItem}
            onPress={() => navigation.navigate(item.name)}
          >
            <Text style={[styles.icon, isActive && styles.activeIcon]}>
              {item.icon}
            </Text>
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: 20,
    paddingTop: 10,
    paddingHorizontal: 5,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  icon: {
    fontSize: 24,
    marginBottom: 4,
    opacity: 0.6,
  },
  activeIcon: {
    opacity: 1,
  },
  label: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  activeLabel: {
    color: colors.primary,
    fontWeight: '700',
  },
});
