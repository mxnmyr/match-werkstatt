import React, { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Notification() {
  const { state, dispatch } = useApp();

  useEffect(() => {
    if (state.notification) {
      const timer = setTimeout(() => {
        dispatch({ type: 'HIDE_NOTIFICATION' });
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [state.notification, dispatch]);

  if (!state.notification) return null;

  const { message, type } = state.notification;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className={`${getBackgroundColor()} border rounded-lg p-4 shadow-lg`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-gray-900">{message}</p>
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={() => dispatch({ type: 'HIDE_NOTIFICATION' })}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}