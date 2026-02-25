'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { FiPlus, FiTrash, FiEdit, FiSave, FiX, FiFile } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';

export default function UniversalModulePage() {
    const params = useParams();
    const moduleKey = params?.moduleKey as string;

    const [moduleConfig, setModuleConfig] = useState<any>(null);
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentRecord, setCurrentRecord] = useState<any>(null);

    const { register, handleSubmit, reset, setValue } = useForm();

    useEffect(() => {
        if (moduleKey) {
            fetchModuleData();
        }
    }, [moduleKey]);

    const fetchModuleData = async () => {
        try {
            setLoading(true);
            // 1. Fetch Module Config (we need an endpoint for this, or we can fetch all modules and find the right one)
            // For efficiency, we should have an endpoint like /api/modules/[key]/meta, but for now let's use the admin list
            // OR we can infer it if we had a public metadata endpoint.
            // Let's assume /api/admin/modules returns everything and we filter.
            // Ideally: GET /api/modules/[key] should return metadata + data? 
            // The route I implemented earlier: GET /api/modules/[key] returns DATA.
            // I need to update the route to return metadata if requested, or make a separate call.
            // Let's assume we can get the config from /api/admin/modules for now (requires admin).

            const configRes = await fetch('/api/admin/modules');
            const configData = await configRes.json();
            const currentModule = configData.find((m: any) => m.key === moduleKey);

            if (!currentModule) {
                throw new Error('Module not found');
            }
            setModuleConfig(currentModule);

            // 2. Fetch Records
            const dataRes = await fetch(`/api/modules/${moduleKey}`);
            const data = await dataRes.json();

            // If dynamic records, the actual data is in the 'data' column
            const parsedRecords = data.map((r: any) => {
                if (currentModule.table_name === 'sys_dynamic_records') {
                    return { id: r.id, ...r.data };
                }
                return r;
            });

            setRecords(parsedRecords);
        } catch (error) {
            console.error('Error loading module:', error);
            toast.error('Failed to load module data');
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data: any) => {
        try {
            const url = `/api/modules/${moduleKey}`;
            const method = currentRecord ? 'PUT' : 'POST';
            const body = currentRecord ? { id: currentRecord.id, ...data } : data;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const result = await res.json();
            if (result.error) throw new Error(result.error);

            toast.success(currentRecord ? 'Record updated' : 'Record created');
            setIsEditing(false);
            setCurrentRecord(null);
            reset();
            fetchModuleData(); // Refresh data
        } catch (error) {
            console.error('Error saving record:', error);
            toast.error('Failed to save record');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this record?')) return;

        try {
            const res = await fetch(`/api/modules/${moduleKey}?id=${id}`, {
                method: 'DELETE',
            });

            if (!res.ok) throw new Error('Failed to delete');

            toast.success('Record deleted');
            fetchModuleData();
        } catch (error) {
            console.error('Error deleting:', error);
            toast.error('Failed to delete record');
        }
    };

    const handleEdit = (record: any) => {
        setCurrentRecord(record);
        // Reset form with record data
        // We need to map the fields correctly
        const formData: any = {};
        moduleConfig.fields.forEach((field: any) => {
            formData[field.name] = record[field.name];
        });
        reset(formData);
        setIsEditing(true);
    };

    if (loading) return <div className="p-8 text-center">Loading module...</div>;
    if (!moduleConfig) return <div className="p-8 text-center text-red-500">Module not found</div>;

    return (
        <div className="container mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    {/* We could render the icon here if we map the string to a component */}
                    {moduleConfig.title}
                </h1>
                {!isEditing && (
                    <Button onClick={() => { setCurrentRecord(null); reset({}); setIsEditing(true); }}>
                        <FiPlus className="mr-2" /> Add Record
                    </Button>
                )}
            </div>

            {isEditing ? (
                <div className="bg-white rounded-lg shadow p-6 max-w-2xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold">{currentRecord ? 'Edit Record' : 'New Record'}</h2>
                        <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-gray-700">
                            <FiX className="w-6 h-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {moduleConfig.fields.sort((a: any, b: any) => a.order - b.order).map((field: any) => (
                            <div key={field.id}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                </label>

                                {field.type === 'text' && (
                                    <input
                                        {...register(field.name, { required: field.required })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                )}

                                {field.type === 'number' && (
                                    <input
                                        type="number"
                                        {...register(field.name, { required: field.required })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                )}

                                {field.type === 'date' && (
                                    <input
                                        type="date"
                                        {...register(field.name, { required: field.required })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                )}

                                {field.type === 'boolean' && (
                                    <input
                                        type="checkbox"
                                        {...register(field.name)}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                )}

                                {field.type === 'select' && (
                                    <select
                                        {...register(field.name, { required: field.required })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Select...</option>
                                        {field.options && Array.isArray(field.options) && field.options.map((opt: string) => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                )}

                                {field.type === 'file' && (
                                    <div className="border border-gray-300 border-dashed rounded-md p-4 text-center">
                                        <p className="text-sm text-gray-500">File upload will be available soon.</p>
                                    </div>
                                )}
                            </div>
                        ))}

                        <div className="flex justify-end pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsEditing(false)} className="mr-2">
                                Cancel
                            </Button>
                            <Button type="submit">
                                <FiSave className="mr-2" /> Save
                            </Button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    {moduleConfig.fields.filter((f: any) => f.is_list_visible).map((field: any) => (
                                        <th key={field.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            {field.label}
                                        </th>
                                    ))}
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {records.length === 0 ? (
                                    <tr>
                                        <td colSpan={moduleConfig.fields.length + 1} className="px-6 py-4 text-center text-gray-500">
                                            No records found.
                                        </td>
                                    </tr>
                                ) : (
                                    records.map((record) => (
                                        <tr key={record.id}>
                                            {moduleConfig.fields.filter((f: any) => f.is_list_visible).map((field: any) => (
                                                <td key={`${record.id}-${field.id}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {String(record[field.name] || '')}
                                                </td>
                                            ))}
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button onClick={() => handleEdit(record)} className="text-blue-600 hover:text-blue-900 mr-4">
                                                    <FiEdit />
                                                </button>
                                                <button onClick={() => handleDelete(record.id)} className="text-red-600 hover:text-red-900">
                                                    <FiTrash />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
