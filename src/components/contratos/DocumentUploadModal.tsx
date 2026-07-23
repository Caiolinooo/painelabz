'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { 
    FiUpload, FiX, FiFile, FiAlertCircle, FiPlus, 
    FiTrash2, FiFileText, FiEdit2, FiFolderPlus, FiUsers 
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useI18n } from '@/contexts/I18nContext';
import { useRouter } from 'next/navigation';

interface DocumentUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialTab?: 'envelope' | 'templates';
}

export default function DocumentUploadModal({ isOpen, onClose, onSuccess, initialTab }: DocumentUploadModalProps) {
    const { t } = useI18n();
    const router = useRouter();

    // Mode tabs: 'envelope' or 'templates'
    const [activeTab, setActiveTab] = useState<'envelope' | 'templates'>('envelope');

    // Envelope Creation States
    const [titulo, setTitulo] = useState('');
    const [descricao, setDescricao] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    // Template Selector States (inside Envelope tab)
    const [useTemplate, setUseTemplate] = useState(false);
    const [templates, setTemplates] = useState<any[]>([]);
    const [colaboradores, setColaboradores] = useState<any[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [roleSigners, setRoleSigners] = useState<{ [role: string]: any }>({});

    // Template Management States (inside Templates tab)
    const [templatesLoading, setTemplatesLoading] = useState(true);
    const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
    const [templateTitulo, setTemplateTitulo] = useState('');
    const [templateDescricao, setTemplateDescricao] = useState('');
    const [templateRoles, setTemplateRoles] = useState<string[]>(['Colaborador']);
    const [templateNewRole, setTemplateNewRole] = useState('');
    const [templateFiles, setTemplateFiles] = useState<File[]>([]);

    const MAX_SIZE = 25 * 1024 * 1024;

    const resetForm = useCallback(() => {
        setTitulo('');
        setDescricao('');
        setFiles([]);
        setSelectedTemplateId('');
        setSelectedTemplate(null);
        setRoleSigners({});
        
        // Reset template form states
        setTemplateTitulo('');
        setTemplateDescricao('');
        setTemplateRoles(['Colaborador']);
        setTemplateFiles([]);
        setIsCreatingTemplate(false);
    }, []);

    const fetchTemplates = useCallback(async () => {
        try {
            setTemplatesLoading(true);
            const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
            const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
            const res = await fetch('/api/contracts/templates', { headers });
            const data = await res.json();
            if (data.success) {
                setTemplates(data.templates || []);
            }
        } catch (err) {
            console.error('Erro ao buscar templates:', err);
        } finally {
            setTemplatesLoading(false);
        }
    }, []);

    // Load templates and users
    useEffect(() => {
        if (isOpen) {
            if (initialTab) {
                setActiveTab(initialTab);
            } else {
                setActiveTab('envelope');
            }

            fetchTemplates();

            const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
            const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};

            // Fetch collaborators
            fetch('/api/users?limit=200', { headers })
                .then(res => res.json())
                .then(data => {
                    const users = data.users || (Array.isArray(data) ? data : []) || [];
                    setColaboradores(Array.isArray(users) ? users : []);
                })
                .catch(err => console.error('Erro ao buscar colaboradores:', err));
        }
    }, [isOpen, initialTab, fetchTemplates]);

    const handleTemplateChange = (id: string) => {
        setSelectedTemplateId(id);
        const temp = templates.find(t => t.id === id);
        setSelectedTemplate(temp || null);
        
        if (temp && temp.papeis) {
            const initialMap: any = {};
            temp.papeis.forEach((role: string) => {
                initialMap[role] = { type: 'colaborador', colaborador_id: '', name: '', email: '' };
            });
            setRoleSigners(initialMap);
        } else {
            setRoleSigners({});
        }
    };

    const updateRoleSigner = (role: string, val: any) => {
        setRoleSigners(prev => ({
            ...prev,
            [role]: val
        }));
    };

    const handleClose = () => {
        resetForm();
        setUseTemplate(false);
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
                toast.error(t('contratos.upload.not_pdf_error', { name: f.name }, `"${f.name}" não é um PDF e foi ignorado.`));
                continue;
            }
            if (f.size > MAX_SIZE) {
                toast.error(t('contratos.upload.size_error', { name: f.name }, `"${f.name}" excede o limite de 25MB e foi ignorado.`));
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

    const handleAddTemplateRole = () => {
        if (!templateNewRole.trim()) return;
        if (templateRoles.includes(templateNewRole.trim())) {
            toast.error('Este papel já foi adicionado');
            return;
        }
        setTemplateRoles([...templateRoles, templateNewRole.trim()]);
        setTemplateNewRole('');
    };

    const handleRemoveTemplateRole = (index: number) => {
        setTemplateRoles(templateRoles.filter((_, i) => i !== index));
    };

    const handleTemplateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selected = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
            if (selected.length !== e.target.files.length) {
                toast.error('Apenas arquivos PDF são permitidos');
            }
            setTemplateFiles([...templateFiles, ...selected]);
        }
    };

    const handleRemoveTemplateFile = (index: number) => {
        setTemplateFiles(templateFiles.filter((_, i) => i !== index));
    };

    const handleCreateTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!templateTitulo.trim()) {
            toast.error('Título é obrigatório');
            return;
        }
        if (templateFiles.length === 0) {
            toast.error('Selecione pelo menos um arquivo PDF');
            return;
        }
        if (templateRoles.length === 0) {
            toast.error('Adicione pelo menos um papel de assinante');
            return;
        }

        try {
            setIsUploading(true);
            const formData = new FormData();
            formData.append('titulo', templateTitulo.trim());
            formData.append('descricao', templateDescricao.trim());
            formData.append('papeis', JSON.stringify(templateRoles));
            templateFiles.forEach(file => {
                formData.append('files', file);
            });

            const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
            const res = await fetch('/api/contracts/templates', {
                method: 'POST',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: formData
            });

            const data = await res.json();
            if (data.success) {
                toast.success('Template criado com sucesso!');
                setTemplateTitulo('');
                setTemplateDescricao('');
                setTemplateRoles(['Colaborador']);
                setTemplateFiles([]);
                setIsCreatingTemplate(false);
                fetchTemplates();
            } else {
                toast.error(data.error || 'Erro ao criar template');
            }
        } catch (err) {
            console.error(err);
            toast.error('Erro ao conectar ao servidor');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Deseja realmente excluir este template? Todos os documentos e posições de campos salvos serão excluídos.')) {
            return;
        }

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
            const res = await fetch(`/api/contracts/templates?id=${id}`, {
                method: 'DELETE',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                }
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Template excluído');
                fetchTemplates();
            } else {
                toast.error(data.error || 'Erro ao excluir');
            }
        } catch (err) {
            console.error(err);
            toast.error('Erro ao excluir template');
        }
    };

    const handleEditTemplateFields = (id: string) => {
        handleClose();
        router.push(`/contratos/templates/${id}`);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (useTemplate) {
            if (!selectedTemplateId || !titulo.trim()) {
                toast.error('Título e template são obrigatórios.');
                return;
            }

            const errors: string[] = [];
            const processedSigners: any = {};

            selectedTemplate.papeis.forEach((role: string) => {
                const s = roleSigners[role];
                if (!s) {
                    errors.push(`Defina o assinante para o papel: ${role}`);
                    return;
                }
                if (s.type === 'colaborador') {
                    if (!s.colaborador_id) {
                        errors.push(`Selecione o colaborador para o papel: ${role}`);
                    } else {
                        processedSigners[role] = {
                            colaborador_id: s.colaborador_id,
                            external_name: null,
                            external_email: null
                        };
                    }
                } else {
                    if (!s.name.trim() || !s.email.trim()) {
                        errors.push(`Preencha nome e e-mail para o papel externo: ${role}`);
                    } else {
                        processedSigners[role] = {
                            colaborador_id: null,
                            external_name: s.name.trim(),
                            external_email: s.email.trim()
                        };
                    }
                }
            });

            if (errors.length > 0) {
                toast.error(errors[0]);
                return;
            }

            try {
                setIsUploading(true);
                const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
                const res = await fetch('/api/contracts/templates/use', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({
                        template_id: selectedTemplateId,
                        titulo: titulo.trim(),
                        descricao: descricao.trim() || null,
                        roles_mapping: Object.keys(processedSigners).reduce((acc: any, role) => {
                            const ps = processedSigners[role];
                            acc[role] = {
                                colaborador_id: ps.colaborador_id,
                                external_signer_name: ps.external_name,
                                external_signer_email: ps.external_email
                            };
                            return acc;
                        }, {})
                    })
                });

                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || 'Erro ao instanciar template');
                }

                toast.success('Envelope criado a partir do template com sucesso!');
                resetForm();
                setUseTemplate(false);
                onSuccess();
                onClose();
            } catch (err: any) {
                toast.error(err.message || 'Erro ao criar envelope a partir do template');
            } finally {
                setIsUploading(false);
            }
            return;
        }

        // Default blank PDFs envelope creation logic
        if (files.length === 0 || !titulo.trim()) {
            toast.error(t('contratos.upload.validation_error', 'Título e pelo menos um arquivo PDF são obrigatórios.'));
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
                throw new Error(data.error || t('contratos.upload.create_error', 'Erro ao criar envelope'));
            }

            toast.success(t('contratos.upload.success', 'Envelope e documentos enviados com sucesso!'));
            resetForm();
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.message || t('contratos.upload.send_error', 'Erro ao enviar envelope'));
        } finally {
            setIsUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className={`bg-white rounded-xl w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto transition-all ${
                activeTab === 'templates' && !isCreatingTemplate ? 'max-w-3xl' : 'max-w-lg'
            }`}>
                
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            {activeTab === 'envelope' ? (
                                <FiUpload className="w-5 h-5 text-blue-600" />
                            ) : (
                                <FiFileText className="w-5 h-5 text-blue-600" />
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                {activeTab === 'envelope' 
                                    ? t('contratos.upload.modal_title', 'Novo Envelope')
                                    : isCreatingTemplate 
                                        ? 'Novo Template' 
                                        : 'Templates de Contratos'}
                            </h3>
                            <p className="text-xs text-gray-500">
                                {activeTab === 'envelope'
                                    ? t('contratos.upload.modal_subtitle', 'Envie um ou mais PDFs agrupados')
                                    : isCreatingTemplate 
                                        ? 'Preencha os metadados e envie os arquivos base do template' 
                                        : 'Gerencie posições pré-definidas para assinaturas'}
                            </p>
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

                {/* Tab Navigation */}
                {!isCreatingTemplate && (
                    <div className="px-6 pt-4">
                        <div className="flex rounded-xl bg-gray-100 p-1">
                            <button
                                type="button"
                                onClick={() => { setActiveTab('envelope'); }}
                                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                                    activeTab === 'envelope'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900'
                                }`}
                                disabled={isUploading}
                            >
                                Criar Envelope
                            </button>
                            <button
                                type="button"
                                onClick={() => { setActiveTab('templates'); }}
                                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                                    activeTab === 'templates'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900'
                                }`}
                                disabled={isUploading}
                            >
                                Gerenciar Templates
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'envelope' ? (
                    <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                        {/* Sub-tabs: Blank vs Template */}
                        <div className="flex rounded-xl bg-gray-100 p-1">
                            <button
                                type="button"
                                onClick={() => { setUseTemplate(false); resetForm(); }}
                                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                                    !useTemplate
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900'
                                }`}
                                disabled={isUploading}
                            >
                                Documentos em Branco
                            </button>
                            <button
                                type="button"
                                onClick={() => { setUseTemplate(true); resetForm(); }}
                                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                                    useTemplate
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900'
                                }`}
                                disabled={isUploading}
                            >
                                Usar Template
                            </button>
                        </div>

                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('contratos.upload.label_title', 'Nome do Envelope *')}</label>
                            <input
                                type="text"
                                value={titulo}
                                onChange={(e) => setTitulo(e.target.value)}
                                placeholder={t('contratos.upload.placeholder_title', 'Ex: Contratação - Lucas Santos')}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                disabled={isUploading}
                                required
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('contratos.upload.label_desc', 'Descrição (opcional)')}</label>
                            <textarea
                                value={descricao}
                                onChange={(e) => setDescricao(e.target.value)}
                                placeholder={t('contratos.upload.placeholder_desc', 'Ex: Contrato social + NDA')}
                                rows={2}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none font-sans"
                                disabled={isUploading}
                            />
                        </div>

                        {/* Conditionally Render: Template Selector vs File Drop Zone */}
                        {useTemplate ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Selecione o Template de Origem *</label>
                                    <select
                                        value={selectedTemplateId}
                                        onChange={e => handleTemplateChange(e.target.value)}
                                        required={useTemplate}
                                        disabled={isUploading}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="">-- Escolha um template --</option>
                                        {templates.map(t => (
                                            <option key={t.id} value={t.id}>{t.titulo}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Signer mapping */}
                                {selectedTemplate && selectedTemplate.papeis && selectedTemplate.papeis.length > 0 && (
                                    <div className="space-y-3 p-4 bg-gray-50 border border-gray-150 rounded-xl">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Atribuição de Assinantes por Papel</h4>
                                        <p className="text-[10px] text-gray-400">Vincule cada papel do template a um colaborador ou e-mail externo. As posições de assinaturas, caixas de texto e seleções serão replicadas automaticamente.</p>
                                        
                                        {selectedTemplate.papeis.map((role: string) => {
                                            const signer = roleSigners[role] || { type: 'colaborador', colaborador_id: '', name: '', email: '' };
                                            return (
                                                <div key={role} className="p-3 bg-white border border-gray-100 rounded-lg space-y-2 shadow-xs">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">{role}</span>
                                                        <div className="flex gap-1.5 text-[9px]">
                                                            <button
                                                                type="button"
                                                                onClick={() => updateRoleSigner(role, { ...signer, type: 'colaborador' })}
                                                                className={`font-bold px-2 py-0.5 rounded transition-all ${signer.type === 'colaborador' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'text-gray-400'}`}
                                                            >
                                                                Colaborador
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => updateRoleSigner(role, { ...signer, type: 'externo' })}
                                                                className={`font-bold px-2 py-0.5 rounded transition-all ${signer.type === 'externo' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'text-gray-400'}`}
                                                            >
                                                                E-mail Externo
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {signer.type === 'colaborador' ? (
                                                        <select
                                                            value={signer.colaborador_id}
                                                            onChange={e => updateRoleSigner(role, { ...signer, colaborador_id: e.target.value })}
                                                            required={useTemplate}
                                                            disabled={isUploading}
                                                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs"
                                                        >
                                                            <option value="">-- Selecione o Colaborador --</option>
                                                            {colaboradores.map(c => (
                                                                <option key={c.id || c._id} value={c.id || c._id}>
                                                                    {c.first_name} {c.last_name} ({c.email})
                                                                </option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <input
                                                                type="text"
                                                                placeholder="Nome Completo"
                                                                value={signer.name}
                                                                onChange={e => updateRoleSigner(role, { ...signer, name: e.target.value })}
                                                                required={useTemplate}
                                                                disabled={isUploading}
                                                                className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs"
                                                            />
                                                            <input
                                                                type="email"
                                                                placeholder="E-mail"
                                                                value={signer.email}
                                                                onChange={e => updateRoleSigner(role, { ...signer, email: e.target.value })}
                                                                required={useTemplate}
                                                                disabled={isUploading}
                                                                className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                {/* File Drop Zone */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('contratos.upload.label_files', 'Documentos PDF *')}</label>
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
                                                {t('contratos.upload.drag_title', 'Clique ou arraste seus PDFs')}
                                            </p>
                                            <p className="text-xs text-gray-400">{t('contratos.upload.drag_subtitle', 'Arquivos individuais até 25MB')}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Files List */}
                                {files.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                                            <FiFile className="w-3 h-3"/> {t('contratos.upload.selected_files', { count: files.length }, 'Arquivos selecionados')}
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
                                        {t('contratos.upload.info_notice', 'Os documentos serão processados no mesmo envelope e sequenciados após a configuração das assinaturas.')}
                                    </p>
                                </div>
                            </>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={isUploading}
                                className="px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                {t('contratos.upload.btn_cancel', 'Cancelar')}
                            </button>
                            <button
                                type="submit"
                                disabled={(useTemplate ? !selectedTemplateId : files.length === 0) || !titulo.trim() || isUploading}
                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium shadow-sm"
                            >
                                {isUploading ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                ) : (
                                    <FiPlus className="w-4 h-4" />
                                )}
                                {isUploading ? t('contratos.upload.btn_processing', 'Processando...') : t('contratos.upload.btn_submit', 'Criar Envelope')}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="px-6 py-5">
                        {isCreatingTemplate ? (
                            <form onSubmit={handleCreateTemplate} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Título do Template *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ex: Contrato de Trabalho CLT Padrão"
                                        value={templateTitulo}
                                        onChange={e => setTemplateTitulo(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors outline-none text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Descrição / Instruções</label>
                                    <textarea
                                        rows={2}
                                        placeholder="Instruções para quem for preencher o envelope a partir deste template..."
                                        value={templateDescricao}
                                        onChange={e => setTemplateDescricao(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-none outline-none text-sm font-sans"
                                    />
                                </div>

                                {/* Roles setup */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                                        <FiUsers className="text-gray-400" />
                                        Papéis de Assinantes / Preenchedores *
                                    </label>
                                    <p className="text-xs text-gray-500 mb-2">
                                        Adicione os papéis envolvidos neste template (ex: Colaborador, Testemunha, Gestor). No envio, você vinculará cada papel a uma pessoa real.
                                    </p>
                                    <div className="flex gap-2 mb-3">
                                        <input
                                            type="text"
                                            placeholder="Ex: Gestor de RH"
                                            value={templateNewRole}
                                            onChange={e => setTemplateNewRole(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTemplateRole())}
                                            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddTemplateRole}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors text-sm font-semibold"
                                        >
                                            <FiPlus className="w-4 h-4" /> Adicionar
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {templateRoles.map((role, idx) => (
                                            <span 
                                                key={idx} 
                                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-lg border border-gray-200"
                                            >
                                                {role}
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleRemoveTemplateRole(idx)} 
                                                    className="text-gray-400 hover:text-red-500 rounded-full"
                                                >
                                                    <FiX className="w-3.5 h-3.5" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Files setup */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Documentos do Template *</label>
                                    <div className="border-2 border-dashed border-gray-200 hover:border-blue-500 rounded-2xl p-6 text-center transition-colors relative cursor-pointer">
                                        <input
                                            type="file"
                                            multiple
                                            accept=".pdf"
                                            onChange={handleTemplateFileChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <FiFolderPlus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                        <p className="text-sm font-medium text-gray-900">Arraste ou clique para enviar os PDFs</p>
                                        <p className="text-xs text-gray-500 mt-1">Apenas arquivos PDF (máx 25MB)</p>
                                    </div>

                                    {templateFiles.length > 0 && (
                                        <div className="mt-4 space-y-2">
                                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Arquivos selecionados ({templateFiles.length})</h4>
                                            {templateFiles.map((file, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <FiFileText className="text-blue-500 flex-shrink-0" />
                                                        <span className="text-sm text-gray-700 truncate font-medium">{file.name}</span>
                                                        <span className="text-xs text-gray-400 flex-shrink-0">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveTemplateFile(idx)}
                                                        className="text-gray-400 hover:text-red-500 p-1 rounded-lg hover:bg-gray-100"
                                                    >
                                                        <FiTrash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Form Actions */}
                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreatingTemplate(false)}
                                        className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isUploading}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed rounded-xl transition-colors text-sm font-medium shadow-sm"
                                    >
                                        {isUploading ? 'Salvando...' : 'Criar Template e Avançar →'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Templates Cadastrados</h4>
                                    <button
                                        onClick={() => setIsCreatingTemplate(true)}
                                        className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors text-xs font-semibold shadow-sm"
                                    >
                                        <FiPlus className="w-4 h-4" /> Novo Template
                                    </button>
                                </div>

                                {templatesLoading ? (
                                    <div className="py-12 text-center text-gray-400">
                                        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                        Carregando templates...
                                    </div>
                                ) : templates.length === 0 ? (
                                    <div className="py-16 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                                        <FiFileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-sm text-gray-900 font-medium">Nenhum template criado</p>
                                        <p className="text-xs text-gray-500 mt-1 mb-4">Crie templates para agilizar a elaboração de envelopes repetitivos.</p>
                                        <button
                                            onClick={() => setIsCreatingTemplate(true)}
                                            className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-xs font-semibold"
                                        >
                                            Criar Meu Primeiro Template
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {templates.map((template) => (
                                            <div 
                                                key={template.id} 
                                                onClick={() => handleEditTemplateFields(template.id)}
                                                className="group flex flex-col justify-between p-4 border border-gray-150 rounded-2xl hover:shadow-md hover:border-blue-500 transition-all cursor-pointer bg-white"
                                            >
                                                <div>
                                                    <div className="flex items-start justify-between">
                                                        <h5 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors text-sm truncate pr-4">
                                                            {template.titulo}
                                                        </h5>
                                                        <button
                                                            onClick={(e) => handleDeleteTemplate(template.id, e)}
                                                            className="text-gray-400 hover:text-red-500 p-1 rounded-lg hover:bg-gray-100 flex-shrink-0"
                                                            title="Excluir Template"
                                                        >
                                                            <FiTrash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 min-h-[2rem]">
                                                        {template.descricao || 'Sem descrição.'}
                                                    </p>
                                                </div>

                                                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                                                    <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-600 font-semibold px-2 py-0.5 rounded">
                                                        <FiUsers className="w-3 h-3" />
                                                        {template.papeis ? template.papeis.length : 0} {template.papeis?.length === 1 ? 'Papel' : 'Papéis'}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEditTemplateFields(template.id)}
                                                        className="flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline"
                                                    >
                                                        <FiEdit2 className="w-3.5 h-3.5" /> Configurar Campos
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
