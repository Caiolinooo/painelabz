'use client';

import React from 'react';
import Image from 'next/image';
import ReimbursementForm from '@/components/ReimbursementForm';
import Footer from '@/components/Footer';
import { motion } from 'framer-motion';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function PublicReimbursementPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100">
      {/* Toast notifications */}
      <ToastContainer position="top-right" theme="colored" />

      <div className="container mx-auto py-12 px-4">
        {/* Animated header with logo */}
        <motion.header
          className="text-center mb-12"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex justify-center">
            <Image
              src="/images/LC1_Azul.png"
              alt="ABZ Group Logo"
              width={250}
              height={60}
              priority
            />
          </div>
        </motion.header>

        {/* Main form */}
        <ReimbursementForm />

        {/* Footer */}
        <motion.div
          className="mt-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Footer />
        </motion.div>
      </div>
    </div>
  );
}
