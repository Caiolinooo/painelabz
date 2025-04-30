'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface RadioOption {
  value: string;
  label: string;
}

interface PaymentMethodRadioProps {
  id: string;
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  options: RadioOption[];
  error?: string | { message?: string };
  required?: boolean;
  className?: string;
}

// Animation variants for form elements
const inputVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

export const PaymentMethodRadio: React.FC<PaymentMethodRadioProps> = ({
  id,
  label,
  value,
  onChange,
  options,
  error,
  required = false,
  className = '',
}) => {
  // Extract error message if it's an object
  const errorMessage = typeof error === 'object' ? error?.message : error;

  return (
    <motion.div className={`mb-4 ${className}`} variants={inputVariants} style={{ opacity: 1 }}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="space-y-2">
        {options.map((option) => (
          <div key={option.value} className="flex items-center">
            <input
              id={`${id}-${option.value}`}
              type="radio"
              name={id}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <label
              htmlFor={`${id}-${option.value}`}
              className="ml-2 block text-sm text-gray-700"
            >
              {option.label}
            </label>
          </div>
        ))}
      </div>
      {errorMessage && <p className="mt-1 text-sm text-red-500">{errorMessage}</p>}
    </motion.div>
  );
};

export default PaymentMethodRadio;
