import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  KeyRound,
  Mail,
  MessageSquare,
  Send,
  CheckCircle,
  Shield,
  AlertCircle,
  Clock,
} from 'lucide-react';
import Navigation from './Navigation';
import SummaryApi from '../common';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import SecxionLogo from '../Assets/optimized/secxion-logo-112.png';
import BackButton from './BackButton';

const Reset = () => {
  const [step, setStep] = useState('select');
  const [type, setType] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newValue, setNewValue] = useState('');
  const [confirmNewValue, setConfirmNewValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

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

  const handleRequestCode = async () => {
    if (!email || !type) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(SummaryApi.requestReset.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type }),
      });
      const result = await res.json();

      if (result.success) {
        toast.success(result.message);
        setStep('verify');
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error('Error requesting code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReset = async () => {
    if (!code || !newValue) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (type === 'password' && newValue !== confirmNewValue) {
      toast.error('New passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(SummaryApi.confirmReset.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newValue, type }),
      });
      const result = await res.json();

      if (result.success) {
        toast.success(result.message);

        // Clear user session
        localStorage.clear();
        sessionStorage.clear();

        // Clear cookies
        document.cookie.split(';').forEach((c) => {
          document.cookie = c
            .replace(/^ +/, '')
            .replace(
              /=.*/,
              '=;expires=' + new Date().toUTCString() + ';path=/',
            );
        });

        setStep('done');

        // Redirect after delay
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error('Reset failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToSelect = () => {
    setStep('select');
    setCode('');
    setNewValue('');
    setConfirmNewValue('');
  };

  const getIcon = () => {
    switch (type) {
      case 'password':
        return <KeyRound className="h-8 w-8 text-white" />;
      case 'telegram':
        return <MessageSquare className="h-8 w-8 text-white" />;
      case 'email':
        return <Mail className="h-8 w-8 text-white" />;
      default:
        return <Shield className="h-8 w-8 text-white" />;
    }
  };

  const resetOptions = [
    {
      value: 'password',
      label: 'Password',
      description: 'Reset your account password',
      icon: <KeyRound className="h-6 w-6 text-blue-600" />,
    },
    {
      value: 'telegram',
      label: 'Telegram Number',
      description: 'Update your Telegram contact',
      icon: <MessageSquare className="h-6 w-6 text-green-600" />,
    },
    {
      value: 'email',
      label: 'Email Address',
      description: 'Change your email (requires manual verification)',
      icon: <Mail className="h-6 w-6 text-purple-600" />,
    },
  ];

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-gray-100 font-sans relative overflow-hidden"
      initial={false}
      animate="visible"
      variants={containerVariants}
    >
      <Navigation currentPage="reset" />

      {/* Logo background overlay */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0 w-[500px] h-[500px] flex items-center justify-center">
          <img
            src={SecxionLogo}
            alt="Secxion Logo Background"
            className="w-full h-full object-contain opacity-10 select-none pointer-events-none"
            style={{
              filter: 'blur(2px)',
              mixBlendMode: 'screen',
            }}
          />
        </div>
        {/* ...existing geometric backgrounds... */}
        <div className="absolute top-10 left-10 w-32 h-32 border-4 border-yellow-700/20 rotate-45 animate-spin [animation-duration:20s]"></div>
        <div className="absolute top-1/4 right-20 w-20 h-20 bg-gradient-to-r from-yellow-900/40 to-yellow-800/40 rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/4 w-40 h-40 border-4 border-yellow-700/20 rounded-full animate-bounce [animation-duration:3s]"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-yellow-700/20 rounded-full"></div>
        <div className="absolute bottom-20 right-10 w-24 h-24 bg-gradient-to-br from-yellow-800/30 to-yellow-700/30 transform rotate-12 animate-pulse"></div>
      </div>

      <main className="relative z-10 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <BackButton fallbackTo="/login" className="mb-6" />
          {/* Header */}
          <motion.div className="text-center mb-12" variants={itemVariants}>
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-2xl mb-6 shadow-lg">
              {getIcon()}
            </div>
            <h1 className="text-4xl font-bold text-yellow-200 mb-4">
              Reset Account Details
            </h1>
            <p className="text-lg text-gray-300 max-w-xl mx-auto">
              Securely reset your account information with our step-by-step
              verification process.
            </p>
          </motion.div>

          {/* Main Content */}
          <motion.div
            className="bg-gradient-to-br from-gray-900/90 to-gray-800/80 rounded-3xl shadow-xl p-8 sm:p-12 relative overflow-hidden border border-yellow-700/20 backdrop-blur-xl"
            variants={itemVariants}
          >
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-900/10 to-yellow-800/10 rounded-full transform translate-x-16 -translate-y-16 opacity-50"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-yellow-900/10 to-yellow-800/10 rounded-full transform -translate-x-12 translate-y-12 opacity-50"></div>

            <div className="relative z-10">
              {/* Step 1: Select Reset Type */}
              {step === 'select' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 className="text-2xl font-bold text-yellow-200 mb-6 text-center">
                    What would you like to reset?
                  </h2>

                  <div className="space-y-4 mb-8">
                    {resetOptions.map((option) => (
                      <motion.div
                        key={option.value}
                        className={`cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 ${
                          type === option.value
                            ? 'border-yellow-500 bg-yellow-900/10'
                            : 'border-gray-700 hover:border-yellow-400 hover:bg-yellow-900/5'
                        }`}
                        onClick={() => setType(option.value)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center">
                          <div className="mr-4">{option.icon}</div>
                          <div>
                            <h3 className="font-semibold text-yellow-200">
                              {option.label}
                            </h3>
                            <p className="text-sm text-gray-400">
                              {option.description}
                            </p>
                          </div>
                          <div className="ml-auto">
                            <div
                              className={`w-4 h-4 rounded-full border-2 ${
                                type === option.value
                                  ? 'border-yellow-500 bg-yellow-500'
                                  : 'border-gray-700'
                              }`}
                            >
                              {type === option.value && (
                                <div className="w-2 h-2 bg-gray-900 rounded-full mx-auto mt-0.5"></div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {(type === 'password' || type === 'telegram') && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="mb-6">
                        <label className="block text-sm font-semibold text-yellow-200 mb-3">
                          Email Address
                        </label>
                        <input
                          type="email"
                          placeholder="Enter your account email"
                          className="w-full px-4 py-4 bg-gray-800 border border-yellow-700 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-colors duration-200 text-gray-100 placeholder-gray-400"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>

                      <motion.button
                        className="w-full bg-gradient-to-r from-yellow-600 to-yellow-800 text-gray-900 font-semibold py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        onClick={handleRequestCode}
                        disabled={isLoading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {isLoading ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-200 mr-3"></div>
                            Sending Code...
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <Send className="h-5 w-5 mr-3" />
                            Send Verification Code
                          </div>
                        )}
                      </motion.button>
                    </motion.div>
                  )}

                  {type === 'email' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.3 }}
                      className="p-6 bg-gradient-to-r from-yellow-900/10 to-yellow-800/10 rounded-xl border border-yellow-700"
                    >
                      <div className="flex items-center mb-4">
                        <AlertCircle className="h-6 w-6 text-yellow-600 mr-3" />
                        <h3 className="font-semibold text-yellow-200">
                          Manual Verification Required
                        </h3>
                      </div>
                      <p className="text-yellow-300 mb-4">
                        Email changes require manual verification for security.
                        Please contact our support team:
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <span className="text-yellow-600 font-medium">
                            Email:
                          </span>
                          <span className="ml-2 text-yellow-200 font-mono">
                            moderator@mysecxion.com
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Step 2: Verify Code */}
              {step === 'verify' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-yellow-900/20 rounded-xl mb-4">
                      <Mail className="h-6 w-6 text-yellow-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-yellow-200 mb-2">
                      Verify Your Identity
                    </h2>
                    <p className="text-gray-300">
                      We've sent a verification code to:{' '}
                      <span className="font-semibold text-yellow-100">
                        {email}
                      </span>
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-yellow-200 mb-3">
                        Verification Code
                      </label>
                      <input
                        type="text"
                        placeholder="Enter the 6-digit code"
                        className="w-full px-4 py-4 bg-gray-800 border border-yellow-700 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-colors duration-200 text-yellow-100 placeholder-yellow-400 text-center text-lg tracking-widest"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        maxLength={6}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-yellow-200 mb-3">
                        New{' '}
                        {type === 'password' ? 'Password' : 'Telegram Number'}
                      </label>
                      <input
                        type={type === 'password' ? 'password' : 'text'}
                        placeholder={`Enter your new ${type}`}
                        className="w-full px-4 py-4 bg-gray-800 border border-yellow-700 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-colors duration-200 text-yellow-100 placeholder-yellow-400"
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                      />
                    </div>

                    {type === 'password' && (
                      <div>
                        <label className="block text-sm font-semibold text-yellow-200 mb-3">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          placeholder="Re-enter your new password"
                          className={`w-full px-4 py-4 bg-gray-800 border rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-colors duration-200 text-yellow-100 placeholder-yellow-400 ${
                            confirmNewValue && confirmNewValue !== newValue
                              ? 'border-red-500'
                              : 'border-yellow-700'
                          }`}
                          value={confirmNewValue}
                          onChange={(e) => setConfirmNewValue(e.target.value)}
                        />
                        {confirmNewValue && confirmNewValue !== newValue && (
                          <p className="mt-2 text-sm text-red-400">
                            Passwords do not match.
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex space-x-4">
                      <BackButton
                        onClick={handleBackToSelect}
                        label="Back"
                        className="flex-1 justify-center py-4 text-xs"
                      />

                      <motion.button
                        className="flex-1 bg-gradient-to-r from-yellow-600 to-yellow-800 text-gray-900 font-semibold py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        onClick={handleSubmitReset}
                        disabled={isLoading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {isLoading ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-200 mr-3"></div>
                            Confirming...
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <CheckCircle className="h-5 w-5 mr-2" />
                            Confirm Reset
                          </div>
                        )}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Success */}
              {step === 'done' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="text-center"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-6">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>

                  <h2 className="text-2xl font-bold text-green-400 mb-4">
                    Reset Successful!
                  </h2>

                  <p className="text-green-300 mb-6">
                    Your {type === 'password' ? 'password' : 'Telegram number'}{' '}
                    has been successfully updated.
                  </p>

                  <div className="flex items-center justify-center text-sm text-gray-400 mb-8">
                    <Clock className="h-4 w-4 mr-2" />
                    Redirecting to login in 3 seconds...
                  </div>

                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full animate-pulse"></div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
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

export default Reset;
