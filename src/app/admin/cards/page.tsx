'use client';

import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiEyeOff, FiArrowUp, FiArrowDown, FiSave, FiX, FiLock, FiUsers } from 'react-icons/fi';
import dashboardCards, { DashboardCard } from '@/data/cards';
import { IconType } from 'react-icons';
import * as Icons from 'react-icons/fi';
import IconSelector from '@/components/IconSelector';
import CardAccessControl from '@/components/admin/CardAccessControl';

// Componente para edição de card
interface CardEditorProps {
  card: DashboardCard;
  onSave: (card: DashboardCard) => void;
  onCancel: () => void;
  isNew?: boolean;
}

const CardEditor = ({ card, onSave, onCancel, isNew = false }: CardEditorProps) => {
  const [editedCard, setEditedCard] = useState<DashboardCard>({
    ...card,
    adminOnly: card.adminOnly || false,
    managerOnly: card.managerOnly || false,
    allowedRoles: card.allowedRoles || [],
    allowedUserIds: card.allowedUserIds || []
  });
  const [selectedIcon, setSelectedIcon] = useState<string>(card.icon.name);

  // Lista de ícones disponíveis
  const iconOptions = Object.keys(Icons)
    .filter(key => key.startsWith('Fi'))
    .sort();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditedCard(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setEditedCard(prev => ({ ...prev, [name]: checked }));
  };

  const handleIconChange = (iconName: string, iconComponent: IconType) => {
    setSelectedIcon(iconName);
    setEditedCard(prev => ({ ...prev, icon: iconComponent }));
  };

  // Manipular mudanças nas permissões de acesso
  const handleAccessChange = (access: {
    adminOnly: boolean;
    managerOnly: boolean;
    allowedRoles: string[];
    allowedUserIds: string[];
  }) => {
    setEditedCard(prev => ({
      ...prev,
      ...access,
    }));
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
    onSave(editedCard);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {isNew ? 'Adicionar Novo Card' : 'Editar Card'}
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
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Título
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={editedCard.title}
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
              value={editedCard.href}
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
              value={editedCard.order}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-abz-blue focus:border-abz-blue"
              min="1"
              required
            />
          </div>

          <div>
            <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-1">
              Cor de Fundo
            </label>
            <input
              type="text"
              id="color"
              name="color"
              value={editedCard.color}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-abz-blue focus:border-abz-blue"
              required
            />
          </div>

          <div>
            <label htmlFor="hoverColor" className="block text-sm font-medium text-gray-700 mb-1">
              Cor de Hover
            </label>
            <input
              type="text"
              id="hoverColor"
              name="hoverColor"
              value={editedCard.hoverColor}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-abz-blue focus:border-abz-blue"
              required
            />
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Descrição
          </label>
          <textarea
            id="description"
            name="description"
            value={editedCard.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-abz-blue focus:border-abz-blue"
            required
          />
        </div>

        <div className="flex items-center space-x-4 mb-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="enabled"
              name="enabled"
              checked={editedCard.enabled}
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
              checked={editedCard.external}
              onChange={handleCheckboxChange}
              className="h-4 w-4 text-abz-blue focus:ring-abz-blue border-gray-300 rounded"
            />
            <label htmlFor="external" className="ml-2 block text-sm text-gray-700">
              Link Externo
            </label>
          </div>
        </div>

        {/* Controle de Acesso */}
        <div className="mb-4">
          <h4 className="text-md font-medium text-gray-900 mb-2 flex items-center">
            <FiLock className="mr-2" />
            Controle de Acesso
          </h4>
          <CardAccessControl
            adminOnly={editedCard.adminOnly || false}
            managerOnly={editedCard.managerOnly || false}
            allowedRoles={editedCard.allowedRoles || []}
            allowedUserIds={editedCard.allowedUserIds || []}
            onAccessChange={handleAccessChange}
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-abz-blue"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-abz-blue hover:bg-abz-blue-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-abz-blue"
          >
            {isNew ? 'Adicionar' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Componente para visualização de card
interface CardItemProps {
  card: DashboardCard;
  onEdit: (card: DashboardCard) => void;
  onDelete: (id: string) => void;
  onToggleVisibility: (id: string, enabled: boolean) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}

const CardItem = ({ card, onEdit, onDelete, onToggleVisibility, onMoveUp, onMoveDown }: CardItemProps) => {
  const IconComponent = card.icon;

  return (
    <div className={`bg-white rounded-lg shadow-sm p-4 border-l-4 ${card.enabled ? 'border-green-500' : 'border-gray-300'}`}>
      <div className="flex justify-between items-start">
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded-full bg-gray-100">
            <IconComponent className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{card.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{card.description}</p>
            <div className="flex items-center mt-2 text-xs text-gray-500">
              <span className="mr-3">Ordem: {card.order}</span>
              <span className="mr-3">Link: {card.href}</span>
              {card.external && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Externo</span>}
              {card.adminOnly && <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded ml-1"><FiLock className="inline mr-1" />Admin</span>}
              {card.managerOnly && <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded ml-1"><FiLock className="inline mr-1" />Gerente</span>}
              {!card.adminOnly && !card.managerOnly && (card.allowedRoles?.length > 0 || card.allowedUserIds?.length > 0) &&
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded ml-1"><FiUsers className="inline mr-1" />Restrito</span>
              }
            </div>
          </div>
        </div>
        <div className="flex space-x-1">
          <button
            onClick={() => onMoveUp(card.id)}
            className="p-1 text-gray-500 hover:text-gray-700"
            title="Mover para cima"
          >
            <FiArrowUp className="h-4 w-4" />
          </button>
          <button
            onClick={() => onMoveDown(card.id)}
            className="p-1 text-gray-500 hover:text-gray-700"
            title="Mover para baixo"
          >
            <FiArrowDown className="h-4 w-4" />
          </button>
          <button
            onClick={() => onToggleVisibility(card.id, !card.enabled)}
            className={`p-1 ${card.enabled ? 'text-green-500 hover:text-green-700' : 'text-gray-400 hover:text-gray-600'}`}
            title={card.enabled ? 'Desativar' : 'Ativar'}
          >
            {card.enabled ? <FiEye className="h-4 w-4" /> : <FiEyeOff className="h-4 w-4" />}
          </button>
          <button
            onClick={() => onEdit(card)}
            className="p-1 text-blue-500 hover:text-blue-700"
            title="Editar"
          >
            <FiEdit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(card.id)}
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

export default function CardsPage() {
  const [cards, setCards] = useState<DashboardCard[]>(dashboardCards);
  const [editingCard, setEditingCard] = useState<DashboardCard | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Funções para gerenciar os cards
  const handleEdit = (card: DashboardCard) => {
    setEditingCard(card);
    setIsAdding(false);
  };

  const handleAdd = () => {
    // Criar um novo card com valores padrão
    const newCard: DashboardCard = {
      id: `card-${Date.now()}`,
      title: 'Novo Card',
      description: 'Descrição do novo card',
      href: '/novo-card',
      icon: Icons.FiGrid,
      color: 'bg-gray-500',
      hoverColor: 'hover:bg-gray-600',
      external: false,
      enabled: true,
      order: cards.length + 1,
      adminOnly: false,
      managerOnly: false,
      allowedRoles: [],
      allowedUserIds: []
    };
    setEditingCard(newCard);
    setIsAdding(true);
  };

  const handleSave = (card: DashboardCard) => {
    if (isAdding) {
      // Adicionar novo card
      setCards(prev => [...prev, card]);
    } else {
      // Atualizar card existente
      setCards(prev => prev.map(c => c.id === card.id ? card : c));
    }
    setEditingCard(null);
    setIsAdding(false);
  };

  const handleCancel = () => {
    setEditingCard(null);
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este card?')) {
      setCards(prev => prev.filter(card => card.id !== id));
    }
  };

  const handleToggleVisibility = (id: string, enabled: boolean) => {
    setCards(prev => prev.map(card =>
      card.id === id ? { ...card, enabled } : card
    ));
  };

  const handleMoveUp = (id: string) => {
    setCards(prev => {
      const index = prev.findIndex(card => card.id === id);
      if (index <= 0) return prev;

      const newCards = [...prev];
      const currentOrder = newCards[index].order;
      const prevOrder = newCards[index - 1].order;

      newCards[index] = { ...newCards[index], order: prevOrder };
      newCards[index - 1] = { ...newCards[index - 1], order: currentOrder };

      return newCards.sort((a, b) => a.order - b.order);
    });
  };

  const handleMoveDown = (id: string) => {
    setCards(prev => {
      const index = prev.findIndex(card => card.id === id);
      if (index >= prev.length - 1) return prev;

      const newCards = [...prev];
      const currentOrder = newCards[index].order;
      const nextOrder = newCards[index + 1].order;

      newCards[index] = { ...newCards[index], order: nextOrder };
      newCards[index + 1] = { ...newCards[index + 1], order: currentOrder };

      return newCards.sort((a, b) => a.order - b.order);
    });
  };

  // Ordenar cards por ordem
  const sortedCards = [...cards].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Cards</h1>
          <p className="mt-1 text-sm text-gray-500">
            Adicione, edite ou remova os cards exibidos no dashboard.
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-abz-blue hover:bg-abz-blue-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-abz-blue"
          >
            <FiPlus className="mr-2 h-4 w-4" />
            Adicionar Card
          </button>
        </div>
      </div>

      {/* Editor de card */}
      {editingCard && (
        <CardEditor
          card={editingCard}
          onSave={handleSave}
          onCancel={handleCancel}
          isNew={isAdding}
        />
      )}

      {/* Lista de cards */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Cards ({sortedCards.length})</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {sortedCards.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Nenhum card encontrado. Clique em "Adicionar Card" para criar um novo.
            </div>
          ) : (
            <div className="space-y-3 p-4">
              {sortedCards.map(card => (
                <CardItem
                  key={card.id}
                  card={card}
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

      {/* Botão de salvar alterações */}
      <div className="flex justify-end">
        <button
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          <FiSave className="mr-2 h-4 w-4" />
          Salvar Alterações
        </button>
      </div>
    </div>
  );
}
