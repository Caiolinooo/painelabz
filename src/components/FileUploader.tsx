"use client";

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUpload, FiX, FiFile, FiImage, FiPaperclip } from 'react-icons/fi';
import { useI18n } from '@/contexts/I18nContext';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
}

interface FileUploaderProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxSizeInMB?: number;
  acceptedFileTypes?: string[];
}

const FileUploader: React.FC<FileUploaderProps> = ({
  files,
  onFilesChange,
  maxFiles = 5,
  maxSizeInMB = 10,
  acceptedFileTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
}) => {
  const { t } = useI18n();
  const isEnglish = t('locale.code') === 'en-US';
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
      setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    if (!acceptedFileTypes.includes(file.type)) {
      return isEnglish
        ? `Unsupported file type: ${file.type}`
        : `Tipo de arquivo não suportado: ${file.type}`;
    }

    // Check file size
    if (file.size > maxSizeInBytes) {
      return isEnglish
        ? `File too large: ${(file.size / (1024 * 1024)).toFixed(2)}MB (maximum: ${maxSizeInMB}MB)`
        : `Arquivo muito grande: ${(file.size / (1024 * 1024)).toFixed(2)}MB (máximo: ${maxSizeInMB}MB)`;
    }

    return null;
  }, [acceptedFileTypes, maxSizeInBytes, maxSizeInMB, isEnglish]);

  const processFiles = useCallback((fileList: FileList) => {
    setError(null);

    // Check if adding these files would exceed the maximum
    if (files.length + fileList.length > maxFiles) {
      setError(isEnglish
        ? `You can upload a maximum of ${maxFiles} files`
        : `Você pode enviar no máximo ${maxFiles} arquivos`);
      return;
    }

    const newFiles: UploadedFile[] = [];
    let hasErrors = false;

    Array.from(fileList).forEach(file => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        hasErrors = true;
        return;
      }

      newFiles.push({
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        file: file
      });
    });

    if (!hasErrors) {
      onFilesChange([...files, ...newFiles]);
    }
  }, [files, maxFiles, onFilesChange, validateFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      // Reset the input value so the same file can be selected again if removed
      e.target.value = '';
    }
  }, [processFiles]);

  const handleRemoveFile = useCallback((id: string) => {
    onFilesChange(files.filter(file => file.id !== id));
  }, [files, onFilesChange]);

  const getFileIcon = useCallback((fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <FiImage className="w-5 h-5 text-blue-500" />;
    } else if (fileType === 'application/pdf') {
      return <FiFile className="w-5 h-5 text-red-500" />;
    } else {
      return <FiPaperclip className="w-5 h-5 text-gray-500" />;
    }
  }, []);

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes < 1024) {
      return bytes + ' bytes';
    } else if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + ' KB';
    } else {
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
  }, []);

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {isEnglish ? 'Attachments' : 'Comprovantes'} <span className="text-red-500">*</span>
      </label>

      {/* Drag and drop area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          {isEnglish
            ? 'Drag and drop files here, or click to select'
            : 'Arraste e solte arquivos aqui, ou clique para selecionar'}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          {isEnglish
            ? `Accepted formats: PDF, JPG, PNG (max. ${maxSizeInMB}MB per file)`
            : `Formatos aceitos: PDF, JPG, PNG (máx. ${maxSizeInMB}MB por arquivo)`}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedFileTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {/* Error message */}
      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 text-sm text-red-600"
        >
          {error}
        </motion.p>
      )}

      {/* File list */}
      <div className="mt-4">
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-gray-50 rounded-md p-3"
            >
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                {isEnglish
                  ? `Selected files (${files.length}/${maxFiles})`
                  : `Arquivos selecionados (${files.length}/${maxFiles})`}
              </h4>
              <ul className="space-y-2">
                {files.map((file) => (
                  <motion.li
                    key={file.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center justify-between bg-white p-2 rounded border border-gray-200"
                  >
                    <div className="flex items-center">
                      {getFileIcon(file.type)}
                      <div className="ml-2">
                        <p className="text-sm font-medium text-gray-700 truncate max-w-xs">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile(file.id);
                      }}
                      className="text-gray-400 hover:text-red-500 focus:outline-none"
                    >
                      <FiX className="h-5 w-5" />
                    </button>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default FileUploader;