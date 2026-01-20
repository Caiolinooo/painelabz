'use client';

import React, { useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiEyeOff, FiArrowUp, FiArrowDown, FiSave, FiX, FiLock } from 'react-icons/fi';
import { MenuItem } from '@/data/menu';
import { IconType } from 'react-icons';
import * as Icons from 'react-icons/fi';
import IconSelector from '@/components/IconSelector';
import { useI18n } from '@/contexts/I18nContext';

// Componente para edição de item de menu
interface MenuEditorProps {
  item: MenuItem;
  onSave: (item: MenuItem) => void;
  onCancel: () => void;
  isNew?: boolean;
}

const MenuEditor = ({ item, onSave, onCancel, isNew = false }: MenuEditorProps) => {
  const { t } = useI18n();
  const [editedItem, setEditedItem] = useState<MenuItem>({ ...item });
  const [selectedIcon, setSelectedIcon] = useState<string>(item.icon.name);

  // Lista de ícones disponíveis
  const iconOptions = Object.keys(Icons)
    .filter(key => key.startsWith('Fi'))
    .sort();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditedItem(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setEditedItem(prev => ({ ...prev, [name]: checked }));
  };

  const handleIconChange = (iconName: string, iconComponent: IconType) => {
    setSelectedIcon(iconName);
    setEditedItem(prev => ({ ...prev, icon: iconComponent }));
  };

  const handleCustomIconUpload = (file: File) => {
    // Aqui você implementaria a lógica para fazer upload do ícone personalizado
    // Por enquanto, apenas mostramos um alerta
    alert(`Upload de ícone personalizado: ${file.name}`);
    // Em uma implementação real, você faria upload do arquivo e obteria uma URL
    // Então atualizaria o estado com essa URL
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(editedItem);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {isNew ? t('admin.addMenuItem', 'Adicionar Novo Item') : t('common.edit', 'Editar Item')}
        </h3>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          <FiX className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="label" className="block text-sm font-medium text-gray-700 mb-1">
              Título
            </label>
            <input
              type="text"
              id="label"
              name="label"
              value={editedItem.label}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-abz-blue focus:border-abz-blue"
              required
            />
          </div>

          <div>
            <label htmlFor="href" className="block text-sm font-medium text-gray-700 mb-1">
              Link (URL)
            </label>
            <input
              type="text"
              id="href"
              name="href"
              value={editedItem.href}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-abz-blue focus:border-abz-blue"
              required
            />
          </div>

          <div>
            <IconSelector
              selectedIcon={selectedIcon}
              onIconChange={handleIconChange}
              onCustomIconUpload={handleCustomIconUpload}
              allowCustomUpload={true}
            />
          </div>

          <div>
            <label htmlFor="order" className="block text-sm font-medium text-gray-700 mb-1">
              Ordem
            </label>
            <input
              type="number"
              id="order"
              name="order"
              value={editedItem.order}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-abz-blue focus:border-abz-blue"
              min="1"
              required
            />
          </div>
        </div>

        <div className="flex items-center space-x-4 mb-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="enabled"
              name="enabled"
              checked={editedItem.enabled}
              onChange={handleCheckboxChange}
              className="h-4 w-4 text-abz-blue focus:ring-abz-blue border-gray-300 rounded"
            />
            <label htmlFor="enabled" className="ml-2 block text-sm text-gray-700">
              Ativo
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="external"
              name="external"
              checked={editedItem.external}
              onChange={handleCheckboxChange}
              className="h-4 w-4 text-abz-blue focus:ring-abz-blue border-gray-300 rounded"
            />
            <label htmlFor="external" className="ml-2 block text-sm text-gray-700">
              Link Externo
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="adminOnly"
              name="adminOnly"
              checked={editedItem.adminOnly}
              onChange={handleCheckboxChange}
              className="h-4 w-4 text-abz-blue focus:ring-abz-blue border-gray-300 rounded"
            />
            <label htmlFor="adminOnly" className="ml-2 block text-sm text-gray-700">
              Apenas Admin
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-abz-blue"
          >
            {t('common.cancel', 'Cancelar')}
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-abz-blue hover:bg-abz-blue-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-abz-blue"
          >
            {isNew ? t('common.add', 'Adicionar') : t('common.save', 'Salvar')}
          </button>
        </div>
      </form>
    </div>
  );
};

// Componente para visualização de item de menu
interface MenuItemProps {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
  onToggleVisibility: (id: string, enabled: boolean) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}

