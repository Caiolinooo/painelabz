'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  FiMail,
  FiSave,
  FiRefreshCw,
  FiShield,
  FiCheckCircle,
  FiAlertCircle,
  FiEye,
  FiEyeOff,
  FiSend,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getToken } from '@/lib/tokenStorage';

type EmailProvider = 'exchange' | 'gmail' | 'sendgrid';

type EmailSettingsResponse = {
  user: string;
  host: string;
  port: number;
  secure: boolean;
  from: string;
  replyTo: string;
  provider: EmailProvider;
  passwordSet: boolean;
  passwordMasked?: string;
  source: 'db' | 'env' | 'none';
  sources?: Record<string, 'db' | 'env' | 'none'>;
};

const PROVIDER_OPTIONS: Array<{ value: EmailProvider; label: string }> = [
  { value: 'exchange', label: 'Microsoft Exchange / Office 365' },
  { value: 'gmail', label: 'Gmail (App Password)' },
  { value: 'sendgrid', label: 'SendGrid SMTP' },
];

function sourceBadge(source: 'db' | 'env' | 'none') {
  switch (source) {
    case 'db':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
          Banco (app_secrets)
        </span>
      );
    case 'env':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
          Ambiente (.env)
        </span>
      );
    case 'none':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
          Não configurado
        </span>
      );
    default: {
      const _never: never = source;
      void _never;
      return null;
    }
  }
}

export default function AdminEmailSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [host, setHost] = useState('smtp.office365.com');
  const [port, setPort] = useState(587);
  const [secure, setSecure] = useState(false);
  const [from, setFrom] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [provider, setProvider] = useState<EmailProvider>('exchange');
  const [passwordSet, setPasswordSet] = useState(false);
  const [source, setSource] = useState<'db' | 'env' | 'none'>('none');
  const [testTo, setTestTo] = useState('');

  const authHeaders = useCallback((): HeadersInit => {
    const token = getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/email-settings', { headers: authHeaders() });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Falha ao carregar');
      }
      const data = (await res.json()) as EmailSettingsResponse;
      setUser(data.user || '');
      setHost(data.host || 'smtp.office365.com');
      setPort(typeof data.port === 'number' ? data.port : 587);
      setSecure(Boolean(data.secure));
      setFrom(data.from || '');
      setReplyTo(data.replyTo || '');
      setProvider(data.provider || 'exchange');
      setPasswordSet(Boolean(data.passwordSet));
      setSource(data.source || 'none');
      setPassword('');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar credenciais');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleProviderChange = (next: EmailProvider) => {
    setProvider(next);
    switch (next) {
      case 'exchange':
        setHost('smtp.office365.com');
        setPort(587);
        setSecure(false);
        break;
      case 'gmail':
        setHost('smtp.gmail.com');
        setPort(465);
        setSecure(true);
        break;
      case 'sendgrid':
        setHost('smtp.sendgrid.net');
        setPort(587);
        setSecure(false);
        break;
      default: {
        const _never: never = next;
        void _never;
      }
    }
  };

  const handleSave = async () => {
    if (!user || !user.includes('@')) {
      toast.error('Informe um e-mail/usuário SMTP válido');
      return;
    }
    if (!passwordSet && !password.trim()) {
      toast.error('Informe a senha (ou app password) na primeira configuração');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/admin/email-settings', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          user,
          password: password.trim() || undefined,
          host,
          port,
          secure,
          from: from || user,
          replyTo: replyTo || user,
          provider,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao salvar');
      }
      toast.success('Credenciais salvas no banco (app_secrets)');
      setPassword('');
      setPasswordSet(Boolean(data.passwordSet));
      setSource(data.source || 'db');
      await loadSettings();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      const res = await fetch('/api/admin/email-settings', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          action: 'test',
          to: testTo.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.details || data.message || data.error || 'Falha no teste');
      }
      toast.success(data.message || 'Conexão OK');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Erro no teste SMTP');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-gray-500">
        <FiRefreshCw className="mr-2 animate-spin" /> Carregando credenciais de e-mail…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
            <FiMail className="text-blue-600" />
            Credenciais de E-mail
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Altere a conta SMTP usada pelo portal. Valores são gravados em{' '}
            <code className="rounded bg-gray-100 px-1">app_secrets</code> (senha criptografada). O
            ambiente (.env) serve só como bootstrap/fallback.
          </p>
        </div>
        {sourceBadge(source)}
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        <div className="mb-1 flex items-center gap-2 font-medium">
          <FiShield /> Resolução em runtime
        </div>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Banco <code>app_secrets</code> (prioridade)
          </li>
          <li>Variáveis de ambiente <code>EMAIL_*</code></li>
          <li>Erro se ambos estiverem ausentes — nunca há senha no código</li>
        </ol>
      </div>

      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Provedor</span>
          <select
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={provider}
            onChange={(e) => handleProviderChange(e.target.value as EmailProvider)}
          >
            {PROVIDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">E-mail / usuário SMTP</span>
          <input
            type="email"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            placeholder="noreply@suaempresa.com"
            autoComplete="off"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Senha / App Password
            {passwordSet ? (
              <span className="ml-2 text-xs font-normal text-gray-500">
                (já configurada — deixe em branco para manter)
              </span>
            ) : null}
          </span>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={passwordSet ? '••••••••' : 'Senha ou app password'}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-gray-700">Host SMTP</span>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={host}
              onChange={(e) => setHost(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Porta</span>
            <input
              type="number"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              min={1}
              max={65535}
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={secure}
            onChange={(e) => setSecure(e.target.checked)}
            className="rounded border-gray-300"
          />
          Conexão segura (TLS implícito / porta 465)
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">From</span>
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder='"ABZ Group" <noreply@suaempresa.com>'
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Reply-To</span>
          <input
            type="email"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={replyTo}
            onChange={(e) => setReplyTo(e.target.value)}
            placeholder="mesmo do usuário, se vazio"
          />
        </label>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? <FiRefreshCw className="animate-spin" /> : <FiSave />}
            Salvar no banco
          </button>
          <button
            type="button"
            onClick={loadSettings}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <FiRefreshCw /> Recarregar
          </button>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-medium text-gray-900">
          <FiCheckCircle className="text-emerald-600" /> Testar conexão
        </h2>
        <p className="text-sm text-gray-600">
          Verifica SMTP com as credenciais atuais (DB → env). Opcionalmente envia um e-mail de teste.
        </p>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Destinatário do teste (opcional)
          </span>
          <input
            type="email"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="seu@email.com"
          />
        </label>
        <button
          type="button"
          onClick={handleTest}
          disabled={testing}
          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {testing ? <FiRefreshCw className="animate-spin" /> : <FiSend />}
          {testTo.trim() ? 'Testar e enviar' : 'Testar conexão'}
        </button>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <FiAlertCircle className="mt-0.5 shrink-0" />
        <div>
          Após salvar, o transporte SMTP em memória é reiniciado. Em ambientes com várias instâncias,
          cada instância atualiza no próximo request (cache ~30s). Mantenha o .env apenas como
          bootstrap até migrar tudo para o banco.
        </div>
      </div>
    </div>
  );
}
