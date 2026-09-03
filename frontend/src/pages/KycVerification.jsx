import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaCamera,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaUpload,
} from 'react-icons/fa';
import SummaryApi from '../common';
import uploadImage from '../helpers/uploadImage';
import { toUserSafeMessage } from '../utils/userSafeMessage';
import SecxionLogo from '../Assets/optimized/secxion-logo-112.png';
import { KYC_ENABLED } from '../config/features';

const emptyForm = {
  fullName: '',
  dateOfBirth: '',
  country: '',
  phoneNumber: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  stateProvince: '',
  postalCode: '',
  consentAccepted: false,
  idType: 'national_id',
  idNumber: '',
  frontUrl: '',
  backUrl: '',
  selfieUrl: '',
};

const COUNTRY_OPTIONS = [
  'Afghanistan',
  'Algeria',
  'Argentina',
  'Australia',
  'Austria',
  'Bangladesh',
  'Belgium',
  'Brazil',
  'Cameroon',
  'Canada',
  'China',
  'Colombia',
  "Cote d'Ivoire",
  'Denmark',
  'Egypt',
  'Ethiopia',
  'Finland',
  'France',
  'Germany',
  'Ghana',
  'Greece',
  'India',
  'Indonesia',
  'Ireland',
  'Israel',
  'Italy',
  'Japan',
  'Kenya',
  'Malaysia',
  'Mexico',
  'Morocco',
  'Netherlands',
  'New Zealand',
  'Nigeria',
  'Norway',
  'Pakistan',
  'Philippines',
  'Poland',
  'Portugal',
  'Qatar',
  'Romania',
  'Rwanda',
  'Saudi Arabia',
  'Senegal',
  'Singapore',
  'South Africa',
  'South Korea',
  'Spain',
  'Sweden',
  'Switzerland',
  'Tanzania',
  'Thailand',
  'Tunisia',
  'Turkey',
  'Uganda',
  'Ukraine',
  'United Arab Emirates',
  'United Kingdom',
  'United States',
  'Vietnam',
  'Zambia',
  'Zimbabwe',
];

const COUNTRY_DIAL_CODES = {
  Afghanistan: '+93',
  Algeria: '+213',
  Argentina: '+54',
  Australia: '+61',
  Austria: '+43',
  Bangladesh: '+880',
  Belgium: '+32',
  Brazil: '+55',
  Cameroon: '+237',
  Canada: '+1',
  China: '+86',
  Colombia: '+57',
  "Cote d'Ivoire": '+225',
  Denmark: '+45',
  Egypt: '+20',
  Ethiopia: '+251',
  Finland: '+358',
  France: '+33',
  Germany: '+49',
  Ghana: '+233',
  Greece: '+30',
  India: '+91',
  Indonesia: '+62',
  Ireland: '+353',
  Israel: '+972',
  Italy: '+39',
  Japan: '+81',
  Kenya: '+254',
  Malaysia: '+60',
  Mexico: '+52',
  Morocco: '+212',
  Netherlands: '+31',
  'New Zealand': '+64',
  Nigeria: '+234',
  Norway: '+47',
  Pakistan: '+92',
  Philippines: '+63',
  Poland: '+48',
  Portugal: '+351',
  Qatar: '+974',
  Romania: '+40',
  Rwanda: '+250',
  'Saudi Arabia': '+966',
  Senegal: '+221',
  Singapore: '+65',
  'South Africa': '+27',
  'South Korea': '+82',
  Spain: '+34',
  Sweden: '+46',
  Switzerland: '+41',
  Tanzania: '+255',
  Thailand: '+66',
  Tunisia: '+216',
  Turkey: '+90',
  Uganda: '+256',
  Ukraine: '+380',
  'United Arab Emirates': '+971',
  'United Kingdom': '+44',
  'United States': '+1',
  Vietnam: '+84',
  Zambia: '+260',
  Zimbabwe: '+263',
};

const normalizeAddressPart = (value = '') => String(value).trim();

