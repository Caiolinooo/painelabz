"use client";

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUpload, FiX, FiFile, FiImage, FiPaperclip, FiLoader } from 'react-icons/fi';
import { useI18n } from '@/contexts/I18nContext';
import { uploadReimbursementAttachment } from '@/services/reimbursementService';
import toast from 'react-hot-toast';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  file?: File;
  url?: string;
  uploading?: boolean;
  uploadError?: string;
  buffer?: ArrayBuffer | null; // Dados binários do arquivo
  isLocalFile?: boolean; // Indica se o arquivo é local
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

  const processFiles = useCallback(async (fileList: FileList) => {
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

    // First add all files with uploading status
    Array.from(fileList).forEach(file => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        hasErrors = true;
        return;
      }

      const tempId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Criar um objeto para armazenar os dados binários do arquivo
      const reader = new FileReader();

      // Adicionar o arquivo à lista de novos arquivos
      newFiles.push({
        id: tempId,
        name: file.name,
        size: file.size,
        type: file.type,
        file: file,
        uploading: true
      });

      // Ler o arquivo como DataURL para obter os dados binários em base64
      reader.readAsDataURL(file);

      // Quando a leitura for concluída, armazenar os dados binários
      reader.onload = () => {
        const dataUrl = reader.result as string;

        // Atualizar o arquivo com os dados binários
        const fileIndex = newFiles.findIndex(f => f.id === tempId);
        if (fileIndex !== -1) {
          newFiles[fileIndex] = {
            ...newFiles[fileIndex],
            buffer: dataUrl, // Armazenar os dados como DataURL
            isLocalFile: true // Marcar como arquivo local
          };

          console.log(`Dados binários capturados para ${file.name} (${dataUrl.length} caracteres)`);

          // Atualizar o estado com os dados binários
          onFilesChange([...files, ...newFiles]);
        }
      };

      // Adicionar um handler para erros de leitura
      reader.onerror = (error) => {
        console.error(`Erro ao ler arquivo ${file.name}:`, error);

        // Atualizar o arquivo com o erro
        const fileIndex = newFiles.findIndex(f => f.id === tempId);
        if (fileIndex !== -1) {
          newFiles[fileIndex] = {
            ...newFiles[fileIndex],
            uploadError: 'Erro ao ler o arquivo'
          };

          // Atualizar o estado com o erro
          onFilesChange([...files, ...newFiles]);
        }
      };
    });

    if (!hasErrors) {
      // Add the files to state with uploading status
      onFilesChange([...files, ...newFiles]);

      // Upload each file to Supabase
      for (let i = 0; i < newFiles.length; i++) {
        const fileToUpload = newFiles[i];
        const file = fileToUpload.file;

        if (!file) continue;

        try {
          // Try to upload the file to Supabase
          try {
            const uploadedFile = await uploadReimbursementAttachment(file);

            // Update the file with the upload result
            const updatedFile = {
              ...fileToUpload,
              id: uploadedFile.id,
              url: uploadedFile.url,
              uploading: false
            };

            // Update the file in the array
            newFiles[i] = updatedFile;

            // Update the state with the current progress
            onFilesChange([
              ...files,
              ...newFiles.map((f, index) => index === i ? updatedFile : f)
            ]);
          } catch (uploadError) {
            console.error('Error uploading file to Supabase:', uploadError);

            // If the error is related to the bucket not existing or RLS policies, use a local fallback
            if (uploadError instanceof Error &&
                (uploadError.message.includes('bucket') ||
                 uploadError.message.includes('not found') ||
                 uploadError.message.includes('does not exist') ||
                 uploadError.message.includes('row-level security') ||
                 uploadError.message.includes('RLS') ||
                 uploadError.message.includes('policy') ||
                 uploadError.message.includes('permission denied'))) {

              console.log('Using local file reference as fallback due to storage error:', uploadError.message);

              // Generate a local ID for the file
              const localId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

              // Create a local URL for the file (this will be temporary)
              const localUrl = URL.createObjectURL(file);

              // Update the file with local reference
              const localFile = {
                ...fileToUpload,
                id: localId,
                url: localUrl,
                uploading: false,
                isLocalFile: true, // Mark as local file
                buffer: fileToUpload.buffer // Manter os dados binários
              };

              // Update the file in the array
              newFiles[i] = localFile;

              // Update the state with the local file
              onFilesChange([
                ...files,
                ...newFiles.map((f, index) => index === i ? localFile : f)
              ]);

              // Show warning toast with appropriate message
              const errorType = uploadError.message.includes('row-level security') ||
                                uploadError.message.includes('RLS') ||
                                uploadError.message.includes('policy') ||
                                uploadError.message.includes('permission denied')
                ? 'RLS policy'
                : 'bucket';

              // Use a simple alert instead of toast to avoid any issues
              alert(
                isEnglish
                  ? `File stored locally due to storage ${errorType} issues. The file will be included in your submission, but may not be permanently stored.`
                  : `Arquivo armazenado localmente devido a problemas de ${errorType === 'RLS policy' ? 'permissão' : 'bucket'} no armazenamento. O arquivo será incluído na sua solicitação, mas pode não ser armazenado permanentemente.`
              );
            } else {
              // For other errors, show the error
              throw uploadError;
            }
          }
        } catch (err) {
          console.error('Error processing file:', err);

          // Update the file with the error
          const errorFile = {
            ...fileToUpload,
            uploading: false,
            uploadError: err instanceof Error ? err.message : 'Erro ao fazer upload'
          };

          // Update the file in the array
          newFiles[i] = errorFile;

          // Update the state with the error
          onFilesChange([
            ...files,
            ...newFiles.map((f, index) => index === i ? errorFile : f)
          ]);

          // Show error alert with more details
          const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
          alert(isEnglish
            ? `Error uploading ${fileToUpload.name}: ${errorMessage}`
            : `Erro ao fazer upload de ${fileToUpload.name}: ${errorMessage}`);
        }
      }

      // Final update with all files processed
      onFilesChange([...files, ...newFiles]);
    }
  }, [files, maxFiles, onFilesChange, validateFile, isEnglish]);

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
                    className={`flex items-center justify-between bg-white p-2 rounded border ${
                      file.uploadError ? 'border-red-300 bg-red-50' :
                      file.uploading ? 'border-blue-300 bg-blue-50' :
                      'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center">
                      {file.uploading ? (
                        <div className="animate-spin">
                          <FiLoader className="w-5 h-5 text-blue-500" />
                        </div>
                      ) : file.uploadError ? (
                        <FiX className="w-5 h-5 text-red-500" />
                      ) : (
                        getFileIcon(file.type)
                      )}
                      <div className="ml-2">
                        <p className="text-sm font-medium text-gray-700 truncate max-w-xs">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {file.uploadError ? (
                            <span className="text-red-500">{file.uploadError}</span>
                          ) : file.uploading ? (
                            <span className="text-blue-500">{isEnglish ? 'Uploading...' : 'Enviando...'}</span>
                          ) : (
                            formatFileSize(file.size)
                          )}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile(file.id);
                      }}
                      className="text-gray-400 hover:text-red-500 focus:outline-none"
                      disabled={file.uploading}
                    >
                      <FiX className={`h-5 w-5 ${file.uploading ? 'opacity-50 cursor-not-allowed' : ''}`} />
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