# 🚀 Painel ABZ - Sistema de Gestão Empresarial

<div align="center">

![Painel ABZ Logo](public/images/LC1_Azul.png)

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Version](https://img.shields.io/badge/Version-4.13.1-orange?style=for-the-badge)](#)

**Portal corporativo unificado para gestão de pessoas, processos e comunicação interna.**

[🌐 Demo Live](https://painelabzgroup.netlify.app) • [📖 Changelog](CHANGELOG.md) • [🔧 Setup](#-instalação-e-configuração)

</div>

---

## 📋 Sobre o Projeto

O **Painel ABZ** é o núcleo digital da ABZ Group, projetado para centralizar fluxos de trabalho, facilitar a comunicação entre colaboradores e automatizar processos administrativos complexos como reembolsos e avaliações de desempenho.

## ✨ Funcionalidades Atuais

### 🏢 **Gestão & Processos**
- **Dashboard Dinâmico** - Atalhos personalizados por usuário e busca global integrada.
- **Biblioteca Centralizada** - Gestão completa de ativos (PDF, Vídeo, Imagens, Links) com suporte a coleções e uploads seguros.
- **Ordens de Compra (PO)** - Fluxo completo de aprovação multinível com controle de alçada.
- **Setores & Permissões** - Gestão avançada de permissões baseada na estrutura organizacional (Setores).
- **Sistema de Reembolsos** - Gestão financeira com upload de comprovantes e geração de relatórios em PDF.
- **Avaliações de Desempenho** - Ciclos de avaliação 4.0 com autoavaliação e revisão gerencial.

### 💬 **Comunicação & Social**
- **Feed de Notícias Localizado** - Publicações interativas com suporte total a PT-BR e EN-US (visualizações, curtidas, comentários).
- **Rede Social Interna** - Interação em tempo real, menções e notificações push.
- **Chat & Vídeo** - Sistema de comunicação interna inspirado no Discord com canais e DMs.
- **Calendário Corporativo** - Sincronização de eventos e integração com Google Calendar.

### 🔐 **Segurança & Infra**
- **Autenticação Robusta** - Gestão via Supabase Auth com suporte a MFA, senhas, e Biometria (WebAuthn / Passkeys).
- **ACL Hierárquico** - Controle fino de acesso por módulo e recurso.
- **WKRadar Integration** - Acesso seguro a sistemas legados e gerenciamento de credenciais.
- **Internacionalização (i18n)** - Interface adaptável com detecção automática de idioma.

## 🏗️ Arquitetura

```mermaid
graph TB
    A[Frontend - Next.js 14] --> B[API Routes / Server Actions]
    B --> C[Supabase - DB & Auth]
    B --> D[Storage - Google Drive / Supabase]
    B --> E[External Services - ERP/Mail]
```

## 🔧 Instalação e Configuração

```bash
# Clone o repositório
git clone https://github.com/Caiolinooo/painel-abz.git

# Instale as dependências
npm install

# Configure o ambiente
cp .env.example .env.local

# Inicie o desenvolvimento
npm run dev
```

> [!IMPORTANT]
> Verifique se as variáveis de `DATABASE_URL` e `NEXT_PUBLIC_SUPABASE_URL` estão corretamente configuradas no seu `.env.local` antes de iniciar.

## 🚀 Últimas Atualizações (v4.13.0)

- **Biometria (Passkeys)**: Suporte completo a login biométrico (Face ID, Touch ID, Windows Hello) via WebAuthn, garantindo acesso ultraveloz sem senhas.
- **Assinatura Dinâmica**: Integração de biometria para a assinatura digital do recebimento de EPIs, simplificando o processo do funcionário.
- **Gestão de Passkeys**: Aba de gerenciamento no Perfil do Usuário para adicionar/remover dispositivos verificados.

---

## 🚀 Versões Anteriores (Destaques)

- **Controle de Estoque (v4.10)**: Gestão de inventário e movimentações de EPIs.
- **Busca Global (v4.8)**: Sistema unificado de pesquisa.

Para o histórico completo, consulte o [CHANGELOG.md](CHANGELOG.md).

---

<p align="center">
Desenvolvido com ❤️ pela equipe ABZ Group.
</p>