const parseAddressString = (address = '') => {
  const parsed = {
    addressLine1: '',
    addressLine2: '',
    city: '',
    stateProvince: '',
    postalCode: '',
  };

  if (!address) return parsed;

  const parts = String(address)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  const streetParts = [];

  parts.forEach((part) => {
    const lower = part.toLowerCase();

    if (lower.startsWith('city:')) {
      parsed.city = part.slice(5).trim();
      return;
    }

    if (lower.startsWith('state/province:')) {
      parsed.stateProvince = part.slice(15).trim();
      return;
    }

    if (lower.startsWith('postal code:')) {
      parsed.postalCode = part.slice(12).trim();
      return;
    }

    streetParts.push(part);
  });

  parsed.addressLine1 = streetParts[0] || '';
  parsed.addressLine2 = streetParts.slice(1).join(', ');

  return parsed;
};

const buildAddressString = ({
  addressLine1,
  addressLine2,
  city,
  stateProvince,
  postalCode,
}) => {
  const line1 = normalizeAddressPart(addressLine1);
  const line2 = normalizeAddressPart(addressLine2);
  const cityValue = normalizeAddressPart(city);
  const stateValue = normalizeAddressPart(stateProvince);
  const postalValue = normalizeAddressPart(postalCode);

  return [
    line1,
    line2,
    cityValue ? `City: ${cityValue}` : '',
    stateValue ? `State/Province: ${stateValue}` : '',
    postalValue ? `Postal Code: ${postalValue}` : '',
  ]
    .filter(Boolean)
    .join(', ');
};

const withCountryDialCode = (currentPhone, previousCountry, nextCountry) => {
  const current = String(currentPhone || '').trim();
  const previousCode = COUNTRY_DIAL_CODES[previousCountry] || '';
  const nextCode = COUNTRY_DIAL_CODES[nextCountry] || '';

  if (!nextCode) return current;
  if (!current) return `${nextCode}`;
  if (previousCode && current.startsWith(previousCode)) {
    return `${nextCode}${current.slice(previousCode.length)}`;
  }

  if (!current.startsWith('+')) {
    return `${nextCode}${current}`;
  }

  return current;
};

const buildPhoneWithDialCode = (country, localNumber) => {
  const dialCode = COUNTRY_DIAL_CODES[country] || '';
  const sanitizedLocal = String(localNumber || '').replace(/\D/g, '');
  const normalizedLocal = sanitizedLocal.replace(/^0+/, '');

  if (!dialCode) return String(localNumber || '').trim();
  if (!normalizedLocal) return dialCode;

  return `${dialCode}${normalizedLocal}`;
};

const extractLocalNumber = (country, fullPhoneNumber) => {
  const dialCode = COUNTRY_DIAL_CODES[country] || '';
  const normalized = String(fullPhoneNumber || '').trim();

  if (!normalized) return '';
  if (dialCode && normalized.startsWith(dialCode)) {
    return normalized.slice(dialCode.length).replace(/\D/g, '');
  }

  return normalized.replace(/\D/g, '');
};

const statusConfig = {
  unverified: {
    label: 'Not Verified',
    className: 'bg-white/5 text-gray-400 border-white/10',
    icon: FaClock,
  },
  pending: {
    label: 'Pending Review',
    className:
      'bg-brand-gold/10 text-brand-gold border-brand-gold/20 shadow-brand-gold',
    icon: FaClock,
  },
  approved: {
    label: 'Verified',
    className:
      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]',
    icon: FaCheckCircle,
  },
  rejected: {
    label: 'Rejected',
    className:
      'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]',
    icon: FaTimesCircle,
  },
};

