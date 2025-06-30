import React, { useState } from 'react';
import { User, LogIn, Building2, UserPlus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import ClientRegistration from './ClientRegistration';

export default function Login() {
  const { state, dispatch } = useApp();
  const [loginType, setLoginType] = useState<'client' | 'workshop'>('client');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showRegistration, setShowRegistration] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) {
        if (res.status === 403) {
          setError('Account noch nicht bestätigt');
        } else {
          setError('Ungültige Anmeldedaten oder Account nicht gefunden');
        }
        return;
      }
      const data = await res.json();
      dispatch({ type: 'LOGIN', payload: data.user });
    } catch (err) {
      setError('Serverfehler beim Login');
    }
  };

  if (showRegistration) {
    return <ClientRegistration onClose={() => setShowRegistration(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Werkstatt-Verwaltung</h1>
          <p className="text-gray-600 mt-2">Bitte melden Sie sich an</p>
        </div>

        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setLoginType('client')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              loginType === 'client'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            Auftraggeber
          </button>
          <button
            type="button"
            onClick={() => setLoginType('workshop')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              loginType === 'workshop'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Building2 className="w-4 h-4 inline mr-2" />
            Werkstatt
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Benutzername
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={loginType === 'client' ? 'Ihr Benutzername' : 'werkstatt1'}
              required
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Passwort
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Passwort eingeben"
              required
            />
          </div>

          {loginType === 'workshop' && (
            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
              Demo-Accounts: werkstatt1 (admin123), werkstatt2/werkstatt3 (pass123)
            </div>
          )}

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Anmelden
          </button>

          {loginType === 'client' && (
            <button
              type="button"
              onClick={() => setShowRegistration(true)}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center mt-2"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Neuen Account erstellen
            </button>
          )}
        </form>
      </div>
    </div>
  );
}