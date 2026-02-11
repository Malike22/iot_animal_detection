import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';

function AppContent() {
  const [showSignup, setShowSignup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-green-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return showSignup ? (
      <Signup onToggleLogin={() => setShowSignup(false)} />
    ) : (
      <Login onToggleSignup={() => setShowSignup(true)} />
    );
  }

  if (showSettings) {
    return <Settings onBack={() => setShowSettings(false)} />;
  }

  return <Dashboard onOpenSettings={() => setShowSettings(true)} />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
