import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.tsx'
import { Login } from './pages/Login.tsx'
import { Signup } from './pages/Signup.tsx'
import { Projects } from './pages/Projects.tsx'
import './index.css'

function Root() {
  const [user, setUser] = React.useState<{ name: string; email: string } | null>(() => {
    const stored = localStorage.getItem('nexusquest-user');
    return stored ? JSON.parse(stored) : null;
  });

  const handleAuth = (userData: { id: string; name: string; email: string }) => {
    setUser({ name: userData.name, email: userData.email });
  };

  const handleLogout = () => {
    localStorage.removeItem('nexusquest-token');
    localStorage.removeItem('nexusquest-user');
    setUser(null);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App user={user} onLogout={handleLogout} />} />
        <Route path="/projects" element={<Projects user={user} />} />
        <Route path="/project/:projectId" element={<App user={user} onLogout={handleLogout} />} />
        <Route path="/login" element={<Login onLogin={handleAuth} />} />
        <Route path="/signup" element={<Signup onSignup={handleAuth} />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)