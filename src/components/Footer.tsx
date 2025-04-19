'use client';

import React from 'react';
import { FaLinkedin, FaGithub, FaInstagram } from 'react-icons/fa';
import { useI18n } from '@/contexts/I18nContext';

export default function Footer() {
  const { t } = useI18n();
  
  return (
    <footer className="bg-white border-t border-gray-200 py-4 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-center">
        <p className="text-center sm:text-left text-sm text-gray-500 mb-2 sm:mb-0">
          © {new Date().getFullYear()} ABZ Group - {t('common.all')} {t('common.rights')} {t('common.reserved')}
        </p>
        <div className="flex flex-col sm:flex-row items-center">
          <p className="text-center sm:text-right text-xs text-gray-400 mb-2 sm:mb-0 sm:mr-4">
            {t('common.developedBy')}: <span className="font-semibold">Caio Valerio Goulart Correia</span>
          </p>
          <div className="flex space-x-4 mt-2 sm:mt-0">
            <a href="https://www.linkedin.com/in/caio-goulart/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <FaLinkedin className="h-5 w-5 text-gray-400 hover:text-abz-blue transition-colors" />
            </a>
            <a href="https://github.com/Caiolinooo" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
              <FaGithub className="h-5 w-5 text-gray-400 hover:text-abz-text-black transition-colors" />
            </a>
            <a href="https://www.instagram.com/Tal_do_Goulart" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <FaInstagram className="h-5 w-5 text-gray-400 hover:text-pink-600 transition-colors" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