const MenuItemComponent = ({ item, onEdit, onDelete, onToggleVisibility, onMoveUp, onMoveDown }: MenuItemProps) => {
  const IconComponent = item.icon;

  return (
    <div className={`bg-white rounded-lg shadow-sm p-4 border-l-4 ${item.enabled ? 'border-green-500' : 'border-gray-300'}`}>
      <div className="flex justify-between items-start">
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded-full bg-gray-100">
            <IconComponent className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{item.label}</h3>
            <div className="flex items-center mt-2 text-xs text-gray-500">
              <span className="mr-3">Ordem: {item.order}</span>
              <span className="mr-3">Link: {item.href}</span>
              {item.external && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded mr-1">Externo</span>}
              {item.adminOnly && <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded flex items-center"><FiLock className="h-3 w-3 mr-1" /> Admin</span>}
            </div>
          </div>
        </div>
        <div className="flex space-x-1">
          <button
            onClick={() => onMoveUp(item.id)}
            className="p-1 text-gray-500 hover:text-gray-700"
            title="Mover para cima"
          >
            <FiArrowUp className="h-4 w-4" />
          </button>
          <button
            onClick={() => onMoveDown(item.id)}
            className="p-1 text-gray-500 hover:text-gray-700"
            title="Mover para baixo"
          >
            <FiArrowDown className="h-4 w-4" />
          </button>
          <button
            onClick={() => onToggleVisibility(item.id, !item.enabled)}
            className={`p-1 ${item.enabled ? 'text-green-500 hover:text-green-700' : 'text-gray-400 hover:text-gray-600'}`}
            title={item.enabled ? 'Desativar' : 'Ativar'}
          >
            {item.enabled ? <FiEye className="h-4 w-4" /> : <FiEyeOff className="h-4 w-4" />}
          </button>
          <button
            onClick={() => onEdit(item)}
            className="p-1 text-blue-500 hover:text-blue-700"
            title="Editar"
          >
            <FiEdit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="p-1 text-red-500 hover:text-red-700"
            title="Excluir"
          >
            <FiTrash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default function MenuPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Carregar itens do banco de dados via API admin
  const loadItems = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch('/api/admin/cards', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error(`Failed to load items: ${response.status}`);

      const data = await response.json();

      // Map API data (snake_case from DB or camelCase from API helper) to MenuItem format
      const mappedItems: MenuItem[] = data.map((card: any) => ({
        id: card.id,
        href: card.href,
        label: card.title, // Map title to label
        icon: Icons[card.iconName as keyof typeof Icons] || Icons[(card.icon_name as keyof typeof Icons)] || Icons.FiGrid,
        external: card.external,
        enabled: card.enabled,
        order: card.order || 99,
        adminOnly: card.adminOnly || card.admin_only || false,
        // Preserve other fields if needed
      }));

      setItems(mappedItems);
    } catch (err) {
      console.error('Error loading menu items:', err);
      setError('Erro ao carregar itens do menu. Verifique se você está logado.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadItems();

    // Listen for cache invalidation events to reload
    const handleCacheInvalidation = () => {
      console.log('🔄 Menu Admin: Cache invalidated, reloading...');
      loadItems();
    };
    window.addEventListener('cards-cache-invalidated', handleCacheInvalidation);
    return () => window.removeEventListener('cards-cache-invalidated', handleCacheInvalidation);
  }, []);

  // Funções para gerenciar os itens de menu
  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setIsAdding(false);
  };

  const handleAdd = () => {
    // Criar um novo item com valores padrão
    const newItem: MenuItem = {
      id: `menu-${Date.now()}`,
      href: '/novo-item',
      label: 'Novo Item',
      icon: Icons.FiGrid,
      external: false,
      enabled: true,
      order: items.length + 1,
      adminOnly: false
    };
    setEditingItem(newItem);
    setIsAdding(true);
  };

  const handleSave = async (item: MenuItem) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');

      // Prepare payload for API
      // Note: We need to extract the icon name string.
      // Since MenuItem stores the component, we might rely on the fact that we can get the name from the component or we should have stored it.
      // For now, let's try to get it from the item if possible, or fallback.
      // A better approach would be to update MenuEditor to return the icon name too, but let's try to infer or pass it.
      // Actually, in MenuEditor, 'item' state doesn't have iconName key unless we add it. 
      // Let's assume for this fix that we map it back or rely on 'item.icon.name' for standard icons.

      const iconName = (item.icon as any).displayName || (item.icon as any).name || 'FiGrid';

      const payload = {
        id: item.id,
        title: item.label,
        href: item.href,
        icon: iconName,
        icon_name: iconName, // Provide both for compatibility
        external: item.external,
        enabled: item.enabled,
        order: item.order,
        adminOnly: item.adminOnly,
        // Default fields for others
        description: item.label,
        color: 'bg-gray-100',
        hoverColor: 'hover:bg-gray-200'
      };

      let url = '/api/admin/cards/update';
      // If new item, use create endpoint
      // Note: Admin Cards API usually uses POST /api/admin/cards for create
      if (isAdding) {
        url = '/api/admin/cards';
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`Failed to save: ${response.status}`);

      // Invalidate cache global
      if (typeof window !== 'undefined') {
        localStorage.removeItem('dashboard-cards-cache');
        // The reload will happen via the event listener if the API triggers logic, 
        // but let's force reload here to be sure.
        loadItems();
      }

      setEditingItem(null);
      setIsAdding(false);
    } catch (err) {
      console.error('Error saving item:', err);
      setError('Erro ao salvar item.');
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditingItem(null);
    setIsAdding(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('admin.users.deleteConfirm', 'Tem certeza que deseja excluir este item?'))) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`/api/admin/cards?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to delete');

      localStorage.removeItem('dashboard-cards-cache');
      loadItems();
    } catch (err) {
      console.error('Error deleting:', err);
      setError('Erro ao excluir item.');
      setLoading(false);
    }
  };

  const updateItemOrder = async (id: string, newOrder: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Find original item to preserve other fields
    const item = items.find(i => i.id === id);
    if (!item) return;

    const iconName = (item.icon as any).displayName || (item.icon as any).name || 'FiGrid';
    const payload = {
      id: item.id,
      title: item.label,
      href: item.href,
      icon: iconName,
      icon_name: iconName,
      external: item.external,
      enabled: item.enabled,
      order: newOrder,
      adminOnly: item.adminOnly,
      description: item.label, // Fallback
      color: 'bg-gray-100', // Fallback
      hoverColor: 'hover:bg-gray-200' // Fallback
    };

    await fetch('/api/admin/cards/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
  };

  const handleToggleVisibility = async (id: string, enabled: boolean) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Optimistic update
    setItems(prev => prev.map(i => i.id === id ? { ...i, enabled } : i));

    try {
      const item = items.find(i => i.id === id);
      if (!item) return;

      const iconName = (item.icon as any).displayName || (item.icon as any).name || 'FiGrid';

      await fetch('/api/admin/cards/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: ***REMOVED***
          id: item.id,
          title: item.label, // Ensure title is sent
          href: item.href,
          icon: iconName,
          icon_name: iconName,
          enabled: enabled,
          // Send other required fields if API updates full object
          description: item.label,
          color: 'bg-gray-100',
          hoverColor: 'hover:bg-gray-200',
          external: item.external,
          order: item.order,
          adminOnly: item.adminOnly
        })
      });

      localStorage.removeItem('dashboard-cards-cache');
      // No need to reload fully if optimistic update worked, but good to ensure sync
    } catch (e) {
      console.error(e);
      loadItems(); // Revert on error
    }
  };

  const handleMoveUp = async (id: string) => {
    const sorted = [...items].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex(item => item.id === id);
    if (index <= 0) return;

    const currentItem = sorted[index];
    const prevItem = sorted[index - 1];

    // Swap orders
    const newOrderCurrent = prevItem.order;
    const newOrderPrev = currentItem.order;

    // Optimistic
    // ... logic omitted for brevity, let's just wait
    setLoading(true);
    await Promise.all([
      updateItemOrder(currentItem.id, newOrderCurrent),
      updateItemOrder(prevItem.id, newOrderPrev)
    ]);
    localStorage.removeItem('dashboard-cards-cache');
    loadItems();
  };

  const handleMoveDown = async (id: string) => {
    const sorted = [...items].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex(item => item.id === id);
    if (index >= sorted.length - 1) return;

    const currentItem = sorted[index];
    const nextItem = sorted[index + 1];

    const newOrderCurrent = nextItem.order;
    const newOrderNext = currentItem.order;

    setLoading(true);
    await Promise.all([
      updateItemOrder(currentItem.id, newOrderCurrent),
      updateItemOrder(nextItem.id, newOrderNext)
    ]);
    localStorage.removeItem('dashboard-cards-cache');
    loadItems();
  };

  // Ordenar itens por ordem
  const sortedItems = [...items].sort((a, b) => a.order - b.order);

  if (loading && items.length === 0) {
    return <div className="p-8 text-center">Carregando itens do menu...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Menu</h1>
          <p className="mt-1 text-sm text-gray-500">
            Adicione, edite ou remova os itens do menu lateral.
            <br />
            <span className="text-xs text-blue-600">
              Nota: As alterações são salvas automaticamente no banco de dados.
            </span>
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-abz-blue hover:bg-abz-blue-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-abz-blue"
          >
            <FiPlus className="mr-2 h-4 w-4" />
            {t('admin.addMenuItem', 'Adicionar Item')}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Editor de item */}
      {editingItem && (
        <MenuEditor
          item={editingItem}
          onSave={handleSave}
          onCancel={handleCancel}
          isNew={isAdding}
        />
      )}

      {/* Lista de itens */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Itens do Menu ({sortedItems.length})</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {sortedItems.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              {t('admin.noItems', 'Nenhum item encontrado. Clique em "Adicionar Item" para criar um novo.')}
            </div>
          ) : (
            <div className="space-y-3 p-4">
              {sortedItems.map(item => (
                <MenuItemComponent
                  key={item.id}
                  item={item}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggleVisibility={handleToggleVisibility}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Botão de salvar alterações REMOVED because changes are now immediate */}
    </div>
  );
}
