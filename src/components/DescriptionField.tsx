'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TextArea } from './FormFields';

interface DescriptionFieldProps {
  id: string;
  label: string;
  value: string | null;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  error?: string | { message?: string };
  required?: boolean;
  rows?: number;
  className?: string;
}

// Animation variants for form elements
const inputVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

export const DescriptionField: React.FC<DescriptionFieldProps> = ({
  id,
  label,
  value,
  onChange,
  error,
  required = false,
  rows = 4,
  className = '',
}) => {
  return (
    <div className="mt-8 pt-4 border-t border-gray-200" style={{ opacity: 1 }}>
      <TextArea
        id={id}
        label={label}
        value={value}
        onChange={onChange}
        error={error}
        required={required}
        rows={rows}
      />
    </div>
  );
};

export default DescriptionField;
