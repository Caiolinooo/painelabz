'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { FiX, FiAlertCircle, FiCheckCircle, FiInfo, FiAlertTriangle } from 'react-icons/fi';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertOptions {
  title?: string;
  message: string;
  type?: AlertType;
  onConfirm?: () => void;
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider');
  }
  return context;
};

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alert, setAlert] = useState<AlertOptions | null>(null);

  const showAlert = useCallback((options: AlertOptions) => {
    setAlert(options);
  }, []);

  const closeAlert = useCallback(() => {
    if (alert?.onConfirm) {
      alert.onConfirm();
    }
    setAlert(null);
  }, [alert]);

  const getIcon = () => {
    switch (alert?.type) {
      case 'success':
        return <FiCheckCircle className="w-6 h-6 text-green-600" />;
      case 'error':
        return <FiAlertCircle className="w-6 h-6 text-red-600" />;
      case 'warning':
        return <FiAlertTriangle className="w-6 h-6 text-yellow-600" />;
      default:
        return <FiInfo className="w-6 h-6 text-blue-600" />;
    }
  };

  const getColors = () => {
    switch (alert?.type) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      
      {alert && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 border-2 ${getColors()}`}>
            <div className="flex items-start gap-4">
              {getIcon()}
              <div className="flex-1">
                {alert.title && (
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{alert.title}</h3>
                )}
                <p className="text-gray-700">{alert.message}</p>
              </div>
              <button
                onClick={closeAlert}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={closeAlert}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
};
