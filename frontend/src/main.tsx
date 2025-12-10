import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App.tsx'
import Home from './pages/Home.tsx'
import { Dashboard } from './pages/Dashboard.tsx'
import { Profile } from './pages/Profile.tsx'
import UserProfilePage from './pages/UserProfilePage.tsx'
import { Login } from './pages/Login.tsx'
import { Signup } from './pages/Signup.tsx'
import { Projects } from './pages/Projects.tsx'
import TeacherDashboard from './pages/TeacherDashboard.tsx'
import { TeacherProfile } from './pages/TeacherProfile.tsx'
import { Playground } from './pages/Playground.tsx'
import TaskPage from './pages/TaskPage.tsx'
import TasksPage from './pages/TasksPage.tsx'
import QuizPage from './pages/QuizPage.tsx'
import QuizzesPage from './pages/QuizzesPage.tsx'
import QuizResultsPage from './pages/QuizResultsPage.tsx'
import TutorialCardView from './pages/TutorialCardView.tsx'
import TutorialsHomePage from './pages/TutorialsHomePage.tsx'
import { ChatPage } from './pages/ChatPage.tsx'
import { UsersPage } from './pages/UsersPage.tsx'
import LeaderboardPage from './pages/LeaderboardPage.tsx'
import CollaborationPage from './pages/CollaborationPage.tsx'

import { ThemeProvider } from './context/ThemeContext.tsx'
import { CollaborationProvider } from './context/CollaborationContext.tsx'
import './index.css'

function Root() {
  const [user, setUser] = React.useState<{ name: string; email: string; avatarImage?: string; role?: string } | null>(() => {
    const stored = localStorage.getItem('nexusquest-user');
    return stored ? JSON.parse(stored) : null;
  });

  const handleAuth = (userData: { id: string; name: string; email: string; avatarImage?: string; role?: string }) => {
    setUser({ name: userData.name, email: userData.email, avatarImage: userData.avatarImage, role: userData.role });
  };

  const handleLogout = () => {
    localStorage.removeItem('nexusquest-token');
    localStorage.removeItem('nexusquest-user');
    setUser(null);
  };

  const getDefaultRoute = () => {
    if (!user) return <Home />;
    return user.role === 'teacher' ? <Navigate to="/teacher" /> : <Navigate to="/dashboard" />;
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={getDefaultRoute()} />
        <Route path="/dashboard" element={user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
        <Route path="/profile" element={user ? <Profile user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
        <Route path="/user/:userId" element={user ? <UserProfilePage /> : <Navigate to="/" />} />
        <Route path="/teacher-profile" element={user ? <TeacherProfile /> : <Navigate to="/" />} />
        <Route path="/playground" element={user ? <Playground /> : <Navigate to="/" />} />
        <Route path="/editor" element={user ? <App user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
        <Route path="/projects" element={user ? <Projects user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
        <Route path="/project/:projectId" element={user ? <App user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
        <Route path="/teacher" element={user ? <TeacherDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
        <Route path="/tasks" element={user ? <TasksPage user={user} /> : <Navigate to="/" />} />
        <Route path="/task/:taskId" element={user ? <TaskPage user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
        <Route path="/quizzes" element={user ? <QuizzesPage /> : <Navigate to="/" />} />
        <Route path="/quiz/:id" element={user ? <QuizPage /> : <Navigate to="/" />} />
        <Route path="/quiz/:id/results" element={user ? <QuizResultsPage /> : <Navigate to="/" />} />
        <Route path="/tutorials" element={user ? <TutorialsHomePage /> : <Navigate to="/" />} />
        <Route path="/tutorials/:id" element={user ? <TutorialCardView /> : <Navigate to="/" />} />
        <Route path="/users" element={user ? <UsersPage /> : <Navigate to="/" />} />
        <Route path="/leaderboard" element={user ? <LeaderboardPage /> : <Navigate to="/" />} />
        <Route path="/chat/:userId" element={user ? <ChatPage /> : <Navigate to="/" />} />
        <Route path="/collaboration" element={user ? <CollaborationPage /> : <Navigate to="/" />} />
        <Route path="/collaboration/:sessionId" element={user ? <CollaborationPage /> : <Navigate to="/" />} />
        <Route path="/login" element={<Login onLogin={handleAuth} />} />
        <Route path="/signup" element={<Signup onSignup={handleAuth} />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <CollaborationProvider>
        <Root />
      </CollaborationProvider>
    </ThemeProvider>
  </React.StrictMode>,
)