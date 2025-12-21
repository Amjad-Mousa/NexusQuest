import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import TutorialsScreen from './src/screens/TutorialsScreen';
import TutorialDetailScreen from './src/screens/TutorialDetailScreen';
import ChatScreen from './src/screens/ChatScreen';
import ChatDetailScreen from './src/screens/ChatDetailScreen';
import PlaygroundScreen from './src/screens/PlaygroundScreen';
import ProfileScreen from './src/screens/ProfileScreen';

import QuizzesScreen from './src/screens/QuizzesScreen';
import QuizDetailScreen from './src/screens/QuizDetailScreen';
import TeacherDashboardScreen from './src/screens/TeacherDashboardScreen';
import CreateTaskScreen from './src/screens/CreateTaskScreen';
import CreateQuizScreen from './src/screens/CreateQuizScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import ForumScreen from './src/screens/ForumScreen';
import QuestionDetailScreen from './src/screens/QuestionDetailScreen';
import AskQuestionScreen from './src/screens/AskQuestionScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';

const Stack = createStackNavigator();

function AppNavigator() {
  const { theme } = useTheme();

  return (
    <NavigationContainer>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Stack.Navigator 
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="TeacherDashboard" component={TeacherDashboardScreen} />
        <Stack.Screen name="CreateTask" component={CreateTaskScreen} />
        <Stack.Screen name="Tutorials" component={TutorialsScreen} />
        <Stack.Screen name="TutorialDetail" component={TutorialDetailScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
        <Stack.Screen name="Playground" component={PlaygroundScreen} />
        <Stack.Screen name="Quizzes" component={QuizzesScreen} />
        <Stack.Screen name="QuizDetail" component={QuizDetailScreen} />
        <Stack.Screen name="CreateQuiz" component={CreateQuizScreen} />
        <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
        <Stack.Screen name="Forum" component={ForumScreen} />
        <Stack.Screen name="QuestionDetail" component={QuestionDetailScreen} />
        <Stack.Screen name="AskQuestion" component={AskQuestionScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
}
