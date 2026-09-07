import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Eye, Lock, FileText, Mail, Calendar } from 'lucide-react';
import Navigation from './Navigation';
import SecxionLogo from '../Assets/optimized/secxion-logo-112.png';
import BackButton from './BackButton';

const Privacy = () => {
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

  const Section = ({ title, children, icon: Icon }) => (
    <motion.div variants={itemVariants} className="mb-10">
      <div className="flex items-center mb-4">
        {Icon && <Icon className="h-6 w-6 text-yellow-400 mr-3" />}
        <h2 className="text-2xl font-bold text-gray-100">{title}</h2>
      </div>
      <div className="text-gray-300 leading-relaxed space-y-4">{children}</div>
    </motion.div>
  );

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-gray-100 font-sans relative overflow-hidden"
      initial={false}
      animate="visible"
      variants={containerVariants}
    >
      <Navigation currentPage="privacy" />

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
        {/* Animated geometric background */}
        <div className="absolute top-20 left-10 w-32 h-32 border-2 border-gray-700/30 rotate-45 animate-spin [animation-duration:20s]"></div>
        <div className="absolute top-1/3 right-20 w-20 h-20 bg-gradient-to-r from-yellow-900/40 to-yellow-800/40 rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/4 w-40 h-40 border-2 border-gray-700/30 rounded-full animate-bounce [animation-duration:3s]"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-yellow-700/20 rounded-full"></div>
        <div className="absolute bottom-20 right-10 w-24 h-24 bg-gradient-to-br from-yellow-800/30 to-yellow-700/30 transform rotate-12 animate-pulse"></div>
      </div>

      <main className="relative z-10 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <BackButton fallbackTo="/" className="mb-6" />
          {/* Header */}
          <motion.div className="text-center mb-16" variants={itemVariants}>
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-black to-yellow-700 rounded-2xl mb-6 shadow-lg">
              <Shield className="h-8 w-8 text-yellow-400" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-100 mb-4">
              Privacy Policy
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Your privacy is important to us. This policy explains how we
              collect, use, and protect your personal information.
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
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-800 to-gray-700 rounded-full transform translate-x-16 -translate-y-16 opacity-50"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-gray-700 to-gray-600 rounded-full transform -translate-x-12 translate-y-12 opacity-50"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-yellow-700/20 rounded-full"></div>

            <div className="relative z-10">
              <motion.p
                className="text-lg text-gray-300 leading-relaxed mb-8 p-4 bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl border-l-4 border-yellow-500"
                variants={itemVariants}
              >
                This Privacy Policy describes how Secxion.com (the "Service,"
                "we," "us," or "our") collects, uses, and shares your personal
                information when you use our website secxion.com.
              </motion.p>

              <Section title="Information We Collect" icon={Eye}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-100 mb-2">
                      Information You Provide Directly
                    </h4>
                    <p className="text-sm text-gray-300">
                      Information like name, email, phone number, and payment
                      details.
                    </p>
                  </div>
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-100 mb-2">
                      Transaction Data
                    </h4>
                    <p className="text-sm text-gray-300">
                      Details about the gift cards you sell, such as brand,
                      value, and transaction history.
                    </p>
                  </div>
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-100 mb-2">
                      Usage Data
                    </h4>
                    <p className="text-sm text-gray-300">
                      Includes your IP address, browser type, pages visited, and
                      timestamps.
                    </p>
                  </div>
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-100 mb-2">
                      Cookies & Similar Tech
                    </h4>
                    <p className="text-sm text-gray-300">
                      For tracking and improving experience. You can manage this
                      via your browser.
                    </p>
                  </div>
                </div>
              </Section>

              <Section title="How We Use Your Information" icon={FileText}>
                <div className="space-y-3">
                  {[
                    'To provide and maintain the Service',
                    'To process transactions and payments',
                    'To communicate and respond to inquiries',
                    'To personalize your experience',
                    'To analyze performance and improve usability',
                    'To detect fraud and comply with laws',
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

              <Section title="How We Share Your Information" icon={Lock}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-gray-700 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-100 mb-2">
                      Payment Processors
                    </h4>
                    <p className="text-sm text-gray-300">
                      To complete your transactions securely.
                    </p>
                  </div>
                  <div className="border border-gray-700 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-100 mb-2">
                      Service Providers
                    </h4>
                    <p className="text-sm text-gray-300">
                      Third parties who assist with hosting, analytics, customer
                      service, etc.
                    </p>
                  </div>
                  <div className="border border-gray-700 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-100 mb-2">
                      Legal Authorities
                    </h4>
                    <p className="text-sm text-gray-300">
                      When required by law or necessary for protection.
                    </p>
                  </div>
                  <div className="border border-gray-700 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-100 mb-2">
                      Business Transfers
                    </h4>
                    <p className="text-sm text-gray-300">
                      In the event of acquisition or merger, data may be
                      transferred.
                    </p>
                  </div>
                </div>
              </Section>

              <Section title="Security of Your Information" icon={Shield}>
                <div className="bg-gradient-to-r from-gray-800 to-gray-700 p-6 rounded-xl border border-yellow-500">
                  <p className="text-gray-300">
                    We implement industry-standard safeguards to protect your
                    data, including encryption, secure servers, and regular
                    security audits. However, no method of internet transmission
                    is 100% secure, and we cannot guarantee absolute security.
                  </p>
                </div>
              </Section>

              <Section title="Your Rights">
                <p className="text-gray-300">
                  You may have rights to access, correct, or delete your data
                  under applicable privacy laws. Please contact us at{' '}
                  <a
                    href="mailto:moderator@mysecxion.com"
                    className="text-yellow-400 hover:text-yellow-300 font-medium underline"
                  >
                    moderator@mysecxion.com
                  </a>{' '}
                  to exercise these rights.
                </p>
              </Section>

              <Section title="Data Retention">
                <p className="text-gray-300">
                  Your data is retained as long as necessary for business
                  purposes, legal compliance, and to provide our services. We
                  regularly review and delete data that is no longer required.
                </p>
              </Section>

              <Section title="Children's Privacy">
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                  <p className="text-gray-300">
                    Our service is not intended for children under 16. If you
                    believe a child has provided personal information, contact
                    us immediately and we will take steps to remove such
                    information.
                  </p>
                </div>
              </Section>

              <Section title="Changes to This Privacy Policy">
                <p className="text-gray-300">
                  We may update this policy periodically to reflect changes in
                  our practices or legal requirements. We will notify you of
                  significant changes by posting the updated policy on our
                  website. Continued use of our Service implies agreement to the
                  updated terms.
                </p>
              </Section>

              <Section title="Contact Us" icon={Mail}>
                <div className="bg-gradient-to-r from-gray-800 to-gray-700 p-6 rounded-xl border border-yellow-500">
                  <p className="mb-4 text-gray-300">
                    If you have questions or concerns about this Privacy Policy,
                    please reach out to us:
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
              © 2025 secxion.com. All rights reserved.
            </p>
          </motion.footer>
        </div>
      </main>
      <style>{`
        @keyframes animate-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-scroll {
          animation: animate-scroll 30s linear infinite;
        }
        @keyframes blink {
          50% {
            opacity: 0;
          }
        }
        .animate-blink {
          animation: blink 1s step-end infinite;
        }
      `}</style>
    </motion.div>
  );
};

export default Privacy;
