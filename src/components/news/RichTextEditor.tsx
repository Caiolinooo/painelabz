'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
    FiBold, FiItalic, FiUnderline, FiList, FiLink, FiCode,
    FiEye, FiEyeOff, FiSmile
} from 'react-icons/fi';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    maxLength?: number;
    showPreview?: boolean;
    className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
    value,
    onChange,
    placeholder = 'Digite seu texto...',
    maxLength = 1024,
    showPreview = true,
    className = ''
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [showLivePreview, setShowLivePreview] = useState(showPreview);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [linkText, setLinkText] = useState('');

    // Emojis comuns
    const commonEmojis = [
        '😀', '😃', '😄', '😁', '😊', '😍', '🥰', '😘',
        '👍', '👏', '🙌', '🤝', '💪', '✨', '🎉', '🎊',
        '❤️', '💙', '💚', '💛', '🧡', '💜', '🖤', '🤍',
        '🔥', '⭐', '✅', '❌', '💯', '🚀', '💡', '📌'
    ];

    // Função para inserir formatação
    const insertFormatting = useCallback((openTag: string, closeTag: string, placeholder = 'texto') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = value.substring(start, end);
        const textToInsert = selectedText || placeholder;

        const newText =
            value.substring(0, start) +
            openTag + textToInsert + closeTag +
            value.substring(end);

        onChange(newText);

        // Reposicionar cursor
        setTimeout(() => {
            if (selectedText) {
                textarea.selectionStart = start;
                textarea.selectionEnd = start + openTag.length + textToInsert.length + closeTag.length;
            } else {
                const cursorPos = start + openTag.length;
                textarea.selectionStart = cursorPos;
                textarea.selectionEnd = cursorPos + placeholder.length;
            }
            textarea.focus();
        }, 0);
    }, [value, onChange]);

    // Atalhos de teclado
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    insertFormatting('<b>', '</b>');
                    break;
                case 'i':
                    e.preventDefault();
                    insertFormatting('<i>', '</i>');
                    break;
                case 'u':
                    e.preventDefault();
                    insertFormatting('<u>', '</u>');
                    break;
                case 'k':
                    e.preventDefault();
                    insertLink();
                    break;
            }
        }
    }, [insertFormatting]);

    // Inserir link
    const insertLink = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const selected = value.substring(start, end);
            setLinkText(selected);
        }
        setLinkUrl('');
        setShowLinkInput(!showLinkInput);
        setShowEmojiPicker(false);
    };

    const confirmLink = () => {
        if (linkUrl) {
            const text = linkText || linkUrl;
            insertFormatting(`<a href="${linkUrl}" target="_blank">`, '</a>', text);
            setShowLinkInput(false);
            setLinkUrl('');
            setLinkText('');
        }
    };

    // Inserir emoji
    const insertEmoji = (emoji: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const newText =
            value.substring(0, start) +
            emoji +
            value.substring(start);

        onChange(newText);
        setShowEmojiPicker(false);

        setTimeout(() => {
            textarea.focus();
            const newPos = start + emoji.length;
            textarea.selectionStart = newPos;
            textarea.selectionEnd = newPos;
        }, 0);
    };

    // Buttons toolbar data
    const toolbarButtons = [
        { icon: FiBold, label: 'Negrito (Ctrl+B)', onClick: () => insertFormatting('<b>', '</b>') },
        { icon: FiItalic, label: 'Itálico (Ctrl+I)', onClick: () => insertFormatting('<i>', '</i>') },
        { icon: FiUnderline, label: 'Sublinhado (Ctrl+U)', onClick: () => insertFormatting('<u>', '</u>') },
        { icon: FiList, label: 'Lista', onClick: () => insertFormatting('<ul>\n  <li>', '</li>\n</ul>', 'item') },
        { icon: FiLink, label: 'Link (Ctrl+K)', onClick: insertLink },
        { icon: FiCode, label: 'Código', onClick: () => insertFormatting('<code>', '</code>') },
    ];

    return (
        <div className={`space-y-2 ${className}`}>
            {/* Toolbar */}
            <div className="flex items-center gap-1 p-2 bg-gray-50 border border-gray-300 rounded-t-lg">
                {toolbarButtons.map((btn, idx) => {
                    const Icon = btn.icon;
                    // Se for o botão de link, renderizar com o popover
                    if (btn.label.includes('Link')) {
                        return (
                            <div key={idx} className="relative">
                                <button
                                    type="button"
                                    onClick={btn.onClick}
                                    title={btn.label}
                                    className={`p-2 hover:bg-gray-200 rounded transition-colors ${showLinkInput ? 'bg-gray-200 text-blue-600' : 'text-gray-700 hover:text-gray-900'}`}
                                >
                                    <Icon className="w-4 h-4" />
                                </button>
                                {showLinkInput && (
                                    <div className="absolute top-full mt-1 left-0 bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-50 w-72">
                                        <div className="space-y-2">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Texto</label>
                                                <input
                                                    type="text"
                                                    value={linkText}
                                                    onChange={e => setLinkText(e.target.value)}
                                                    placeholder="Texto do link"
                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                    autoFocus
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">URL</label>
                                                <input
                                                    type="url"
                                                    value={linkUrl}
                                                    onChange={e => setLinkUrl(e.target.value)}
                                                    placeholder="https://exemplo.com"
                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                    onKeyDown={e => e.key === 'Enter' && confirmLink()}
                                                />
                                            </div>
                                            <div className="flex justify-end gap-2 pt-1">
                                                <button
                                                    onClick={() => setShowLinkInput(false)}
                                                    className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={confirmLink}
                                                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                                >
                                                    Inserir
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    }
                    return (
                        <button
                            key={idx}
                            type="button"
                            onClick={btn.onClick}
                            title={btn.label}
                            className="p-2 hover:bg-gray-200 rounded transition-colors text-gray-700 hover:text-gray-900"
                        >
                            <Icon className="w-4 h-4" />
                        </button>
                    );
                })}

                <div className="w-px h-6 bg-gray-300 mx-1" />

                {/* Emoji Picker */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        title="Inserir Emoji"
                        className="p-2 hover:bg-gray-200 rounded transition-colors text-gray-700 hover:text-gray-900"
                    >
                        <FiSmile className="w-4 h-4" />
                    </button>

                    {showEmojiPicker && (
                        <div className="absolute top-full mt-1 left-0 bg-white border border-gray-300 rounded-lg shadow-lg p-2 z-50 grid grid-cols-8 gap-1 w-80">
                            {commonEmojis.map((emoji, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => insertEmoji(emoji)}
                                    className="text-xl hover:bg-gray-100 rounded p-1 transition-colors flex items-center justify-center h-8 w-8"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Toggle Preview */}
                <button
                    type="button"
                    onClick={() => setShowLivePreview(!showLivePreview)}
                    title={showLivePreview ? 'Ocultar Preview' : 'Mostrar Preview'}
                    className="ml-auto p-2 hover:bg-gray-200 rounded transition-colors text-gray-700 hover:text-gray-900"
                >
                    {showLivePreview ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                </button>
            </div>

            {/* Editor & Preview */}
            <div className={`grid ${showLivePreview ? 'grid-cols-2 gap-4' : 'grid-cols-1'}`}>
                {/* Textarea */}
                <div className="relative">
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        maxLength={maxLength}
                        rows={showLivePreview ? 12 : 8}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
                    />
                    <div className="mt-2 text-sm text-gray-500 text-right">
                        {value.length}/{maxLength} caracteres
                    </div>
                </div>

                {/* Live Preview */}
                {showLivePreview && (
                    <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">Preview ao Vivo</div>
                        <div
                            className="p-4 border border-gray-300 rounded-lg bg-white min-h-[200px] prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: value || '<p class="text-gray-400 italic">O preview aparecerá aqui...</p>' }}
                        />
                    </div>
                )}
            </div>

            {/* Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                    <strong>💡 Dicas:</strong> Use os botões da barra de ferramentas ou atalhos do teclado:
                    <kbd className="mx-1 px-1 bg-blue-100 rounded">Ctrl+B</kbd> negrito,
                    <kbd className="mx-1 px-1 bg-blue-100 rounded">Ctrl+I</kbd> itálico,
                    <kbd className="mx-1 px-1 bg-blue-100 rounded">Ctrl+K</kbd> link
                </p>
            </div>
        </div>
    );
};

export default RichTextEditor;
