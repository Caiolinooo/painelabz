'use client';

import React, { useState, useEffect } from 'react';
import { FiBook, FiPlus, FiTrash2, FiSearch, FiEdit2, FiGlobe, FiUser, FiUsers, FiFilter, FiSave, FiX } from 'react-icons/fi';

interface KBEntry {
  id: string;
  category: string;
  content: string;
  access_level: string;
  scope_id: string | null;
  tags: string[];
  created_at: string;
}

export default function IAKnowledgeBasePanel({ token }: { token: string }) {
  const [entries, setEntries] = useState<KBEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newEntry, setNewEntry] = useState({
    category: 'processos',
    content: '',
    access_level: 'all',
    scope_id: '',
    tags: [] as string[]
  });

  useEffect(() => {
    fetchKB();
  }, []);

  const fetchKB = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ia/knowledge-base?action=list', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch (err) {
      console.error('[KB] Error:', err);
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    try {
      const res = await fetch('/api/ia/knowledge-base', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: ***REMOVED*** ...newEntry, action: 'add' }),
      });
      
      if (res.ok) {
        setIsAdding(false);
        setNewEntry({ category: 'processos', content: '', access_level: 'all', scope_id: '', tags: [] });
        fetchKB();
      }
    } catch (err) {
      console.error('[KB] Add Error:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este conhecimento?')) return;
    try {
      const res = await fetch(`/api/ia/knowledge-base?action=remove&id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchKB();
      }
    } catch (err) {
      console.error('[KB] Delete Error:', err);
    }
  };

  const filtered = entries.filter(e => 
    e.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative flex-1 w-full">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar na base de conhecimento..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium w-full md:w-auto justify-center"
        >
          <FiPlus />
          Adicionar Conhecimento
        </button>
      </div>

      {/* Add Form Modal-like */}
      {isAdding && (
        <div className="bg-white p-6 rounded-xl border-2 border-blue-100 shadow-lg animate-slide-up">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <FiBook className="text-blue-600" />
              Novo Registro de Conhecimento
            </h3>
            <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600">
              <FiX className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoria</label>
              <select 
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                value={newEntry.category}
                onChange={(e) => setNewEntry({...newEntry, category: e.target.value})}
              >
                <option value="processos">Processos</option>
                <option value="regras_negocio">Regras de Negócio</option>
                <option value="contatos">Contatos Importantes</option>
                <option value="faq">FAQ</option>
                <option value="tecnico">Documentação Técnica</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nível de Acesso</label>
              <select 
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                value={newEntry.access_level}
                onChange={(e) => setNewEntry({...newEntry, access_level: e.target.value})}
              >
                <option value="all">Global (Todos)</option>
                <option value="department">Departamento</option>
                <option value="user">Privado (Usuário)</option>
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Conteúdo</label>
            <textarea
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm h-32"
              placeholder="Descreva o conhecimento que a IA deve saber..."
              value={newEntry.content}
              onChange={(e) => setNewEntry({...newEntry, content: e.target.value})}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button 
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancelar
            </button>
            <button 
              onClick={handleAdd}
              className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2"
            >
              <FiSave />
              Salvar na Base
            </button>
          </div>
        </div>
      )}

      {/* Grid of Entries */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 py-12 text-center text-gray-400 italic">Carregando base de conhecimento...</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
            Nenhum registro encontrado.
          </div>
        ) : (
          filtered.map((entry) => (
            <div key={entry.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative group">
              <div className="flex items-center justify-between mb-3">
                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase rounded">
                  {entry.category}
                </span>
                <div className="flex items-center gap-2">
                  {entry.access_level === 'all' ? <FiGlobe className="text-gray-400 w-3.5 h-3.5" title="Global" /> : 
                   entry.access_level === 'department' ? <FiUsers className="text-gray-400 w-3.5 h-3.5" title="Departamento" /> :
                   <FiUser className="text-gray-400 w-3.5 h-3.5" title="Privado" />}
                  <button 
                    onClick={() => handleDelete(entry.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-all"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap line-clamp-4">
                {entry.content}
              </p>
              <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center text-[10px] text-gray-400">
                <span>ID: {entry.id.split('-')[0]}</span>
                <span>{new Date(entry.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
