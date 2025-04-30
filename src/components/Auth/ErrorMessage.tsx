'use client';

import React from 'react';
import { FiAlertTriangle, FiInfo, FiX } from 'react-icons/fi';

interface ErrorMessageProps {
  message: string;
  type?: 'error' | 'warning' | 'info';
  onClose?: () => void;
}

export default function ErrorMessage({ message, type = 'error', onClose }: ErrorMessageProps) {
  const [visible, setVisible] = React.useState(true);

  if (!visible) return null;

  const handleClose = () => {
    setVisible(false);
    if (onClose) onClose();
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'error':
        return 'bg-red-100 border-red-400 text-red-700';
      case 'warning':
        return 'bg-yellow-100 border-yellow-400 text-yellow-700';
      case 'info':
        return 'bg-blue-100 border-blue-400 text-blue-700';
      default:
        return 'bg-red-100 border-red-400 text-red-700';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'error':
        return <FiAlertTriangle className="h-5 w-5 mr-2" />;
      case 'warning':
        return <FiAlertTriangle className="h-5 w-5 mr-2" />;
      case 'info':
        return <FiInfo className="h-5 w-5 mr-2" />;
      default:
        return <FiAlertTriangle className="h-5 w-5 mr-2" />;
    }
  };

  return (
    <div className={`${getBackgroundColor()} border px-4 py-3 rounded-md mb-4 flex items-center justify-between`}>
      <div className="flex items-center">
        {getIcon()}
        <span>{message}</span>
      </div>
      {onClose && (
        <button
          onClick={handleClose}
          className="ml-auto pl-3"
          aria-label="Fechar"
        >
          <FiX className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
