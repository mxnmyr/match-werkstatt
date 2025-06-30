import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Login from './components/Login';
import Header from './components/Header';
import ClientDashboard from './components/ClientDashboard';
import WorkshopDashboard from './components/WorkshopDashboard';
import Notification from './components/Notification';

function AppContent() {
  const { state } = useApp();

  if (!state.isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main>
        {state.currentUser?.role === 'client' ? (
          <ClientDashboard />
        ) : (
          <WorkshopDashboard />
        )}
      </main>
      <Notification />
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;