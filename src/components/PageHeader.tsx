import React, { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  icon,
  actions,
}) => {
  return (
    <div className="pb-5 border-b border-gray-200 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {icon && <div className="mr-3">{icon}</div>}
          <div>
            <h1 className="text-3xl font-extrabold text-abz-blue-dark">{title}</h1>
            {description && (
              <p className="mt-2 text-sm text-gray-500">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="ml-4">{actions}</div>}
      </div>
    </div>
  );
};

export default PageHeader;
