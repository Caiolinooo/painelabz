'use client';

import React, { ReactNode } from 'react';

interface CardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  onClick?: () => void;
  className?: string;
  actions?: ReactNode;
}

const Card: React.FC<CardProps> = ({
  title,
  description,
  icon,
  onClick,
  className = '',
  actions,
}) => {
  return (
    <div
      className={`rounded-lg shadow-md p-5 transition-shadow hover:shadow-lg flex flex-col h-full ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start mb-3">
        {icon && (
          <div className="bg-abz-light-blue p-3 rounded-full mr-3 flex-shrink-0">
            {icon}
          </div>
        )}
        <h3 className="font-semibold text-abz-text-black flex-1">{title}</h3>
      </div>

      {description && (
        <p className="text-sm text-abz-text-dark mb-4 flex-grow">{description}</p>
      )}

      {actions && <div className="mt-auto pt-4 border-t border-gray-100">{actions}</div>}
    </div>
  );
};

export default Card;
