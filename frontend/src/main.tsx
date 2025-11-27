import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App.tsx'
import Home from './pages/Home.tsx'
import { Dashboard } from './pages/Dashboard.tsx'
import { Profile } from './pages/Profile.tsx'
import { Login } from './pages/Login.tsx'
import { Signup } from './pages/Signup.tsx'
import { Projects } from './pages/Projects.tsx'
import { ThemeProvider } from './context/ThemeContext.tsx'
import './index.css'

function Root() {
  const [user, setUser] = React.useState<{ name: string; email: string; avatarImage?: string } | null>(() => {
    const stored = localStorage.getItem('nexusquest-user');
    return stored ? JSON.parse(stored) : null;
  });

  const handleAuth = (userData: { id: string; name: string; email: string; avatarImage?: string }) => {
    setUser({ name: userData.name, email: userData.email, avatarImage: userData.avatarImage });
  };

  const handleLogout = () => {
    localStorage.removeItem('nexusquest-token');
    localStorage.removeItem('nexusquest-user');
    setUser(null);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Home />} />
        <Route path="/dashboard" element={user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
        <Route path="/profile" element={user ? <Profile user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
        <Route path="/editor" element={user ? <App user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
        <Route path="/projects" element={user ? <Projects user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
        <Route path="/project/:projectId" element={user ? <App user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
        <Route path="/login" element={<Login onLogin={handleAuth} />} />
        <Route path="/signup" element={<Signup onSignup={handleAuth} />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <Root />
    </ThemeProvider>
  </React.StrictMode>,
)