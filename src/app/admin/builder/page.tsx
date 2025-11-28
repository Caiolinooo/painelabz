'use client';

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import {
    FiPlus, FiTrash, FiSave, FiEdit, FiBox, FiType, FiList,
    FiCalendar, FiCheckSquare, FiHash, FiFile, FiMoreVertical, FiSettings, FiX, FiSearch,
    FiGrid, FiActivity, FiDatabase, FiTool, FiArrowLeft, FiEye, FiEyeOff
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';

// --- Types ---

type FieldType = 'text' | 'number' | 'date' | 'boolean' | 'select' | 'file' | 'relation' | 'rich_text';

interface Field {
    id?: string;
    name: string;
    label: string;
    type: FieldType;
    required: boolean;
    is_list_visible: boolean;
    options?: any;
}

interface ModuleFormData {
    id?: string;
    title: string;
    key: string;
    description: string;
    icon: string;
    fields: Field[];
    is_system?: boolean;
}

// --- Icons Mapping ---
const FIELD_ICONS: Record<FieldType, React.ReactNode> = {
    text: <FiType />,
    number: <FiHash />,
    date: <FiCalendar />,
    boolean: <FiCheckSquare />,
    select: <FiList />,
    file: <FiFile />,
    relation: <FiBox />,
    rich_text: <FiType />,
};

// --- Helpers ---
const slugify = (text: string) => {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD') // Split accented characters
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(/[^\w\-]+/g, '') // Remove all non-word chars
        .replace(/\-\-+/g, '-') // Replace multiple - with single -
        .replace(/^-+/, '') // Trim - from start
        .replace(/-+$/, ''); // Trim - from end
};

const snakeCase = (text: string) => {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^\w\_]+/g, '')
        .replace(/__+/g, '_');
};

// --- Components ---

