'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { FiLock, FiEye, FiEyeOff, FiUser, FiPhone, FiArrowRight, FiGlobe, FiAlertTriangle, FiKey } from 'react-icons/fi';
import { FaLinkedin, FaGithub, FaInstagram } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import LanguageSelector from '@/components/LanguageSelector';
import InviteCodeInput from '@/components/auth/InviteCodeInput';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';

export default function Login() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [useEmail, setUseEmail] = useState(false);
  const [showInviteField, setShowInviteField] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const {
    initiateLogin,
    loginWithPassword,
    verifyCode,
    isAuthenticated,
    isLoading,
    loginStep,
    hasPassword,
    passwordExpired,
    authStatus
  } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  // Verificar se há um código de convite na URL
  useEffect(() => {
    const inviteParam = searchParams.get('invite');
    if (inviteParam) {
      setInviteCode(inviteParam);
      setShowInviteField(true);
      // Se temos um código de convite, vamos preferir o login por email
      setUseEmail(true);
    }
  }, [searchParams]);

  // Verificar se o usuário já está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      if (passwordExpired) {
        router.replace('/set-password');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [isAuthenticated, passwordExpired, router]);

  // Função para iniciar o login com número de telefone ou email
  const handlePhoneSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (useEmail) {
      // Validar o email
      if (!email || !email.includes('@')) {
        setError(t('auth.invalidEmail'));
        return;
      }
    } else {
      // Validar o número de telefone
      if (!phoneNumber || phoneNumber.length < 10 || !phoneNumber.startsWith('+') || !/^\+[0-9]+$/.test(phoneNumber)) {
        setError(t('auth.invalidPhoneNumber'));
        return;
      }
    }

    try {
      // Iniciar o processo de login
      const success = await initiateLogin(
        useEmail ? '' : phoneNumber,
        useEmail ? email : undefined,
        inviteCode || undefined
      );

      if (success) {
        // Não mostrar nenhuma mensagem de código enviado, apenas redirecionar para a próxima etapa
        setSuccess('');
      } else if (authStatus === 'pending') {
        setError(t('auth.pendingRequestMessage'));
      } else if (authStatus === 'unauthorized') {
        setError(t('auth.unauthorizedAccessMessage'));
      } else if (authStatus === 'inactive') {
        setError('Sua conta está desativada. Entre em contato com o suporte.');
      } else {
        setError(useEmail ? t('auth.invalidEmail') : t('auth.invalidPhoneNumber'));
      }
    } catch (error) {
      setError(t('auth.requestError'));
    }
  };

  // Função para verificar o código
  const handleVerificationSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validar o código de verificação
    if (!verificationCode || verificationCode.length !== 6) {
      setError(t('auth.invalidCode'));
      return;
    }

    try {
      // Verificar o código
      const success = await verifyCode(
        useEmail ? '' : phoneNumber,
        verificationCode,
        useEmail ? email : undefined,
        inviteCode || undefined
      );

      if (success) {
        // O redirecionamento é feito no useEffect quando isAuthenticated muda
      } else if (authStatus === 'pending') {
        setError(t('auth.pendingRequestMessage'));
      } else if (authStatus === 'unauthorized') {
        setError(t('auth.unauthorizedAccessMessage'));
      } else if (authStatus === 'inactive') {
        setError('Sua conta está desativada. Entre em contato com o suporte.');
      } else {
        setError(t('auth.invalidCode'));
      }
    } catch (error) {
      setError(t('auth.codeError'));
    }
  };

  // Função para login com senha
  const handlePasswordLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // Validar a senha
      if (!password) {
        setError(t('common.required'));
        return;
      }

      // Determinar se estamos usando email ou telefone
      const identifier = useEmail ? email : phoneNumber;

      if (!identifier) {
        setError(useEmail ? t('auth.invalidEmail') : t('auth.invalidPhoneNumber'));
        return;
      }

      console.log('Tentando login com senha:', {
        [useEmail ? 'email' : 'phoneNumber']: identifier,
        password: password.substring(0, 3) + '...',
        rememberMe
      });

      const success = await loginWithPassword(identifier, password, rememberMe);
      console.log('Resultado do login:', success ? 'Sucesso' : 'Falha');

      if (!success) {
        setError(t('auth.invalidPassword'));
      }
    } catch (error) {
      console.error('Erro ao fazer login com senha:', error);
      setError(t('auth.requestError'));
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12 lg:px-8 bg-abz-background">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Image
            src="/images/LC1_Azul.png"
            alt="ABZ Group Logo"
            width={200}
            height={60}
            className="h-auto"
            priority
          />
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-abz-blue-dark">
          {loginStep === 'phone' ? t('auth.accessAccount') :
           loginStep === 'verification' ? t('auth.verifyPhone') :
           loginStep === 'password' ? t('auth.enterPassword') :
           loginStep === 'pending' ? t('auth.pendingRequest') :
           loginStep === 'unauthorized' ? t('auth.unauthorizedAccess') : t('auth.accessAccount')}
        </h2>
        <div className="mt-3 flex justify-center">
          <LanguageSelector variant="inline" />
        </div>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white px-6 py-8 shadow-md rounded-lg sm:px-10">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm mb-4">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm mb-4">
              {success}
            </div>
          )}

          {/* Formulário de Telefone */}
          {loginStep === 'phone' && (
            <form onSubmit={handlePhoneSubmit} className="space-y-6">
              <div className="flex items-center justify-center space-x-4 mb-4">
                <button
                  type="button"
                  onClick={() => setUseEmail(false)}
                  className={`flex items-center px-4 py-2 rounded-md ${!useEmail ? 'bg-abz-blue text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  <FiPhone className="mr-2" />
                  {t('auth.phoneLogin')}
                </button>
                <button
                  type="button"
                  onClick={() => setUseEmail(true)}
                  className={`flex items-center px-4 py-2 rounded-md ${useEmail ? 'bg-abz-blue text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  <FiUser className="mr-2" />
                  {t('auth.emailLogin')}
                </button>
              </div>

              {!useEmail ? (
                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-medium leading-6 text-gray-900">
                    {t('auth.phoneNumber')}
                  </label>
                  <div className="mt-2 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiPhone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="phoneNumber"
                      name="phoneNumber"
                      type="tel"
                      autoComplete="tel"
                      required={!useEmail}
                      placeholder="+5511999999999"
                      value={phoneNumber}
                      onChange={(e) => {
                        // Formatar o número de telefone para garantir que esteja no formato correto
                        let value = e.target.value;

                        // Remover todos os caracteres não numéricos, exceto o sinal de +
                        value = value.replace(/[^0-9+]/g, '');

                        // Garantir que o número comece com +
                        if (value && !value.startsWith('+')) {
                          value = '+' + value;
                        }

                        setPhoneNumber(value);
                      }}
                      className="block w-full rounded-md border-0 py-2.5 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-abz-blue sm:text-sm sm:leading-6"
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {t('auth.phoneNumberHelp')}
                  </p>
                </div>
              ) : (
                <div>
                  <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">
                    Email
                  </label>
                  <div className="mt-2 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiUser className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required={useEmail}
                      placeholder={t('locale.code') === 'en-US' ? 'your@email.com' : 'seu@email.com'}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full rounded-md border-0 py-2.5 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-abz-blue sm:text-sm sm:leading-6"
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {t('auth.enterEmail')}
                  </p>
                </div>
              )}

              <InviteCodeInput
                inviteCode={inviteCode}
                setInviteCode={setInviteCode}
                showInviteField={showInviteField}
                setShowInviteField={setShowInviteField}
              />

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full justify-center rounded-md bg-abz-blue px-3 py-2.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-abz-blue-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-abz-blue transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? t('auth.sending') : t('auth.continue')}
                </button>
              </div>
            </form>
          )}

          {/* Formulário de Verificação */}
          {loginStep === 'verification' && (
            <form onSubmit={handleVerificationSubmit} className="space-y-6">
              <div>
                <label htmlFor="verificationCode" className="block text-sm font-medium leading-6 text-gray-900">
                  {t('auth.verificationCode')}
                </label>
                <div className="mt-2 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="verificationCode"
                    name="verificationCode"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                    className="block w-full rounded-md border-0 py-2.5 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-abz-blue sm:text-sm sm:leading-6"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {t('auth.verificationCodeHelp')}
                </p>
              </div>

              <div className="flex flex-col space-y-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full justify-center rounded-md bg-abz-blue px-3 py-2.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-abz-blue-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-abz-blue transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? t('auth.verifying') : t('auth.verifyCode')}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setVerificationCode('');
                    setError('');
                    setSuccess('');
                    initiateLogin(phoneNumber);
                  }}
                  className="flex w-full justify-center rounded-md bg-gray-100 px-3 py-2.5 text-sm font-medium leading-6 text-gray-700 shadow-sm hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300 transition-colors duration-200"
                >
                  {t('auth.resendCode')}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPhoneNumber('');
                    setVerificationCode('');
                    setError('');
                    setSuccess('');
                    // Voltar para a etapa de telefone
                    // Isso é feito no contexto, mas podemos forçar aqui
                    window.location.reload();
                  }}
                  className="flex w-full justify-center text-sm font-medium text-abz-blue hover:text-abz-blue-dark transition-colors duration-200"
                >
                  {t('auth.backToStart')}
                </button>
              </div>
            </form>
          )}

          {/* Tela de Solicitação Pendente */}
          {loginStep === 'pending' && (
            <div className="space-y-6 text-center">
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-6 py-4 rounded-md">
                <h3 className="text-lg font-medium mb-2">{t('auth.pendingRequestTitle')}</h3>
                <p className="mb-4">
                  {t('auth.pendingRequestMessage')}
                </p>
                <p className="text-sm">
                  {t('auth.pendingRequestNotification')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  // Não podemos usar setLoginStep diretamente
                  setError('');
                  setSuccess('');
                  // Forçar um recarregamento da página para reiniciar o processo
                  window.location.reload();
                }}
                className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-abz-blue"
              >
                {t('auth.backToStart')}
              </button>
            </div>
          )}

          {/* Tela de Acesso Não Autorizado */}
          {loginStep === 'unauthorized' && (
            <div className="space-y-6 text-center">
              <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-md">
                <h3 className="text-lg font-medium mb-2">{t('auth.unauthorizedAccessTitle')}</h3>
                <p className="mb-4">
                  {t('auth.unauthorizedAccessMessage')}
                </p>
                <p className="text-sm">
                  {t('auth.unauthorizedAccessContact')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  // Não podemos usar setLoginStep diretamente, então vamos reiniciar o processo
                  setError('');
                  setSuccess('');
                  setPhoneNumber('');
                  setEmail('');
                  setVerificationCode('');
                  setPassword('');
                  setInviteCode('');
                  // Forçar um recarregamento da página para reiniciar o processo
                  window.location.reload();
                }}
                className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-abz-blue"
              >
                {t('auth.backToStart')}
              </button>
            </div>
          )}

          {/* Formulário de Recuperação de Senha */}
          {showForgotPassword && (
            <ForgotPasswordForm onCancel={() => setShowForgotPassword(false)} />
          )}

          {/* Formulário de Login com Senha */}
          {loginStep === 'password' && !showForgotPassword && (
            <>
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md text-sm mb-4">
                {t('auth.registeredUserMessage')}
              </div>
              <form onSubmit={handlePasswordLogin} className="space-y-6">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-900">
                    {t('auth.password')}
                  </label>
                  <div className="mt-2 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiLock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full rounded-md border-0 py-2.5 pl-10 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-abz-blue sm:text-sm sm:leading-6"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                    </button>
                  </div>
                  <div className="flex justify-between mt-1">
                    <div className="flex items-center">
                      <input
                        id="rememberMe"
                        name="rememberMe"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 text-abz-blue focus:ring-abz-blue border-gray-300 rounded"
                      />
                      <label htmlFor="rememberMe" className="ml-2 block text-xs text-gray-500">
                        {t('auth.rememberMe')}
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-xs text-abz-blue hover:text-abz-blue-dark"
                    >
                      {t('auth.forgotPassword')}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col space-y-3">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex w-full justify-center rounded-md bg-abz-blue px-3 py-2.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-abz-blue-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-abz-blue transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isLoading ? t('auth.loggingIn') : t('auth.login')}
                  </button>

                  {/* Botão de código de verificação removido para usuários já cadastrados */}

                  <button
                    type="button"
                    onClick={() => {
                      setPhoneNumber('');
                      setEmail('');
                      setPassword('');
                      setError('');
                      setSuccess('');
                      // Voltar para a etapa de telefone
                      window.location.reload();
                    }}
                    className="flex w-full justify-center text-sm font-medium text-abz-blue hover:text-abz-blue-dark transition-colors duration-200"
                  >
                    {t('auth.backToStart')}
                  </button>
                </div>
              </form>
            </>
          )}

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">
                  ABZ Group
                </span>
              </div>
            </div>

            {/* Link para página de definição de senha com código de convite */}
            {inviteCode && (
              <div className="mt-4 text-center">
                <Link
                  href={`/set-password?invite=${inviteCode}`}
                  className="inline-flex items-center text-sm text-abz-blue hover:text-abz-blue-dark"
                >
                  <FiKey className="mr-1" />
                  {t('auth.setPasswordWithInvite')}
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="mt-10 text-center">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} ABZ Group. {t('common.all')} {t('common.rights')} {t('common.reserved')}.
          </p>
          <div className="mt-3 flex flex-col items-center">
            <p className="text-xs text-gray-500 mb-2">
              {t('common.developedBy')}: <span className="font-semibold">Caio Valerio Goulart Correia</span>
            </p>
            <div className="flex space-x-4">
              <a href="https://www.linkedin.com/in/caio-goulart/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                <FaLinkedin className="h-5 w-5 text-gray-400 hover:text-blue-600 transition-colors" />
              </a>
              <a href="https://github.com/Caiolinooo" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                <FaGithub className="h-5 w-5 text-gray-400 hover:text-gray-700 transition-colors" />
              </a>
              <a href="https://www.instagram.com/Tal_do_Goulart" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <FaInstagram className="h-5 w-5 text-gray-400 hover:text-pink-600 transition-colors" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
