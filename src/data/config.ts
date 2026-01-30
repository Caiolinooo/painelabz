/**
 * Configurações globais do sistema
 * Este arquivo contém configurações que podem ser editadas pelo painel de administração
 */

export interface SiteConfig {
  title: string;
  description: string;
  logo: string;
  favicon: string;
  primaryColor: string;
  secondaryColor: string;
  companyName: string;
  contactEmail: string;
  footerText: string;
  dashboardTitle: string;
  dashboardDescription: string;
  sidebarTitle?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  googleRedirectUri?: string;
  version?: string;
  login_logo?: string;
  sidebar_logo?: string;
  widget_logo?: string;
}

// Configuração padrão do site
const siteConfig: SiteConfig = {
  title: "Painel ABZ Group",
  description: "Painel centralizado para colaboradores da ABZ Group",
  logo: "",
  favicon: "/favicon.ico",
  primaryColor: "#005dff", // abz-blue
  secondaryColor: "#6339F5", // abz-purple
  companyName: "ABZ Group",
  contactEmail: "contato@groupabz.com",
  footerText: "© 2024 ABZ Group. Todos os direitos reservados.",
  dashboardTitle: "Painel de Logística ABZ Group",
  dashboardDescription: "Bem-vindo ao centro de recursos para colaboradores da logística.",
  sidebarTitle: "Painel ABZ",
  version: "3.1.0",
  login_logo: "",
  sidebar_logo: "",
  widget_logo: ""
};

export default siteConfig;
