'use client';

import React, { useState, useCallback } from 'react';
import { FiUpload, FiX, FiFile, FiAlertCircle, FiPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface DocumentUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function DocumentUploadModal({ isOpen, onClose, onSuccess }: DocumentUploadModalProps) {
    const [titulo, setTitulo] = useState('');
    const [descricao, setDescricao] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const MAX_SIZE = 25 * 1024 * 1024;

    const resetForm = useCallback(() => {
        setTitulo('');
        setDescricao('');
        setFiles([]);
    }, []);

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const droppedFiles = Array.from(e.dataTransfer.files);
        if (droppedFiles.length > 0) {
            validateAndAddFiles(droppedFiles);
        }
    };

    const validateAndAddFiles = (incomingFiles: File[]) => {
        const validFiles: File[] = [];
        
        for (const f of incomingFiles) {
            if (!f.type.includes('pdf')) {
                toast.error(`"${f.name}" não é um PDF e foi ignorado.`);
                continue;
            }
            if (f.size > MAX_SIZE) {
                toast.error(`"${f.name}" excede o limite de 25MB e foi ignorado.`);
                continue;
            }
            validFiles.push(f);
        }

        setFiles(prev => [...prev, ...validFiles]);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files ? Array.from(e.target.files) : [];
        if (selected.length > 0) validateAndAddFiles(selected);
    };

    const removeFile = (idx: number) => {
        setFiles(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (files.length === 0 || !titulo.trim()) {
            toast.error('Título e pelo menos um arquivo PDF são obrigatórios.');
            return;
        }

        try {
            setIsUploading(true);

            const formData = new FormData();
            formData.append('titulo', titulo.trim());
            if (descricao.trim()) formData.append('descricao', descricao.trim());
            
            files.forEach(file => {
                formData.append('files', file);
            });

            const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
            const res = await fetch('/api/contracts/envelope', {
                method: 'POST',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Erro ao criar envelope');
            }

            toast.success('Envelope e documentos enviados com sucesso!');
            resetForm();
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.message || 'Erro ao enviar envelope');
        } finally {
            setIsUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <FiUpload className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Novo Envelope</h3>
                            <p className="text-xs text-gray-500">Envie um ou mais PDFs agrupados</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={isUploading}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors"
                    >
                        <FiX className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Envelope *</label>
                        <input
                            type="text"
                            value={titulo}
                            onChange={(e) => setTitulo(e.target.value)}
                            placeholder="Ex: Contratação - Lucas Santos"
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            disabled={isUploading}
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (opcional)</label>
                        <textarea
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            placeholder="Ex: Contrato social + NDA"
                            rows={2}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                            disabled={isUploading}
                        />
                    </div>

                    {/* File Drop Zone */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Documentos PDF *</label>
                        <div
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={handleDrop}
                            className={`relative border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer
                                ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                        >
                            <input
                                type="file"
                                accept=".pdf,application/pdf"
                                multiple
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                disabled={isUploading}
                            />
                            <div>
                                <FiUpload className="w-7 h-7 text-gray-400 mx-auto mb-1" />
                                <p className="text-sm text-gray-600 font-medium">
                                    Clique ou arraste seus PDFs
                                </p>
                                <p className="text-xs text-gray-400">Arquivos individuais até 25MB</p>
                            </div>
                        </div>
                    </div>

                    {/* Files List */}
                    {files.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                                <FiFile className="w-3 h-3"/> Arquivos selecionados ({files.length}):
                            </p>
                            <div className="max-h-40 overflow-y-auto space-y-1.5 border border-gray-100 rounded-lg p-2 bg-gray-50/50">
                                {files.map((f, index) => (
                                    <div key={index} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <FiFile className="w-4 h-4 text-blue-500 shrink-0" />
                                            <div className="truncate">
                                                <p className="text-xs font-medium text-gray-900 truncate" title={f.name}>{f.name}</p>
                                                <p className="text-[10px] text-gray-400">{(f.size / (1024 * 1024)).toFixed(2)} MB</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeFile(index)}
                                            disabled={isUploading}
                                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors shrink-0"
                                        >
                                            <FiX className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Info notice */}
                    <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                        <FiAlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-700 leading-relaxed">
                            Os documentos serão processados no mesmo envelope e sequenciados após a configuração das assinaturas.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isUploading}
                            className="px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={files.length === 0 || !titulo.trim() || isUploading}
                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                        >
                            {isUploading ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                            ) : (
                                <FiPlus className="w-4 h-4" />
                            )}
                            {isUploading ? 'Processando...' : 'Criar Envelope'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

