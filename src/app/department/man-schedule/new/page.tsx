'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { FiArrowLeft, FiSave } from 'react-icons/fi';
import Link from 'next/link';

export default function NewManSchedulePage() {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        vessel: '',
        full_name: '',
        position: '',
        original_start_date: '',
        date_of_birth: '',
        status: 'On Board',
        next_crew_change_date: '',
        email: '',
        phone: '',
        wish_to_transfer: 'No',
        est_transfer_date: '',
        rotation_details: '',
        location: '',
        rates: '',
        osm_thome_status: '',
        remarks: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            // Clean empty dates to null
            const payload = { ...formData };
            if (!payload.original_start_date) delete payload.original_start_date;
            if (!payload.date_of_birth) delete payload.date_of_birth;
            if (!payload.next_crew_change_date) delete payload.next_crew_change_date;

            const { error } = await supabase.from('man_schedules').insert([payload]);

            if (error) throw error;
            toast.success('Registro criado com sucesso');
            router.push('/department/man-schedule');
        } catch (error: any) {
            console.error(error);
            toast.error('Erro ao salvar: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <Link href="/department/man-schedule" className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 w-fit">
                <FiArrowLeft /> Voltar
            </Link>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Novo Registro: Man Schedule</h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo (Conforme Passaporte) *</label>
                            <input required type="text" name="full_name" value={formData.full_name} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Vessel</label>
                            <input type="text" name="vessel" value={formData.vessel} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Posição / Cargo</label>
                            <input type="text" name="position" value={formData.position} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email de Contato</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone / WhatsApp</label>
                            <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label>
                            <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Data Início Original (Technip)</label>
                            <input type="date" name="original_start_date" value={formData.original_start_date} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status (Onboard / On Leave)</label>
                            <select name="status" value={formData.status} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500">
                                <option value="On Board">On Board</option>
                                <option value="On Leave">On Leave</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Next Crew Change Date</label>
                            <input type="date" name="next_crew_change_date" value={formData.next_crew_change_date} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Deseja Transferência?</label>
                            <select name="wish_to_transfer" value={formData.wish_to_transfer} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500">
                                <option value="No">No</option>
                                <option value="Yes">Yes</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Est. Transfer Date</label>
                            <input type="text" name="est_transfer_date" value={formData.est_transfer_date} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Localização (Location)</label>
                            <input type="text" name="location" value={formData.location} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Rates</label>
                            <input type="text" name="rates" value={formData.rates} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">OSMThome Status</label>
                            <input type="text" name="osm_thome_status" value={formData.osm_thome_status} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Detalhes da Rotação (Rotation Details)</label>
                        <textarea name="rotation_details" value={formData.rotation_details} onChange={handleChange} rows={2} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"></textarea>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Observações (Remarks)</label>
                        <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows={3} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"></textarea>
                    </div>

                    <div className="flex justify-end pt-4 border-t">
                        <button disabled={submitting} type="submit" className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 transition shadow-sm disabled:opacity-50">
                            <FiSave /> {submitting ? 'Salvando...' : 'Salvar Registro'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