const FieldEditor = ({ index, register, control, remove, watch, setValue, isAdvanced }: any) => {
    const type = watch(`fields.${index}.type`);
    const label = watch(`fields.${index}.label`);
    const [isExpanded, setIsExpanded] = useState(true);

    // Auto-generate database name from label if name is empty
    useEffect(() => {
        const currentName = watch(`fields.${index}.name`);
        if (label && (!currentName || !isAdvanced)) {
            setValue(`fields.${index}.name`, snakeCase(label));
        }
    }, [label, isAdvanced, setValue, watch, index]);

    return (
        <div className="bg-white border rounded-lg mb-3 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center p-3 bg-gray-50 border-b rounded-t-lg cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="mr-3 text-gray-500">
                    {FIELD_ICONS[type as FieldType] || <FiType />}
                </div>
                <div className="flex-1">
                    <h4 className="font-medium text-sm text-gray-900">
                        {label || 'New Field'}
                    </h4>
                    <p className="text-xs text-gray-500 font-mono">
                        {type === 'select' ? 'Dropdown' : type === 'rich_text' ? 'Long Text' : type}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); remove(index); }} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                        <FiTrash />
                    </Button>
                </div>
            </div>

            {isExpanded && (
                <div className="p-4 grid grid-cols-2 gap-4">
                    <div className="col-span-2 md:col-span-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Field Name (What the user sees)</label>
                        <input
                            {...register(`fields.${index}.label`, { required: true })}
                            className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="e.g. Product Name"
                        />
                    </div>

                    <div className="col-span-2 md:col-span-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Data Type</label>
                        <select
                            {...register(`fields.${index}.type`)}
                            className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="text">Short Text</option>
                            <option value="rich_text">Long Text / Description</option>
                            <option value="number">Number / Currency</option>
                            <option value="date">Date / Time</option>
                            <option value="boolean">Yes / No Switch</option>
                            <option value="select">Dropdown List</option>
                            <option value="file">File Upload</option>
                        </select>
                    </div>

                    {isAdvanced && (
                        <div className="col-span-2 bg-gray-50 p-2 rounded border border-gray-200">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Database Column (Technical)</label>
                            <input
                                {...register(`fields.${index}.name`, { required: true, pattern: /^[a-z0-9_]+$/ })}
                                className="w-full px-2 py-1 border rounded text-xs font-mono bg-white"
                                placeholder="e.g. product_name"
                            />
                        </div>
                    )}

                    {type === 'select' && (
                        <div className="col-span-2 bg-blue-50 p-3 rounded-md border border-blue-100">
                            <label className="block text-xs font-medium text-blue-800 mb-1">Dropdown Options (comma separated)</label>
                            <Controller
                                control={control}
                                name={`fields.${index}.options`}
                                render={({ field }) => (
                                    <input
                                        {...field}
                                        value={Array.isArray(field.value) ? field.value.join(', ') : field.value || ''}
                                        onChange={(e) => field.onChange(e.target.value.split(',').map((s: string) => s.trim()))}
                                        className="w-full px-3 py-2 border border-blue-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="e.g. Pending, In Progress, Completed"
                                    />
                                )}
                            />
                        </div>
                    )}

                    <div className="col-span-2 flex gap-6 pt-2 border-t mt-2">
                        <label className="flex items-center text-sm text-gray-700 cursor-pointer">
                            <input
                                type="checkbox"
                                {...register(`fields.${index}.required`)}
                                className="mr-2 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            Required
                        </label>
                        <label className="flex items-center text-sm text-gray-700 cursor-pointer">
                            <input
                                type="checkbox"
                                {...register(`fields.${index}.is_list_visible`)}
                                defaultChecked={true}
                                className="mr-2 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            Show in List
                        </label>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Main Page Component ---

export default function SystemManagerPage() {
    const [modules, setModules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'dashboard' | 'editor'>('dashboard');
    const [searchTerm, setSearchTerm] = useState('');
    const [isAdvanced, setIsAdvanced] = useState(false);

    const { register, control, handleSubmit, reset, watch, setValue } = useForm<ModuleFormData>({
        defaultValues: {
            title: '',
            key: '',
            description: '',
            icon: 'FiBox',
            fields: [],
            is_system: false
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "fields"
    });

    const selectedId = watch('id');
    const title = watch('title');

    // Auto-generate key from title
    useEffect(() => {
        if (title && !selectedId && !isAdvanced) {
            setValue('key', slugify(title));
        }
    }, [title, selectedId, isAdvanced, setValue]);

    useEffect(() => {
        fetchModules();
    }, []);

    const getAuthHeaders = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return {
            'Content-Type': 'application/json',
            'Authorization': session?.access_token ? `Bearer ${session.access_token}` : ''
        };
    };

    const fetchModules = async () => {
        try {
            const headers = await getAuthHeaders();
            const res = await fetch('/api/admin/modules', { headers });
            if (res.status === 403) throw new Error('Permission denied. You must be an admin.');
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setModules(data);
        } catch (error: any) {
            console.error('Error fetching modules:', error);
            toast.error(error.message || 'Failed to load modules');
        } finally {
            setLoading(false);
        }
    };

    const handleEditModule = (module: any) => {
        reset({
            id: module.id,
            title: module.title,
            key: module.key,
            description: module.description || '',
            icon: module.icon || 'FiBox',
            fields: module.fields || [],
            is_system: module.is_system
        });
        setView('editor');
    };

    const handleCreateNew = () => {
        reset({
            id: undefined,
            title: '',
            key: '',
            description: '',
            icon: 'FiBox',
            fields: [],
            is_system: false
        });
        setView('editor');
    };

    const onSubmit = async (data: ModuleFormData) => {
        try {
            const isUpdate = !!data.id;
            const url = '/api/admin/modules';
            const method = isUpdate ? 'PUT' : 'POST';
            const headers = await getAuthHeaders();

            const res = await fetch(url, {
                method,
                headers,
                body: JSON.stringify(data),
            });

            const result = await res.json();
            if (result.error) throw new Error(result.error);

            toast.success(isUpdate ? 'Module updated successfully!' : 'Module created successfully!');
            fetchModules();
            setView('dashboard');
        } catch (error: any) {
            console.error('Error saving module:', error);
            toast.error(error.message || 'Failed to save module');
        }
    };

    const handleDeleteModule = async () => {
        if (!selectedId) return;
        if (!confirm('Are you sure you want to delete this module? This action cannot be undone.')) return;

        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`/api/admin/modules?id=${selectedId}`, {
                method: 'DELETE',
                headers
            });
            const result = await res.json();
            if (result.error) throw new Error(result.error);

            toast.success('Module deleted');
            fetchModules();
            setView('dashboard');
        } catch (error) {
            toast.error('Failed to delete module');
        }
    };

    const filteredModules = modules.filter(m =>
        m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.key.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // --- Views ---

    if (view === 'dashboard') {
        return (
            <div className="p-8 max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">System Manager</h1>
                        <p className="text-gray-500 mt-1">Manage your application modules, functions, and settings.</p>
                    </div>
                    <Button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                        <FiPlus className="mr-2" /> Create New Module
                    </Button>
                </div>

                <Tabs defaultValue="modules" className="space-y-6">
                    <TabsList className="bg-white p-1 rounded-lg border">
                        <TabsTrigger value="modules" className="px-4 py-2"><FiGrid className="mr-2" /> Modules</TabsTrigger>
                        <TabsTrigger value="functions" className="px-4 py-2"><FiActivity className="mr-2" /> Functions & Logic</TabsTrigger>
                        <TabsTrigger value="settings" className="px-4 py-2"><FiSettings className="mr-2" /> System Settings</TabsTrigger>
                    </TabsList>

                    <TabsContent value="modules" className="space-y-6">
                        {/* Search */}
                        <div className="relative max-w-md">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Search installed modules..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Create New Card */}
                            <div
                                onClick={handleCreateNew}
                                className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group h-48"
                            >
                                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <FiPlus size={24} />
                                </div>
                                <h3 className="font-semibold text-gray-900">Create Custom Module</h3>
                                <p className="text-sm text-gray-500 mt-1">Build a new feature from scratch</p>
                            </div>

                            {loading ? (
                                <div className="col-span-full text-center py-12 text-gray-500">Loading modules...</div>
                            ) : (
                                filteredModules.map((mod) => (
                                    <div
                                        key={mod.id}
                                        onClick={() => handleEditModule(mod)}
                                        className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <FiEdit className="text-gray-400 hover:text-blue-600" />
                                        </div>
                                        <div className="w-12 h-12 bg-gray-100 text-gray-700 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            <FiBox size={24} />
                                        </div>
                                        <h3 className="font-bold text-lg text-gray-900 mb-1">{mod.title}</h3>
                                        <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10">
                                            {mod.description || 'No description provided.'}
                                        </p>
                                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${mod.is_system ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                                                {mod.is_system ? 'System Core' : 'Custom Module'}
                                            </span>
                                            {isAdvanced && <span className="text-xs text-gray-400 font-mono">{mod.key}</span>}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="functions">
                        <Card>
                            <CardHeader>
                                <CardTitle>System Functions</CardTitle>
                                <CardDescription>Manage automated tasks and server-side logic.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="p-4 border rounded-lg flex items-center justify-between bg-gray-50">
                                        <div className="flex items-center gap-3">
                                            <FiActivity className="text-green-500" />
                                            <div>
                                                <h4 className="font-medium">Evaluation Cron Job</h4>
                                                <p className="text-xs text-gray-500">Runs daily to check for pending evaluations.</p>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm">Configure</Button>
                                    </div>
                                    <div className="p-4 border rounded-lg flex items-center justify-between bg-gray-50">
                                        <div className="flex items-center gap-3">
                                            <FiDatabase className="text-blue-500" />
                                            <div>
                                                <h4 className="font-medium">Database Backup</h4>
                                                <p className="text-xs text-gray-500">Automated daily backups.</p>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm">View Logs</Button>
                                    </div>
                                    <div className="p-4 border rounded-lg flex items-center justify-between bg-gray-50">
                                        <div className="flex items-center gap-3">
                                            <FiTool className="text-orange-500" />
                                            <div>
                                                <h4 className="font-medium">Maintenance Mode</h4>
                                                <p className="text-xs text-gray-500">Disable access for non-admins.</p>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm">Enable</Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="settings">
                        <Card>
                            <CardHeader>
                                <CardTitle>Global Settings</CardTitle>
                                <CardDescription>Configure system-wide parameters.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-500">System settings configuration will be available here.</p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        );
    }

    // --- Editor View ---

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] bg-gray-50/50">
            {/* Editor Header */}
            <div className="bg-white border-b px-8 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => setView('dashboard')} className="text-gray-500 hover:text-gray-900">
                        <FiArrowLeft className="mr-2" /> Back to Dashboard
                    </Button>
                    <div className="h-6 w-px bg-gray-200"></div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">
                            {selectedId ? `Edit Module: ${watch('title')}` : 'Create New Module'}
                        </h1>
                        <p className="text-xs text-gray-500">
                            {selectedId ? 'Modify existing module structure' : 'Define new module structure'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 items-center">
                    <div className="flex items-center mr-4">
                        <label className="flex items-center text-xs text-gray-500 cursor-pointer hover:text-gray-900">
                            <input
                                type="checkbox"
                                checked={isAdvanced}
                                onChange={(e) => setIsAdvanced(e.target.checked)}
                                className="mr-2"
                            />
                            {isAdvanced ? <FiEyeOff className="mr-1" /> : <FiEye className="mr-1" />}
                            {isAdvanced ? 'Hide Advanced' : 'Show Advanced'}
                        </label>
                    </div>
                    {selectedId && !watch('is_system') && (
                        <Button variant="destructive" onClick={handleDeleteModule}>
                            <FiTrash className="mr-2" /> Delete Module
                        </Button>
                    )}
                    <Button onClick={handleSubmit(onSubmit)} className="bg-blue-600 hover:bg-blue-700">
                        <FiSave className="mr-2" /> Save Changes
                    </Button>
                </div>
            </div>

            {/* Editor Content */}
            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-4xl mx-auto space-y-8">

                    {/* General Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FiSettings className="text-blue-500" /> Basic Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-6">
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Module Name</label>
                                <input
                                    {...register('title', { required: true })}
                                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. Project Tracker"
                                />
                            </div>

                            {isAdvanced && (
                                <div className="col-span-2 md:col-span-1 bg-gray-50 p-2 rounded border border-gray-200">
                                    <label className="block text-xs font-medium text-gray-500 mb-1">System ID (URL Key)</label>
                                    <input
                                        {...register('key', { required: true, pattern: /^[a-z0-9-]+$/ })}
                                        disabled={!!selectedId}
                                        className={`w-full px-2 py-1 border rounded text-xs font-mono ${selectedId ? 'bg-gray-100 text-gray-500' : 'bg-white'}`}
                                        placeholder="e.g. project-tracker"
                                    />
                                </div>
                            )}

                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    {...register('description')}
                                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                    rows={2}
                                    placeholder="Describe what this module is used for..."
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Fields */}
                    <Card>
                        <CardHeader className="flex flex-row justify-between items-center">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <FiList className="text-blue-500" /> Data Fields
                                </CardTitle>
                                <CardDescription>Define what information you want to collect.</CardDescription>
                            </div>
                            <Button onClick={() => append({ name: '', label: '', type: 'text', required: false, is_list_visible: true })} size="sm" variant="outline">
                                <FiPlus className="mr-2" /> Add Field
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {fields.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg">
                                    <FiBox className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                                    <h3 className="text-sm font-medium text-gray-900">No fields defined</h3>
                                    <p className="text-sm text-gray-500 mt-1">Get started by adding a new field to your module.</p>
                                    <Button onClick={() => append({ name: '', label: '', type: 'text', required: false, is_list_visible: true })} variant="link" className="mt-2 text-blue-600">
                                        Add your first field
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {fields.map((field, index) => (
                                        <FieldEditor
                                            key={field.id}
                                            index={index}
                                            register={register}
                                            control={control}
                                            remove={remove}
                                            watch={watch}
                                            setValue={setValue}
                                            isAdvanced={isAdvanced}
                                        />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    );
}
