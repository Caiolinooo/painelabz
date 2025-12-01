'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FiX, FiHash } from 'react-icons/fi';

interface TagInputProps {
    tags: string[];
    onChange: (tags: string[]) => void;
    maxTags?: number;
    placeholder?: string;
    suggestions?: string[];
    className?: string;
}

const TagInput: React.FC<TagInputProps> = ({
    tags,
    onChange,
    maxTags = 5,
    placeholder = 'Adicionar tags...',
    suggestions = [],
    className = ''
}) => {
    const [inputValue, setInputValue] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Filtrar sugestões baseado no input
    const filteredSuggestions = suggestions.filter(
        s => s.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(s)
    ).slice(0, 5);

    // Adicionar tag
    const addTag = (tag: string) => {
        const cleanTag = tag.trim().toLowerCase().replace(/^#/, ''); // Remove # do início

        if (!cleanTag) return;
        if (tags.includes(cleanTag)) return;
        if (tags.length >= maxTags) return;

        onChange([...tags, cleanTag]);
        setInputValue('');
        setShowSuggestions(false);
        inputRef.current?.focus();
    };

    // Remover tag
    const removeTag = (tagToRemove: string) => {
        onChange(tags.filter(t => t !== tagToRemove));
    };

    // Handle input
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputValue(value);
        setShowSuggestions(value.length > 0 && filteredSuggestions.length > 0);
    };

    // Handle key press
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(inputValue);
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            // Remove última tag se input vazio
            removeTag(tags[tags.length - 1]);
        }
    };

    // Detectar clique fora para fechar sugestões
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className}`}>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <FiHash className="w-4 h-4 mr-1" />
                Tags {tags.length > 0 && `(${tags.length}/${maxTags})`}
            </label>

            {/* Tags adicionadas */}
            {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map((tag, index) => (
                        <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                        >
                            #{tag}
                            <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                className="ml-2 text-blue-600 hover:text-blue-800 focus:outline-none"
                            >
                                <FiX className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* Input */}
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setShowSuggestions(inputValue.length > 0 && filteredSuggestions.length > 0)}
                    placeholder={tags.length >= maxTags ? `Máximo de ${maxTags} tags atingido` : placeholder}
                    disabled={tags.length >= maxTags}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                />

                {/* Sugestões */}
                {showSuggestions && filteredSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredSuggestions.map((suggestion, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={() => addTag(suggestion)}
                                className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors flex items-center text-sm"
                            >
                                <FiHash className="w-3 h-3 mr-2 text-gray-400" />
                                {suggestion}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Dica */}
            <p className="mt-1 text-xs text-gray-500">
                Pressione Enter ou vírgula para adicionar. Use # para hashtags.
            </p>

            {/* Sugestões rápidas */}
            {suggestions.length > 0 && tags.length === 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                    <span className="text-xs text-gray-500 mr-1">Sugestões:</span>
                    {suggestions.slice(0, 5).map((suggestion, index) => (
                        <button
                            key={index}
                            type="button"
                            onClick={() => addTag(suggestion)}
                            className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                        >
                            #{suggestion}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TagInput;
