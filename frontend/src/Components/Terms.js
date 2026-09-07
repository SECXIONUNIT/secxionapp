import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  FileText,
  Users,
  Mail,
  Calendar,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import Navigation from './Navigation';
import SecxionLogo from '../Assets/optimized/secxion-logo-112.png';
import BackButton from './BackButton';

const Terms = () => {
  const [expandedSections, setExpandedSections] = useState({});

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const toggleSection = (sectionId) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const Section = ({
    id,
    title,
    children,
    icon: Icon,
    isExpandable = false,
  }) => (
    <motion.div variants={itemVariants} className="mb-8">
      <div
        className={`flex items-center justify-between mb-4 ${isExpandable ? 'cursor-pointer' : ''}`}
        onClick={isExpandable ? () => toggleSection(id) : undefined}
      >
        <div className="flex items-center">
          {Icon && <Icon className="h-6 w-6 text-yellow-400 mr-3" />}
          <h2 className="text-2xl font-bold text-gray-100">{title}</h2>
        </div>
        {isExpandable && (
          <div className="text-gray-400">
            {expandedSections[id] ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </div>
        )}
      </div>
      <div
        className={`text-gray-300 leading-relaxed space-y-4 ${isExpandable && !expandedSections[id] ? 'hidden' : ''}`}
      >
        {children}
      </div>
    </motion.div>
  );

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-gray-100 font-sans relative overflow-hidden"
      initial={false}
      animate="visible"
      variants={containerVariants}
    >
      <Navigation currentPage="terms" />

      {/* Logo background overlay */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Slogo background, no shadow, subtle blend */}
        <img
          src={SecxionLogo}
          alt="Secxion Logo Background"
          className="absolute left-1/2 top-1/2 w-[600px] h-[600px] max-w-none opacity-10 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none"
          style={{
            filter: 'blur(2px)',
            mixBlendMode: 'screen',
          }}
        />
        {/* ...existing geometric backgrounds... */}
        <div className="absolute top-20 left-10 w-32 h-32 border-2 border-gray-700/30 rotate-45 animate-spin [animation-duration:20s]"></div>
        <div className="absolute top-1/3 right-20 w-20 h-20 bg-gradient-to-r from-yellow-900/40 to-yellow-800/40 rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/4 w-40 h-40 border-2 border-gray-700/30 rounded-full animate-bounce [animation-duration:3s]"></div>
      </div>

      <main className="relative z-10 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <BackButton fallbackTo="/" className="mb-6" />
          {/* Header */}
          <motion.div className="text-center mb-16" variants={itemVariants}>
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-black to-yellow-700 rounded-2xl mb-6 shadow-lg">
              <FileText className="h-8 w-8 text-yellow-400" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-100 mb-4">
              Terms of Service
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Understanding our terms helps create a transparent and trustworthy
              experience for everyone.
            </p>
            <div className="flex items-center justify-center mt-6 text-sm text-gray-500">
              <Calendar className="h-4 w-4 mr-2" />
              Last Updated: April 16, 2025
            </div>
          </motion.div>

          {/* Content */}
          <motion.div
            className="bg-gradient-to-br from-gray-900/80 to-gray-800/70 rounded-3xl p-8 sm:p-12 relative overflow-hidden border border-yellow-700/20 backdrop-blur-xl"
            variants={itemVariants}
            style={{
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {/* Glassmorphism overlay */}
            <div
              className="absolute inset-0 rounded-3xl pointer-events-none"
              style={{
                background:
                  'linear-gradient(120deg, rgba(40,40,60,0.7) 60%, rgba(250,204,21,0.08) 100%)',
                backdropFilter: 'blur(8px)',
                zIndex: 1,
              }}
            ></div>
            {/* ...existing decorative elements... */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-800 to-gray-700 rounded-full transform translate-x-16 -translate-y-16 opacity-50"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-gray-700 to-gray-600 rounded-full transform -translate-x-12 translate-y-12 opacity-50"></div>

            <div className="relative z-10">
              <motion.p
                className="text-lg text-gray-300 leading-relaxed mb-8 p-4 bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl border-l-4 border-yellow-500"
                variants={itemVariants}
              >
                Please read these Terms of Service ("Terms") carefully before
                using the secxion.com website (the "Service"). By accessing or
                using the Service, you agree to be bound by these Terms. If you
                do not agree to all of the terms and conditions set forth below,
                then you may not access or use the Service.
              </motion.p>

              <Section
                id="acceptance"
                title="1. Acceptance of Terms"
                icon={Shield}
                isExpandable={true}
              >
                <div className="bg-gray-800 p-4 rounded-lg">
                  <p className="text-gray-300">
                    These Terms constitute a legally binding agreement between
                    you and Secxion.com. You acknowledge that you have read,
                    understood, and agree to be bound by these Terms.
                  </p>
                </div>
              </Section>

              <Section
                id="service"
                title="2. Description of Service"
                icon={FileText}
                isExpandable={true}
              >
                <div className="bg-gray-800 p-4 rounded-lg">
                  <p className="text-gray-300">
                    Secxion.com currently provides a platform that allows users
                    to sell their valid gift cards to us at rates determined by
                    Secxion.com.
                  </p>
                </div>
              </Section>

              <Section
                id="obligations"
                title="3. User Obligations"
                icon={Users}
                isExpandable={true}
              >
                <p className="mb-4 text-gray-300">
                  By using the Service, you represent and warrant that:
                </p>
                <div className="space-y-3">
                  {[
                    'You are at least the legal age of majority in your jurisdiction.',
                    'You have the legal right and authority to sell the gift cards you submit.',
                    'The gift cards you submit are valid and unredeemed.',
                    'You will provide accurate and complete requirements during the transaction process.',
                    'You will comply with all applicable laws and regulations.',
                    'You will not engage in any fraudulent or unlawful activities through the Service.',
                  ].map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center p-3 bg-gray-800 rounded-lg"
                    >
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
                      <span className="text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>
              </Section>

              <Section
                id="transactions"
                title="4. Gift Card Transactions"
                icon={FileText}
                isExpandable={true}
              >
                <div className="space-y-3">
                  {[
                    'When you submit a gift card for sale, you are offering to sell it to Secxion.com at the quoted rate.',
                    'Secxion.com reserves the right to accept or reject any gift card submission for any reason.',
                    'The final payout amount for your gift card will be determined by Secxion.com based on various factors.',
                    'Payment will be processed using the methods specified on the Service. Processing times may vary.',
                    'Secxion.com is not responsible for any errors in payment information provided by the user.',
                  ].map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center p-3 bg-gray-800 rounded-lg"
                    >
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
                      <span className="text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>
              </Section>

              <Section
                id="intellectual"
                title="5. Intellectual Property"
                icon={Shield}
                isExpandable={true}
              >
                <div className="bg-gradient-to-r from-gray-800 to-gray-700 p-6 rounded-xl border border-yellow-500">
                  <p className="text-gray-300">
                    The Service and its original content, features, and
                    functionality are and will remain the exclusive property of
                    Secxion.com and its licensors.
                  </p>
                </div>
              </Section>

              <Section
                id="warranties"
                title="6. Disclaimer of Warranties"
                icon={FileText}
                isExpandable={true}
              >
                <div className="bg-gray-800 p-4 rounded-lg border border-yellow-500">
                  <p className="text-gray-300">
                    THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE"
                    BASIS. SECXION.COM MAKES NO WARRANTIES, EXPRESS OR IMPLIED,
                    INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY,
                    FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                  </p>
                </div>
              </Section>

              <Section
                id="liability"
                title="7. Limitation of Liability"
                icon={Shield}
                isExpandable={true}
              >
                <div className="bg-gray-800 p-4 rounded-lg border border-yellow-500">
                  <p className="text-gray-300">
                    TO THE MAXIMUM EXTENT PERMITTED BY LAW, SECXION.COM SHALL
                    NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
                    CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF
                    THE SERVICE.
                  </p>
                </div>
              </Section>

              <Section
                id="indemnification"
                title="8. Indemnification"
                icon={Users}
                isExpandable={true}
              >
                <div className="bg-gray-800 p-4 rounded-lg">
                  <p className="text-gray-300">
                    You agree to indemnify and hold harmless Secxion.com and its
                    affiliates from any claims arising out of your use of the
                    Service or your violation of these Terms.
                  </p>
                </div>
              </Section>

              <Section
                id="governing"
                title="9. Governing Law"
                icon={FileText}
                isExpandable={true}
              >
                <div className="bg-gray-800 p-4 rounded-lg">
                  <p className="text-gray-300">
                    These Terms shall be governed by the laws of Nigeria,
                    without regard to its conflict of law principles.
                  </p>
                </div>
              </Section>

              <Section
                id="changes"
                title="10. Changes to These Terms"
                icon={FileText}
                isExpandable={true}
              >
                <div className="bg-gray-800 p-4 rounded-lg">
                  <p className="text-gray-300">
                    Secxion.com reserves the right to update these Terms at any
                    time without prior notice. Continued use of the Service
                    constitutes your acceptance of the revised Terms.
                  </p>
                </div>
              </Section>

              <Section title="11. Contact Us" icon={Mail}>
                <div className="bg-gradient-to-r from-gray-800 to-gray-700 p-6 rounded-xl border border-yellow-500">
                  <p className="mb-4 text-gray-300">
                    If you have questions or concerns about these Terms of
                    Service, please reach out to us:
                  </p>
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 text-yellow-400 mr-3" />
                    <a
                      href="mailto:moderator@mysecxion.com"
                      className="text-yellow-400 hover:text-yellow-300 font-medium underline"
                    >
                      moderator@mysecxion.com
                    </a>
                  </div>
                </div>
              </Section>
            </div>
          </motion.div>

          {/* Footer */}
          <motion.footer
            className="text-center text-gray-500 text-sm mt-12"
            variants={itemVariants}
          >
            <div className="flex items-center justify-center mb-4">
              <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent w-64"></div>
            </div>
            <p className="text-gray-400">
              © 2025 Secxion.com. All rights reserved.
            </p>
          </motion.footer>
        </div>
      </main>
    </motion.div>
  );
};

export default Terms;