const KycVerification = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneVerificationSent, setPhoneVerificationSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneVerificationLoading, setPhoneVerificationLoading] =
    useState(false);
  const [uploading, setUploading] = useState({
    front: false,
    back: false,
    selfie: false,
  });
  const [kycData, setKycData] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selfieCapturedAt, setSelfieCapturedAt] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const status = useMemo(() => {
    if (!kycData) return 'unverified';
    return kycData.status || 'unverified';
  }, [kycData]);

  const canSubmit = status !== 'pending' && status !== 'approved';

  const loadKyc = async () => {
    setLoading(true);
    try {
      const response = await fetch(SummaryApi.getMyKyc.url, {
        method: SummaryApi.getMyKyc.method,
        credentials: 'include',
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch KYC data.');
      }

      setKycData(result.data);

      if (result.data) {
        const parsedAddress = parseAddressString(result.data.address || '');
        const countryValue = result.data.country || '';

        setForm({
          fullName: result.data.fullName || '',
          dateOfBirth: result.data.dateOfBirth
            ? new Date(result.data.dateOfBirth).toISOString().split('T')[0]
            : '',
          country: countryValue,
          phoneNumber: extractLocalNumber(
            countryValue,
            result.data.phoneNumber || '',
          ),
          addressLine1: parsedAddress.addressLine1,
          addressLine2: parsedAddress.addressLine2,
          city: parsedAddress.city,
          stateProvince: parsedAddress.stateProvince,
          postalCode: parsedAddress.postalCode,
          consentAccepted: Boolean(result.data.consent?.accepted),
          idType: result.data.idType || 'national_id',
          idNumber: result.data.idNumber || '',
          frontUrl: result.data.documents?.frontUrl || '',
          backUrl: result.data.documents?.backUrl || '',
          selfieUrl: result.data.documents?.selfieUrl || '',
        });
        setPhoneVerified(Boolean(result.data.phoneVerification?.isVerified));

        setSelfieCapturedAt(
          result.data.documents?.selfieCapturedAt
            ? new Date(result.data.documents.selfieCapturedAt).toISOString()
            : '',
        );
      }
    } catch (error) {
      toast.error(
        toUserSafeMessage(
          error,
          'We could not load your verification status. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKyc();
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    if (name === 'country') {
      setForm((prev) => ({
        ...prev,
        country: value,
        phoneNumber: extractLocalNumber(
          value,
          withCountryDialCode(prev.phoneNumber, prev.country, value),
        ),
      }));
      setPhoneVerified(false);
      setPhoneVerificationSent(false);
      setPhoneCode('');
      return;
    }

    if (name === 'phoneNumber') {
      setForm((prev) => ({
        ...prev,
        phoneNumber: String(value || '').replace(/\D/g, ''),
      }));
      setPhoneVerified(false);
      setPhoneVerificationSent(false);
      setPhoneCode('');
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const getFullPhoneNumber = () =>
    buildPhoneWithDialCode(form.country, form.phoneNumber);

  const sendPhoneVerificationCode = async () => {
    const phoneNumber = getFullPhoneNumber();
    if (!phoneNumber || phoneNumber.length < 7) {
      toast.error('Enter a valid phone number before requesting a code.');
      return;
    }

    setPhoneVerificationLoading(true);
    try {
      const response = await fetch(
        SummaryApi.sendKycPhoneVerificationCode.url,
        {
          method: SummaryApi.sendKycPhoneVerificationCode.method,
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber }),
        },
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Could not send verification code.');
      }
      setPhoneVerificationSent(true);
      toast.success(result.message);
    } catch (error) {
      toast.error(
        toUserSafeMessage(error, 'Could not send verification code.'),
      );
    } finally {
      setPhoneVerificationLoading(false);
    }
  };

  const verifyPhoneCode = async () => {
    const phoneNumber = getFullPhoneNumber();
    if (!/^\d{4,10}$/.test(phoneCode)) {
      toast.error('Enter the verification code sent to your phone.');
      return;
    }

    setPhoneVerificationLoading(true);
    try {
      const response = await fetch(SummaryApi.verifyKycPhoneCode.url, {
        method: SummaryApi.verifyKycPhoneCode.method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, code: phoneCode }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Could not verify phone number.');
      }
      setPhoneVerified(true);
      setPhoneVerificationSent(false);
      toast.success(result.message);
    } catch (error) {
      toast.error(toUserSafeMessage(error, 'Could not verify phone number.'));
    } finally {
      setPhoneVerificationLoading(false);
    }
  };

  const handleUpload = async (event, field) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading((prev) => ({ ...prev, [field]: true }));

    try {
      const uploaded = await uploadImage(file);
      if (!uploaded?.url) {
        throw new Error(uploaded?.error || 'Image upload failed.');
      }

      setForm((prev) => ({ ...prev, [`${field}Url`]: uploaded.url }));
      toast.success('Image uploaded successfully.');
    } catch (error) {
      toast.error(
        toUserSafeMessage(
          error,
          'We could not upload the image. Please try again.',
        ),
      );
    } finally {
      setUploading((prev) => ({ ...prev, [field]: false }));
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const openCamera = async () => {
    setCameraError('');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported on this browser/device.');
      return;
    }

    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setIsCameraOpen(true);

      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {
            setCameraError('Unable to start camera preview.');
          });
        }
      });
    } catch (error) {
      setCameraError(
        'Unable to access camera. Please allow camera permission and try again.',
      );
    }
  };

  const closeCamera = () => {
    setIsCameraOpen(false);
    stopCamera();
  };

  const captureSelfie = async () => {
    if (!videoRef.current) {
      toast.error('Camera preview is not ready.');
      return;
    }

    const video = videoRef.current;
    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!width || !height) {
      toast.error('Could not capture image. Please try again.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, width, height);

    setUploading((prev) => ({ ...prev, selfie: true }));

    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setUploading((prev) => ({ ...prev, selfie: false }));
          toast.error('Capture failed. Please try again.');
          return;
        }

        try {
          const selfieFile = new File([blob], 'kyc-selfie.jpg', {
            type: 'image/jpeg',
          });
          const uploaded = await uploadImage(selfieFile);
          if (!uploaded?.url) {
            throw new Error(uploaded?.error || 'Selfie upload failed.');
          }

          setForm((prev) => ({ ...prev, selfieUrl: uploaded.url }));
          setSelfieCapturedAt(new Date().toISOString());
          toast.success('Selfie captured and uploaded successfully.');
          closeCamera();
        } catch (error) {
          toast.error(
            toUserSafeMessage(
              error,
              'We could not upload your selfie. Please try again.',
            ),
          );
        } finally {
          setUploading((prev) => ({ ...prev, selfie: false }));
        }
      },
      'image/jpeg',
      0.9,
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSubmitting(true);
    try {
      const response = await fetch(SummaryApi.submitKyc.url, {
        method: SummaryApi.submitKyc.method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: form.fullName,
          dateOfBirth: form.dateOfBirth,
          country: form.country,
          phoneNumber: buildPhoneWithDialCode(form.country, form.phoneNumber),
          address: buildAddressString(form),
          consent: {
            accepted: Boolean(form.consentAccepted),
            acceptedAt: form.consentAccepted ? new Date().toISOString() : null,
          },
          idType: form.idType,
          idNumber: form.idNumber,
          documents: {
            frontUrl: form.frontUrl,
            backUrl: form.backUrl,
            selfieUrl: form.selfieUrl,
            selfieCaptureMethod: 'live_camera',
            selfieCapturedAt: selfieCapturedAt || new Date().toISOString(),
          },
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMsg = result.message || 'Failed to submit KYC verification.';
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      toast.success(
        result.message || 'Identity verification submitted successfully.',
      );
      await loadKyc();
    } catch (error) {
      if (error.message !== 'Failed to submit KYC verification.') {
        toast.error(
          toUserSafeMessage(
            error,
            'We could not submit your verification details. Please try again.',
          ),
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const statusUI = statusConfig[status] || statusConfig.unverified;
  const StatusIcon = statusUI.icon;

  if (!KYC_ENABLED) {
    return (
      <div className="mt-24 p-4 sm:p-8 max-w-3xl mx-auto">
        <div className="premium-bg border border-white/10 rounded-3xl p-8 text-center shadow-2xl">
          <h1 className="text-2xl sm:text-3xl font-black text-white font-spaceGrotesk uppercase tracking-tighter">
            Verification Temporarily Unavailable
          </h1>
          <p className="mt-4 text-sm text-gray-400">
            Identity verification is temporarily paused while we finish securing
            the phone verification provider.
          </p>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="mt-8 inline-flex items-center justify-center rounded-2xl border border-white/10 bg-red-500/10 px-6 py-2.5 font-black font-spaceGrotesk text-[10px] uppercase tracking-widest text-red-300 transition-all hover:bg-red-500/20 hover:text-white"
          >
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-24 p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="premium-bg border border-white/10 rounded-3xl p-8 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white font-spaceGrotesk uppercase tracking-tighter">
              Identity Verification
            </h1>
            <p className="text-gray-500 text-xs font-bold mt-2 uppercase tracking-[0.2em]">
              Complete verification to access all features
            </p>
          </div>
          <button
            onClick={() => navigate('/profile')}
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-red-500/10 px-6 py-2.5 font-black font-spaceGrotesk text-[10px] uppercase tracking-widest text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.12)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-red-500/20 hover:text-white"
          >
            Back to Profile
          </button>
        </div>

        <div
          className={`mb-10 inline-flex items-center gap-3 px-6 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-[0.2em] font-spaceGrotesk ${statusUI.className}`}
        >
          <StatusIcon className="w-3.5 h-3.5" />
          <span>STATUS: {statusUI.label}</span>
        </div>

        {kycData?.status === 'rejected' && (
          <div className="mb-10 p-6 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-300">
            <p className="text-[10px] font-black uppercase tracking-widest mb-3">
              Rejection Reason
            </p>
            <p className="text-sm font-bold font-spaceGrotesk">
              {kycData.rejectionReason || 'No reason provided.'}
            </p>
            {kycData.adminNotes && (
              <p className="mt-3 text-xs text-red-400/60 font-medium">
                Note: {kycData.adminNotes}
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <label className="block md:col-span-2 group">
              <span className="mb-3 block text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 font-spaceGrotesk group-focus-within:text-brand-gold transition-colors">
                Full Legal Name
              </span>
              <input
                id="kyc-full-name"
                type="text"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Full Name"
                required
                disabled={!canSubmit || loading}
                className="w-full px-5 py-4 rounded-2xl bg-black/20 border border-white/10 text-white placeholder-gray-700 focus:border-brand-gold/50 outline-none transition-all font-medium"
              />
            </label>

            <label className="block group">
              <span className="mb-3 block text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 font-spaceGrotesk group-focus-within:text-brand-gold transition-colors">
                Date of Birth
              </span>
              <input
                id="kyc-date-of-birth"
                type="date"
                name="dateOfBirth"
                value={form.dateOfBirth}
                onChange={handleChange}
                required
                disabled={!canSubmit || loading}
                className="w-full px-5 py-4 rounded-2xl bg-black/20 border border-white/10 text-white focus:border-brand-gold/50 outline-none transition-all font-medium"
              />
            </label>

            <label className="block group">
              <span className="mb-3 block text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 font-spaceGrotesk group-focus-within:text-brand-gold transition-colors">
                Country
              </span>
              <select
                id="kyc-country"
                name="country"
                value={form.country}
                onChange={handleChange}
                required
                disabled={!canSubmit || loading}
                className="w-full px-5 py-4 rounded-2xl bg-black/20 border border-white/10 text-white focus:border-brand-gold/50 outline-none transition-all font-medium appearance-none"
              >
                <option value="" className="bg-brand-dark-base">
                  Select Country
                </option>
                {COUNTRY_OPTIONS.map((country) => (
                  <option
                    key={country}
                    value={country}
                    className="bg-brand-dark-base"
                  >
                    {country}
                  </option>
                ))}
              </select>
            </label>

            <div className="md:col-span-2 rounded-3xl border border-white/5 bg-black/10 p-8">
              <p className="mb-8 text-[10px] font-black uppercase tracking-[0.3em] text-brand-gold/60 font-spaceGrotesk">
                Contact Phone
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <label className="block">
                  <span className="mb-2 block text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                    Country Code
                  </span>
                  <input
                    type="text"
                    value={
                      form.country && COUNTRY_DIAL_CODES[form.country]
                        ? COUNTRY_DIAL_CODES[form.country]
                        : ''
                    }
                    disabled
                    className="w-full px-5 py-4 rounded-2xl bg-black/40 border border-white/5 text-gray-500 outline-none font-mono"
                  />
                </label>

                <label className="block md:col-span-2 group">
                  <span className="mb-2 block text-[10px] font-bold text-gray-600 uppercase tracking-widest group-focus-within:text-brand-gold transition-colors">
                    Phone Number
                  </span>
                  <input
                    id="kyc-phone-number"
                    type="text"
                    name="phoneNumber"
                    value={form.phoneNumber}
                    onChange={handleChange}
                    placeholder="Enter Phone Number"
                    required
                    disabled={!canSubmit || loading || !form.country}
                    className="w-full px-5 py-4 rounded-2xl bg-black/20 border border-white/10 text-white focus:border-brand-gold/50 outline-none transition-all font-medium"
                  />
                </label>

                <div className="md:col-span-3 flex flex-col gap-4 rounded-2xl border border-white/5 bg-black/20 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span
                      className={`text-[10px] font-black uppercase tracking-widest ${phoneVerified ? 'text-emerald-400' : 'text-gray-500'}`}
                    >
                      {phoneVerified
                        ? 'Phone verified'
                        : 'Phone verification required'}
                    </span>
                    {!phoneVerified && (
                      <button
                        type="button"
                        onClick={sendPhoneVerificationCode}
                        disabled={
                          !canSubmit || loading || phoneVerificationLoading
                        }
                        className="rounded-xl border border-brand-gold/40 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-brand-gold transition-all hover:bg-brand-gold hover:text-brand-dark-base disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {phoneVerificationLoading
                          ? 'Sending...'
                          : phoneVerificationSent
                            ? 'Resend Code'
                            : 'Send Code'}
                      </button>
                    )}
                  </div>
                  {phoneVerificationSent && !phoneVerified && (
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={phoneCode}
                        onChange={(event) =>
                          setPhoneCode(event.target.value.replace(/\D/g, ''))
                        }
                        placeholder="Enter verification code"
                        maxLength={10}
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-5 py-3 text-white outline-none focus:border-brand-gold/50"
                      />
                      <button
                        type="button"
                        onClick={verifyPhoneCode}
                        disabled={phoneVerificationLoading}
                        className="rounded-xl bg-brand-gold px-5 py-3 text-[10px] font-black uppercase tracking-widest text-brand-dark-base transition-all hover:bg-brand-gold-light disabled:opacity-40"
                      >
                        {phoneVerificationLoading
                          ? 'Checking...'
                          : 'Verify Code'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <label className="block md:col-span-2 group">
              <span className="mb-3 block text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 font-spaceGrotesk group-focus-within:text-brand-gold transition-colors">
                Physical Address
              </span>
              <input
                id="kyc-address-line-1"
                type="text"
                name="addressLine1"
                value={form.addressLine1}
                onChange={handleChange}
                placeholder="Street Address"
                required
                disabled={!canSubmit || loading}
                className="w-full px-5 py-4 rounded-2xl bg-black/20 border border-white/10 text-white placeholder-gray-700 focus:border-brand-gold/50 outline-none transition-all font-medium"
              />
            </label>

            <label className="block md:col-span-2 group">
              <span className="mb-3 block text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 font-spaceGrotesk group-focus-within:text-brand-gold transition-colors">
                Address Line 2 (Optional)
              </span>
              <input
                id="kyc-address-line-2"
                type="text"
                name="addressLine2"
                value={form.addressLine2}
                onChange={handleChange}
                placeholder="Apartment, suite, etc."
                disabled={!canSubmit || loading}
                className="w-full px-5 py-4 rounded-2xl bg-black/20 border border-white/10 text-white placeholder-gray-700 focus:border-brand-gold/50 outline-none transition-all font-medium"
              />
            </label>

            <label className="block group">
              <span className="mb-3 block text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 font-spaceGrotesk group-focus-within:text-brand-gold transition-colors">
                City
              </span>
              <input
                id="kyc-city"
                type="text"
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="City"
                required
                disabled={!canSubmit || loading}
                className="w-full px-5 py-4 rounded-2xl bg-black/20 border border-white/10 text-white placeholder-gray-700 focus:border-brand-gold/50 outline-none transition-all font-medium"
              />
            </label>

            <label className="block group">
              <span className="mb-3 block text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 font-spaceGrotesk group-focus-within:text-brand-gold transition-colors">
                State / Province
              </span>
              <input
                id="kyc-state"
                type="text"
                name="stateProvince"
                value={form.stateProvince}
                onChange={handleChange}
                placeholder="State"
                required
                disabled={!canSubmit || loading}
                className="w-full px-5 py-4 rounded-2xl bg-black/20 border border-white/10 text-white placeholder-gray-700 focus:border-brand-gold/50 outline-none transition-all font-medium"
              />
            </label>

            <label className="block group">
              <span className="mb-3 block text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 font-spaceGrotesk group-focus-within:text-brand-gold transition-colors">
                Postal Code
              </span>
              <input
                id="kyc-postal-code"
                type="text"
                name="postalCode"
                value={form.postalCode}
                onChange={handleChange}
                placeholder="Postal Code"
                required
                disabled={!canSubmit || loading}
                className="w-full px-5 py-4 rounded-2xl bg-black/20 border border-white/10 text-white placeholder-gray-700 focus:border-brand-gold/50 outline-none transition-all font-medium"
              />
            </label>

            <label className="block group">
              <span className="mb-3 block text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 font-spaceGrotesk group-focus-within:text-brand-gold transition-colors">
                Document Type
              </span>
              <select
                id="kyc-id-type"
                name="idType"
                value={form.idType}
                onChange={handleChange}
                disabled={!canSubmit || loading}
                className="w-full px-5 py-4 rounded-2xl bg-black/20 border border-white/10 text-white focus:border-brand-gold/50 outline-none transition-all font-medium appearance-none"
              >
                <option value="national_id" className="bg-brand-dark-base">
                  National ID
                </option>
                <option value="passport" className="bg-brand-dark-base">
                  Passport
                </option>
                <option value="drivers_license" className="bg-brand-dark-base">
                  Driver's License
                </option>
                <option value="voters_card" className="bg-brand-dark-base">
                  Voter's Card
                </option>
                <option value="other" className="bg-brand-dark-base">
                  Other
                </option>
              </select>
            </label>

            <label className="block md:col-span-2 group">
              <span className="mb-3 block text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 font-spaceGrotesk group-focus-within:text-brand-gold transition-colors">
                Document Number
              </span>
              <input
                id="kyc-id-number"
                type="text"
                name="idNumber"
                value={form.idNumber}
                onChange={handleChange}
                placeholder="Serial Number"
                required
                disabled={!canSubmit || loading}
                className="w-full px-5 py-4 rounded-2xl bg-black/20 border border-white/10 text-white placeholder-gray-700 focus:border-brand-gold/50 outline-none transition-all font-medium"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                key: 'front',
                label: 'Document Front',
                value: form.frontUrl,
              },
              { key: 'back', label: 'Document Back', value: form.backUrl },
            ].map((item) => (
              <div
                key={item.key}
                className="block border border-white/5 rounded-3xl p-6 bg-black/10 group transition-all hover:bg-black/20"
              >
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 font-spaceGrotesk mb-6">
                  {item.label}
                </p>
                <input
                  type="file"
                  accept="image/*"
                  disabled={!canSubmit || loading || uploading[item.key]}
                  onChange={(event) => handleUpload(event, item.key)}
                  className="hidden"
                  id={`kyc-${item.key}`}
                />
                <div className="flex flex-col gap-4">
                  <label
                    htmlFor={`kyc-${item.key}`}
                    className="cursor-pointer w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 text-gray-400 font-black font-spaceGrotesk text-[10px] uppercase tracking-widest border border-white/5 hover:text-white hover:border-white/10 transition-all active:scale-95"
                  >
                    {uploading[item.key] ? (
                      'Uploading...'
                    ) : (
                      <>
                        <FaUpload className="text-brand-gold" /> Select File
                      </>
                    )}
                  </label>
                  <div
                    className={`text-[10px] font-bold uppercase tracking-widest text-center ${item.value ? 'text-emerald-400' : 'text-gray-700'}`}
                  >
                    {item.value ? 'Status: Uploaded' : 'Status: Empty'}
                  </div>
                </div>
              </div>
            ))}

            <div className="block border border-white/5 rounded-3xl p-6 bg-black/10 group transition-all hover:bg-black/20">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 font-spaceGrotesk mb-6">
                Selfie Verification
              </p>
              <div className="flex flex-col gap-4">
                <button
                  type="button"
                  disabled={!canSubmit || loading || uploading.selfie}
                  onClick={openCamera}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-gold text-brand-dark-base font-black font-spaceGrotesk text-[10px] uppercase tracking-widest shadow-brand-gold transition-all active:scale-95"
                >
                  <FaCamera /> {form.selfieUrl ? 'Retake' : 'Open Camera'}
                </button>
                <div
                  className={`text-[10px] font-bold uppercase tracking-widest text-center ${form.selfieUrl ? 'text-emerald-400' : 'text-gray-700'}`}
                >
                  {form.selfieUrl ? 'Status: Captured' : 'Status: Required'}
                </div>

                <p className="text-[10px] font-bold uppercase tracking-widest text-center text-gray-600">
                  Live camera capture only
                </p>
              </div>
            </div>
          </div>

          <label className="flex items-start gap-4 rounded-3xl border border-white/5 bg-black/10 p-6 transition-all hover:bg-black/20 cursor-pointer">
            <input
              id="kyc-consent"
              type="checkbox"
              name="consentAccepted"
              checked={Boolean(form.consentAccepted)}
              onChange={handleChange}
              disabled={!canSubmit || loading}
              className="mt-1 h-5 w-5 rounded-lg border-white/10 bg-black/20 text-brand-gold focus:ring-brand-gold transition-all"
            />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
              I certify that all information provided is accurate and belongs to
              me, and I authorize verification checks for compliance purposes.
            </span>
          </label>

          <div className="flex flex-col sm:flex-row gap-6 items-center">
            <button
              type="submit"
              disabled={
                !canSubmit ||
                submitting ||
                loading ||
                !form.consentAccepted ||
                !form.frontUrl ||
                !phoneVerified ||
                !selfieCapturedAt ||
                !form.selfieUrl
              }
              className="w-full sm:w-auto px-12 py-5 rounded-2xl bg-brand-gold text-brand-dark-base font-black font-spaceGrotesk text-sm uppercase tracking-wider shadow-[0_10px_30px_rgba(212,175,55,0.2)] hover:bg-brand-gold-light transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {submitting
                ? 'Submitting...'
                : kycData?.status === 'rejected'
                  ? 'Resubmit Verification'
                  : 'Submit Verification'}
            </button>

            {!canSubmit && (
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-gold shadow-brand-gold"></div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] font-spaceGrotesk">
                  Interface Locked During {statusUI.label}
                </p>
              </div>
            )}
          </div>
        </form>

        {isCameraOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl p-4">
              <h2 className="text-lg font-semibold text-white mb-3">
                Live Selfie Capture
              </h2>

              {cameraError && (
                <p className="mb-3 text-sm text-red-300 bg-red-500/10 border border-red-500/40 rounded-lg p-3">
                  {cameraError}
                </p>
              )}

              <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-[320px] object-cover"
                />

                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute inset-0 bg-black/20"></div>

                  <div className="absolute left-1/2 top-1/2 h-[74%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border-2 border-brand-gold/80 shadow-[0_0_0_9999px_rgba(2,6,23,0.45)]">
                    <img
                      src={SecxionLogo}
                      alt="Secxion watermark"
                      className="pointer-events-none absolute right-3 top-3 h-10 w-10 rounded-xl border border-brand-gold/20 bg-black/30 p-1 opacity-60"
                    />

                    <div className="absolute -left-1 -top-1 h-7 w-7 border-l-4 border-t-4 border-brand-gold rounded-tl-lg"></div>
                    <div className="absolute -right-1 -top-1 h-7 w-7 border-r-4 border-t-4 border-brand-gold rounded-tr-lg"></div>
                    <div className="absolute -bottom-1 -left-1 h-7 w-7 border-b-4 border-l-4 border-brand-gold rounded-bl-lg"></div>
                    <div className="absolute -bottom-1 -right-1 h-7 w-7 border-b-4 border-r-4 border-brand-gold rounded-br-lg"></div>

                    <div className="absolute inset-x-6 top-1/2 h-[2px] -translate-y-1/2 bg-brand-gold/60 animate-pulse"></div>
                  </div>

                  <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-brand-gold font-spaceGrotesk">
                    Align Face Inside Gold Frame
                  </p>
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-400">
                Position your face and ID clearly in frame, then capture.
              </p>

              <div className="mt-4 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={closeCamera}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-red-500/10 px-4 py-2 font-black font-spaceGrotesk text-[10px] uppercase tracking-[0.2em] text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.12)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-red-500/20 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={uploading.selfie}
                  onClick={captureSelfie}
                  className="px-4 py-2 rounded-lg bg-yellow-500 text-slate-900 font-semibold hover:bg-yellow-400 disabled:opacity-60"
                >
                  {uploading.selfie ? 'Processing...' : 'Capture Selfie'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KycVerification;
