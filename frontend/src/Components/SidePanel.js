import React, { useState, Fragment, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
import {
  HomeIcon,
  GlobeAltIcon,
  UserIcon,
  InformationCircleIcon,
  WalletIcon,
  DocumentTextIcon,
  ChatBubbleBottomCenterTextIcon,
  ShoppingBagIcon,
  ShieldCheckIcon,
  ChevronDownIcon,
  CheckIcon,
  CodeBracketIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';
import Clock from 'react-live-clock';
import timezones from '../helpers/timeZones';
import './Header.css';
import SecxionLogo from '../Assets/optimized/secxion-logo-112.png';
import { KYC_ENABLED } from '../config/features';

const SidePanel = ({ open, setOpen, onCloseMenu, onOpenLiveScript }) => {
  const [timezone, setTimezone] = useState('Africa/Lagos');
  const [showTimezones, setShowTimezones] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const resetScrollPosition = useCallback(() => {
    const targets = [
      window,
      document.getElementById('root'),
      document.scrollingElement,
      document.documentElement,
      document.body,
      document.querySelector('.main-content'),
    ].filter(Boolean);

    targets.forEach((target) => {
      if (typeof target.scrollTo === 'function') {
        target.scrollTo(0, 0);
      } else {
        target.scrollTop = 0;
        target.scrollLeft = 0;
      }
    });
  }, []);

  useEffect(() => {
    let animationFrameId = 0;
    let delayedRunId = 0;

    resetScrollPosition();
    animationFrameId = window.requestAnimationFrame(resetScrollPosition);
    delayedRunId = window.setTimeout(resetScrollPosition, 60);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.clearTimeout(delayedRunId);
    };
  }, [location.pathname, location.search, resetScrollPosition]);

  const toggleTimezones = () => setShowTimezones(!showTimezones);
  const handleTimezoneChange = (newTimezone) => {
    setTimezone(newTimezone);
    setShowTimezones(false);
  };
  const getSelectedTimezoneLabel = () => {
    const selected = timezones.find((tz) => tz.value === timezone);
    return selected ? selected.label : '';
  };
  const handleLinkClick = useCallback(() => {
    onCloseMenu?.();
    setOpen(false);
  }, [onCloseMenu, setOpen]);

  const handleNavigate = useCallback(
    (path) => {
      handleLinkClick();

      const completeNavigation = () => {
        navigate(path);
        resetScrollPosition();
        window.requestAnimationFrame(resetScrollPosition);
        window.setTimeout(resetScrollPosition, 60);
        window.setTimeout(resetScrollPosition, 220);
      };

      if (location.pathname === path) {
        completeNavigation();
        return;
      }

      window.setTimeout(completeNavigation, 210);
    },
    [handleLinkClick, location.pathname, navigate, resetScrollPosition],
  );

  const hideTradeStatus = location.pathname === '/record';
  const hideDataPad = location.pathname === '/datapad';
  const hideWallet = location.pathname === '/mywallet';
  const hideHome = location.pathname === '/home';
  const hideProfile = location.pathname === '/profile';
  const hideConnect = location.pathname === '/report';
  const hideMarketplace = location.pathname === '/section';
  const hideKyc = !KYC_ENABLED || location.pathname === '/kyc';

  const navigationItems = [
    {
      path: '/home',
      icon: HomeIcon,
      label: 'Home',
      gradient: 'from-blue-500 to-cyan-400',
      hide: hideHome,
    },
    {
      path: '/profile',
      icon: UserIcon,
      label: 'Profile',
      gradient: 'from-green-500 to-emerald-400',
      hide: hideProfile,
    },
    {
      path: '/record',
      icon: InformationCircleIcon,
      label: 'Trade Status',
      gradient: 'from-orange-500 to-yellow-400',
      hide: hideTradeStatus,
    },
    {
      path: '/mywallet',
      icon: WalletIcon,
      label: 'Wallet',
      gradient: 'from-indigo-500 to-purple-400',
      hide: hideWallet,
    },
    {
      path: '/datapad',
      icon: DocumentTextIcon,
      label: 'DataPad',
      gradient: 'from-teal-500 to-cyan-400',
      hide: hideDataPad,
    },
    {
      path: '/report',
      icon: ChatBubbleBottomCenterTextIcon,
      label: 'Connect with us',
      gradient: 'from-rose-500 to-pink-400',
      hide: hideConnect,
    },
    {
      path: '/section',
      icon: ShoppingBagIcon,
      label: 'Marketplace',
      gradient: 'from-purple-500 to-pink-400',
      hide: hideMarketplace,
    },
    {
      path: '/kyc',
      icon: ShieldCheckIcon,
      label: 'KYC Verification',
      gradient: 'from-amber-500 to-yellow-400',
      hide: hideKyc,
    },
  ];

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog
        as="div"
        className="fixed inset-0 z-50 md:hidden"
        onClose={() => setOpen(false)}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm" />
        </Transition.Child>

        <Transition.Child
          as={Fragment}
          enter="transform ease-in-out duration-200"
          enterFrom="-translate-x-full"
          enterTo="translate-x-0"
          leave="transform ease-in-out duration-200"
          leaveFrom="translate-x-0"
          leaveTo="-translate-x-full"
        >
          <Dialog.Panel className="relative flex flex-col w-full max-w-sm h-full overflow-hidden bg-brand-dark-base text-gray-200 shadow-2xl border-r border-white/5">
            <div className="relative z-10 flex flex-col w-full h-full premium-bg">
              {/* Header */}
              <div className="mt-9 flex items-center justify-between border-b border-white/5 px-6 py-0.5">
                {/* Logo */}
                <Link
                  to="/home"
                  className="relative group"
                  onClick={(event) => {
                    event.preventDefault();
                    handleNavigate('/home');
                  }}
                >
                  <div className="flex py-1 flex-col justify-center">
                    <div className="relative">
                      <img
                        src={SecxionLogo}
                        alt="Secxion Official Logo"
                        className="w-12 h-12 object-contain rounded-2xl group-hover:shadow-brand-gold transition-all duration-300"
                        width="48"
                        height="48"
                        loading="eager"
                      />
                    </div>
                  </div>
                </Link>
                {/* Close Button */}
                <motion.button
                  onClick={() => setOpen(false)}
                  className="inline-flex h-10 w-10 min-w-10 max-w-10 shrink-0 basis-10 items-center justify-center rounded-xl border border-white/15 bg-red-500/90 p-0 text-white shadow-[0_0_20px_rgba(239,68,68,0.25)] transition-colors duration-200 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400/60"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label="Close side panel"
                >
                  <FaTimes className="h-5 w-5 shrink-0" />
                </motion.button>
              </div>

              {/* Navigation */}
              <div className="relative flex-1 min-h-0 overflow-hidden">
                <nav className="h-full px-6 py-8 space-y-4 overflow-y-auto sidepanel-scroll-area">
                  {navigationItems.map(
                    ({ path, icon: Icon, label, gradient, hide }) =>
                      !hide && (
                        <Link
                          to={path}
                          key={label}
                          onClick={(event) => {
                            event.preventDefault();
                            handleNavigate(path);
                          }}
                          className="group flex items-center px-4 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-brand-gold/20 transition-all duration-300 transform active:scale-95"
                        >
                          <div
                            className={`flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-r ${gradient} mr-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}
                          >
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <span className="text-gray-200 font-bold font-spaceGrotesk text-sm tracking-wide transition-colors group-hover:text-white ">
                            {label}
                          </span>
                        </Link>
                      ),
                  )}

                  {/* LiveScript Button */}
                  <button
                    onClick={() => {
                      onOpenLiveScript?.();
                      setTimeout(() => handleLinkClick(), 100);
                    }}
                    className="group flex items-center w-full px-4 py-3.5 rounded-2xl bg-gradient-to-r from-purple-900/40 to-purple-800/40 hover:from-purple-800/60 hover:to-purple-700/60 border border-purple-500/30 hover:border-purple-400/50 transition-all duration-300 transform active:scale-95"
                  >
                    <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 mr-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                      <CodeBracketIcon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-gray-200 font-bold font-spaceGrotesk text-sm tracking-wide transition-colors group-hover:text-white ">
                      LiveScript
                    </span>
                    <span className="ml-auto text-[10px] font-bold bg-purple-500/20 text-purple-300 px-2.5 py-1 rounded-lg uppercase tracking-tighter border border-purple-500/20">
                      System Dev
                    </span>
                  </button>
                </nav>
              </div>

              {/* Timezone Selector */}
              <div className="px-6 py-6 border-t border-white/5">
                <button
                  type="button"
                  onClick={toggleTimezones}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-white transition-all duration-300 group"
                >
                  <div className="flex items-center">
                    <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-brand-gold/20 mr-3">
                      <GlobeAltIcon className="h-4 w-4 text-brand-gold" />
                    </div>
                    <span className="text-xs font-bold font-spaceGrotesk tracking-wider uppercase text-gray-300 group-hover:text-white">
                      {getSelectedTimezoneLabel() || 'Region Selector'}
                    </span>
                  </div>
                  <ChevronDownIcon
                    className={`h-5 w-5 text-gray-500 transform transition-transform duration-300 ${showTimezones ? 'rotate-180' : ''} group-hover:text-brand-gold `}
                  />
                </button>
                {showTimezones && (
                  <div className="mt-3 bg-brand-dark-elevated border border-white/10 rounded-2xl shadow-2xl max-h-48 overflow-y-auto backdrop-blur-xl">
                    <ul className="py-2">
                      {timezones.map((tz) => (
                        <li key={tz.value}>
                          <button
                            onClick={() => handleTimezoneChange(tz.value)}
                            className={`w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors duration-200 text-xs font-bold font-spaceGrotesk tracking-wide ${
                              timezone === tz.value
                                ? 'text-brand-gold bg-brand-gold/5'
                                : 'text-gray-400 hover:text-white'
                            } `}
                          >
                            <div className="flex items-center justify-between">
                              <span>{tz.label}</span>
                              {timezone === tz.value && (
                                <CheckIcon className="h-4 w-4 text-brand-gold shadow-brand-gold" />
                              )}
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              {/* Clock Display */}
              <div className="px-6 py-8 text-center border-t border-white/5">
                <div className="glass-card rounded-2xl p-5 border-white/5">
                  <Clock
                    format={'HH:mm:ss'}
                    ticking={true}
                    timezone={timezone}
                    className="text-2xl font-bold text-white mb-1 tabular-nums font-spaceGrotesk tracking-tighter"
                  />
                </div>
              </div>
            </div>
          </Dialog.Panel>
        </Transition.Child>
      </Dialog>
    </Transition.Root>
  );
};

export default SidePanel;
