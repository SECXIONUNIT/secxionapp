import React, { useState, useContext, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import SummaryApi from '../common';
import Context from '../Context';
import { setUserDetails } from '../store/userSlice';
import loginBackground from './loginbk.png';
import { FaEye, FaEyeSlash, FaSyncAlt } from 'react-icons/fa';
import Navigation from '../Components/Navigation';
import SecxionLogo from '../Assets/optimized/secxion-logo-112.png';
import NFTBadge from '../Components/NFTBadge';
import { toUserSafeMessage } from '../utils/userSafeMessage';
import BackButton from '../Components/BackButton';

const Button = ({
  children,
  className = '',
  variant = 'default',
  style = {},
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-lg';
  const variantClasses = {
    default:
      'bg-brand-gold hover:bg-brand-gold-dark text-brand-dark-base shadow-[0_0_20px_rgba(212,175,55,0.3)]',
    ghost:
      'bg-white/5 hover:bg-brand-gold/10 text-brand-gold border border-brand-gold/50 backdrop-blur-xl',
    secondary:
      'bg-brand-dark-elevated hover:bg-brand-dark-surface text-gray-100 border border-white/10 backdrop-blur-xl',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
      {...props}
    >
      {children}
    </button>
  );
};

const getBubbleStyle = (bubbleIn, index) =>
  bubbleIn ? { animationDelay: `${index * 0.05}s` } : {};

const toRoman = (num) => {
  const map = {
    M: 1000,
    CM: 900,
    D: 500,
    CD: 400,
    C: 100,
    XC: 90,
    L: 50,
    XL: 40,
    X: 10,
    IX: 9,
    V: 5,
    IV: 4,
    I: 1,
  };
  let result = '';
  for (let key in map) {
    const repeat = Math.floor(num / map[key]);
    if (repeat !== 0) {
      result += key.repeat(repeat);
      num %= map[key];
    }
  }
  return result;
};

const Login = () => {
  const [data, setData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [csrfToken, setCsrfToken] = useState('');
  const { fetchUserDetails } = useContext(Context);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [verificationVisible, setVerificationVisible] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [puzzle, setPuzzle] = useState({ q: '', a: 0 });
  const [userAnswer, setUserAnswer] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  const [bubbleIn, setBubbleIn] = useState(false);

  const generatePuzzle = useCallback(() => {
    const num = Math.floor(Math.random() * 45) + 2;
    setPuzzle({ q: toRoman(num), a: num });
    setUserAnswer('');
    setIsVerified(false);
  }, []);

  useEffect(() => {
    fetchCsrfToken();
    setBubbleIn(true);
  }, []);

  const fetchCsrfToken = async () => {
    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/csrf-token`, {
        method: 'GET',
        credentials: 'include',
      });
      const result = await response.json();
      if (result.success && result.csrfToken) {
        setCsrfToken(result.csrfToken);
        return result.csrfToken;
      }
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
    }

    return '';
  };

  useEffect(() => {
    if (verificationVisible) {
      generatePuzzle();
    }
  }, [verificationVisible, generatePuzzle]);

  const handleAnswerChange = (e) => {
    const val = e.target.value;
    setUserAnswer(val);
    if (parseInt(val) === puzzle.a) {
      setIsVerified(true);
    } else {
      setIsVerified(false);
    }
  };

  const handleVerificationComplete = async () => {
    if (!isVerified) {
      toast.error('Please complete the verification challenge.');
      return;
    }
    setVerifying(true);
    setErrorMessage('');

    try {
      const payload = {
        ...data,
        puzzleSolved: true,
      };

      const runLoginAttempt = async (token) => {
        const response = await fetch(SummaryApi.signIn.url, {
          method: SummaryApi.signIn.method,
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': token,
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json();
        return { response, result };
      };

      let tokenToUse = csrfToken;
      if (!tokenToUse) {
        tokenToUse = await fetchCsrfToken();
      }

      let { response, result } = await runLoginAttempt(tokenToUse);

      // Session cookie/token can drift after expiry/restart; refresh CSRF and retry once.
      if (
        response.status === 403 &&
        (result?.code === 'CSRF_VALIDATION_FAILED' ||
          /csrf/i.test(String(result?.message || '')))
      ) {
        const refreshedToken = await fetchCsrfToken();
        if (refreshedToken) {
          ({ response, result } = await runLoginAttempt(refreshedToken));
        }
      }

      if (response.ok && result.success) {
        if (result?.data?.token) {
          localStorage.setItem('token', result.data.token);
        }

        if (result?.data?.user) {
          localStorage.setItem('user', JSON.stringify(result.data.user));
          dispatch(setUserDetails(result.data.user));
        }

        setVerificationVisible(false);
        toast.success(result.message || 'Login Successful!');
        await fetchUserDetails();
        navigate('/home');
      } else {
        // Close slider and show error on the login form
        setVerificationVisible(false);
        setFormSubmitting(false);

        if (response.status === 429) {
          const retryAfter = result?.retryAfter
            ? new Date(result.retryAfter).toLocaleTimeString()
            : null;
          const rateMessage = retryAfter
            ? `Too many login attempts. Try again after ${retryAfter}.`
            : 'Too many login attempts. Please wait and try again.';
          setErrorMessage(rateMessage);
          toast.error(rateMessage);
          return;
        }

        const errorMsg = toUserSafeMessage(
          result.message,
          'Login failed. Please try again.',
        );
        setErrorMessage(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Login verification error:', error);
      const safeMessage = toUserSafeMessage(
        error?.message,
        'An unexpected error occurred during login. Please try again.',
      );
      setErrorMessage(safeMessage);
      toast.error(safeMessage);
    } finally {
      setFormSubmitting(false);
      setVerifying(false);
    }
  };

  const handleResendVerificationEmail = async () => {
    setResending(true);
    try {
      const res = await fetch(SummaryApi.resendVEmail.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      });
      const result = await res.json();
      result.success
        ? toast.success(
            'Verification email sent successfully! Please check your inbox.',
          )
        : toast.error(
            toUserSafeMessage(
              result.message,
              'Failed to resend verification email.',
            ),
          );
    } catch (error) {
      console.error('Resend email error:', error);
      toast.error(
        toUserSafeMessage(
          error?.message,
          'Error resending verification email. Please try again.',
        ),
      );
    } finally {
      setResending(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const onLoginClick = (e) => {
    e.preventDefault();
    if (!data.email || !data.password) {
      toast.error('Please enter both email and password.');
      return;
    }
    setErrorMessage('');
    setVerificationVisible(true);
    setFormSubmitting(true);
  };

  return (
    <section
      className="login-page min-h-screen overflow-y-auto flex items-start sm:items-center justify-center relative bg-cover bg-center bg-no-repeat py-20 sm:py-10"
      style={{ backgroundImage: `url(${loginBackground})` }}
    >
      <Navigation currentPage="signin" />

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
      </div>

      <div className="absolute inset-0 bg-black/70 z-0"></div>

      <div className="relative p-6 sm:p-10 my-4 sm:my-10 pb-20 w-full max-w-md z-10 bg-transparent shadow-none border-none">
        <BackButton fallbackTo="/" className="mb-6" />
        <div className="flex items-center justify-center mb-4">
          <a href="/" className="relative">
            <div className="flex py-1 flex-col justify-center">
              <div
                className={`relative py-2 sm:mx-auto ${bubbleIn ? 'bubble-pop' : ''}`}
                style={getBubbleStyle(bubbleIn, 4)}
              >
                <div>
                  {/* Replace shimmer logo with Secxion logo */}
                  <img
                    src={SecxionLogo}
                    alt="Secxion Official Logo"
                    className="w-14 h-14 object-contain rounded-2xl"
                    style={{ display: 'block' }}
                  />
                </div>
              </div>
            </div>
          </a>
        </div>

        <div className="text-center mb-6">
          <h1
            className={`text-2xl font-bold font-spaceGrotesk neon-gold-text tracking-wider ${bubbleIn ? 'bubble-pop' : ''}`}
            style={getBubbleStyle(bubbleIn, 6)}
          >
            Welcome Back!
          </h1>
          <p className="text-sm text-gray-400 mt-1 font-medium">
            Login to your account
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 text-center text-red-400 text-sm bg-red-900/20 border border-red-500/30 rounded-lg p-3">
            <p>{errorMessage}</p>
            {errorMessage.toLowerCase().includes('verify') && (
              <Button
                onClick={handleResendVerificationEmail}
                disabled={resending}
                variant="ghost"
                className={`mt-2 text-yellow-500 hover:underline font-medium hover:text-yellow-400 ${bubbleIn ? 'bubble-pop' : ''}`}
                style={getBubbleStyle(bubbleIn, 9)}
              >
                {resending ? 'Sending...' : 'Resend Verification Email'}
              </Button>
            )}
          </div>
        )}

        <form className="flex flex-col gap-4" onSubmit={onLoginClick}>
          <div>
            <label
              htmlFor="email"
              className="block text-brand-gold font-bold font-spaceGrotesk text-xs uppercase tracking-widest mb-2"
            >
              Email Address
            </label>
            <div className="relative flex items-center w-full rounded-xl border border-white/10 bg-black/20 focus-within:border-brand-gold/50 transition-colors">
              <input
                id="email"
                name="email"
                type="email"
                value={data.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                className="w-full p-4 rounded-xl bg-transparent text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-0"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-brand-gold font-bold font-spaceGrotesk text-xs uppercase tracking-widest mb-2"
            >
              Security Password
            </label>
            <div className="relative flex items-center w-full rounded-xl border border-white/10 bg-black/20 focus-within:border-brand-gold/50 transition-colors">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={data.password}
                onChange={handleInputChange}
                placeholder="••••••••"
                className="w-full p-4 pr-12 rounded-xl bg-transparent text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-0"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className={`absolute right-4 text-gray-500 hover:text-brand-gold transition-colors ${bubbleIn ? 'bubble-pop' : ''}`}
                tabIndex={-1}
                style={getBubbleStyle(bubbleIn, 7)}
              >
                {showPassword ? (
                  <FaEyeSlash className="h-5 w-5" />
                ) : (
                  <FaEye className="h-5 w-5" />
                )}
              </button>
            </div>
            <Link
              to="/reset"
              className="block text-right text-xs text-gray-500 hover:text-brand-gold transition-colors mt-2 uppercase font-bold tracking-tighter"
            >
              Recover Access?
            </Link>
          </div>

          {!verificationVisible && (
            <div className="flex flex-col gap-3">
              <Button
                type="submit"
                disabled={formSubmitting}
                className={`w-full py-3 rounded-lg font-semibold transition-all duration-300 shadow-md hover:shadow-lg ${
                  formSubmitting
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : ''
                } ${bubbleIn ? 'bubble-pop' : ''}`}
                style={getBubbleStyle(bubbleIn, 8)}
              >
                Login
              </Button>
            </div>
          )}
        </form>

        <p className="mt-6 text-center text-gray-300 text-sm">
          Don’t have an account?{' '}
          <Link
            to="/sign-up"
            className="text-yellow-500 hover:underline font-medium hover:text-yellow-400"
          >
            Sign up
          </Link>
        </p>

        <div className="mt-6 text-center text-xs text-gray-500">
          <Link
            to="/contact-us"
            className="hover:text-yellow-400 transition-colors"
          >
            Contact Us
          </Link>
          <span className="mx-2 text-gray-600">|</span>
          <a
            href="https://secxion.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            © {new Date().getFullYear()} secxion.com
          </a>
        </div>
      </div>

      {/* Move NFTBadge to a fixed footer */}
      <footer className="w-full flex justify-center items-center py-4 absolute bottom-0 left-0 z-20 bg-transparent pointer-events-none">
        <div className="pointer-events-auto">
          <NFTBadge />
        </div>
      </footer>

      {/* Verification Modal */}
      {verificationVisible && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-md">
          <div className="glass-card p-10 rounded-3xl border-brand-gold/30 shadow-[0_0_50px_rgba(212,175,55,0.15)] w-full max-w-sm text-center">
            <h2 className="text-xs font-black mb-8 text-brand-gold uppercase tracking-[0.4em] font-spaceGrotesk">
              Human Verification
            </h2>

            <div className="mb-10 py-8 px-6 bg-black/60 rounded-3xl border border-white/5 shadow-inner">
              <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-6 text-center">
                Identify the numeric value
              </p>
              <div className="flex flex-col items-center justify-center gap-8">
                <p className="text-5xl sm:text-6xl lg:text-7xl font-black text-white font-spaceGrotesk tracking-tighter leading-none text-center">
                  {puzzle.q}
                </p>
                <button
                  onClick={generatePuzzle}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-500 hover:text-brand-gold transition-all"
                  title="Refresh"
                >
                  <FaSyncAlt className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="relative mb-20 group">
              <input
                type="number"
                value={userAnswer}
                onChange={handleAnswerChange}
                placeholder="Result"
                className="w-full px-5 py-5 rounded-2xl bg-black/20 border border-white/10 text-white text-center font-black text-2xl font-spaceGrotesk focus:border-brand-gold/50 outline-none transition-all placeholder-gray-800"
                autoFocus
              />
              {isVerified && (
                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-2 whitespace-nowrap z-20">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_8px_#4ade80]"></div>
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest font-spaceGrotesk">
                    Verification Successful
                  </span>
                </div>
              )}
            </div>

            <Button
              onClick={handleVerificationComplete}
              disabled={!isVerified || verifying}
              className={`w-full py-5 rounded-2xl font-black font-spaceGrotesk text-xs uppercase tracking-[0.2em] transition-all shadow-brand-gold ${
                isVerified
                  ? ''
                  : 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/5'
              } ${bubbleIn ? 'bubble-pop' : ''}`}
              style={getBubbleStyle(bubbleIn, 10)}
            >
              {verifying ? (
                <div className="animate-spin h-5 w-5 border-2 border-brand-dark-base border-t-transparent rounded-full mx-auto" />
              ) : (
                'Login'
              )}
            </Button>

            <button
              onClick={() => {
                setVerificationVisible(false);
                setFormSubmitting(false);
              }}
              className="mt-6 text-[10px] font-black text-gray-600 hover:text-red-400 uppercase tracking-widest transition-colors font-spaceGrotesk"
            >
              [ Cancel ]
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default Login;
