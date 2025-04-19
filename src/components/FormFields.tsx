"use client";

import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';

interface FieldBaseProps {
  id: string;
  label: string;
  error?: string | { message?: string };
  required?: boolean;
}

interface InputFieldProps extends FieldBaseProps {
  value: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  mask?: (value: string) => string;
  className?: string;
}

interface TextAreaProps extends FieldBaseProps {
  value: string | null;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps extends FieldBaseProps {
  value: string | null;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void;
  options: SelectOption[];
  className?: string;
}

interface RadioOption {
  value: string;
  label: string;
}

interface RadioGroupProps extends FieldBaseProps {
  value: string | null;
  onChange: (value: string) => void;
  options: RadioOption[];
  className?: string;
}

// Animation variants for form elements
const inputVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

// Estilo para garantir que os elementos sejam sempre visíveis
const alwaysVisibleStyle = { opacity: 1 };

// Input Field Component
export const InputField: React.FC<InputFieldProps> = ({
  id,
  label,
  value,
  onChange,
  onBlur,
  type = 'text',
  placeholder,
  error,
  required = false,
  mask,
  className = '',
}) => {
  // Handle input change with optional masking
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (mask) {
      e.target.value = mask(e.target.value);
    }
    onChange(e);
  };

  // Extract error message if it's an object
  const errorMessage = typeof error === 'object' ? error?.message : error;

  return (
    <motion.div className={`mb-4 ${className}`} variants={inputVariants} style={{ opacity: 1 }}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value || ''}
        onChange={handleChange}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          errorMessage ? 'border-red-500' : 'border-gray-300'
        } bg-white`}
      />
      {errorMessage && <p className="mt-1 text-sm text-red-500">{errorMessage}</p>}
    </motion.div>
  );
};

// Textarea Component
export const TextArea: React.FC<TextAreaProps> = ({
  id,
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  rows = 4,
  error,
  required = false,
  className = '',
}) => {
  // Extract error message if it's an object
  const errorMessage = typeof error === 'object' ? error?.message : error;

  return (
    <motion.div className={`mb-4 ${className}`} variants={inputVariants} style={{ opacity: 1 }}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <textarea
        id={id}
        value={value || ''}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={rows}
        className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          errorMessage ? 'border-red-500' : 'border-gray-300'
        } bg-white`}
      />
      {errorMessage && <p className="mt-1 text-sm text-red-500">{errorMessage}</p>}
    </motion.div>
  );
};

// Select Field Component
export const SelectField: React.FC<SelectFieldProps> = ({
  id,
  label,
  value,
  onChange,
  onBlur,
  options,
  error,
  required = false,
  className = '',
}) => {
  const { t } = useI18n();
  const isEnglish = t('locale.code') === 'en-US';
  // Extract error message if it's an object
  const errorMessage = typeof error === 'object' ? error?.message : error;

  return (
    <motion.div className={`mb-4 ${className}`} variants={inputVariants} style={{ opacity: 1 }}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        id={id}
        value={value || ''}
        onChange={onChange}
        onBlur={onBlur}
        className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          errorMessage ? 'border-red-500' : 'border-gray-300'
        } bg-white`}
      >
        <option value="">{isEnglish ? 'Select an option' : 'Selecione uma opção'}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {errorMessage && <p className="mt-1 text-sm text-red-500">{errorMessage}</p>}
    </motion.div>
  );
};

// Radio Group Component
export const RadioGroup: React.FC<RadioGroupProps> = ({
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
