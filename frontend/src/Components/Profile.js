import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import SummaryApi from '../common';
import { toast } from 'react-toastify';
import {
  FaEdit,
  FaUser,
  FaEnvelope,
  FaTelegram,
  FaCalendarAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaUserCheck,
  FaIdCard,
} from 'react-icons/fa';
import { PiUserSquare } from 'react-icons/pi';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';
import { persistor } from '../store/store';
import { clearState } from '../store/userSlice';
import SecxionShimmer from './SecxionShimmer';
import SecxionSpinner from './SecxionSpinner';
import BackButton from './BackButton';
import { KYC_ENABLED } from '../config/features';

const Profile = () => {
  const { user } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [errorProfile, setErrorProfile] = useState(null);
  const [profileData, setProfileData] = useState(user || null);
  const [isLoading, setIsLoading] = useState(true);

  const clearPersistedProfileState = useCallback(async () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    dispatch(clearState());
    if (persistor) {
      await persistor.purge();
    }
    setProfileData(null);
  }, [dispatch]);

  const fetchUserProfile = useCallback(async () => {
    setErrorProfile(null);
    setIsLoading(true);
    try {
      const response = await fetch(SummaryApi.getUserProfile.url, {
        method: SummaryApi.getUserProfile.method,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401 || response.status === 404) {
          await clearPersistedProfileState();
        }
        throw new Error(errorData.message || 'Failed to fetch profile data');
      }

      const data = await response.json();
      setProfileData(data.data);
    } catch (err) {
      setErrorProfile(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [clearPersistedProfileState]);

  const fetchUserDetails = useCallback(async () => {
    try {
      const response = await fetch(SummaryApi.current_user.url, {
        method: SummaryApi.current_user.method,
        credentials: 'include',
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setProfileData(data.data);
      } else {
        if (response.status === 401 || response.status === 404) {
          await clearPersistedProfileState();
        }
        toast.error(data.message || 'Failed to fetch updated user details.');
      }
    } catch (error) {
      toast.error('Error fetching updated user details.');
    }
  }, [clearPersistedProfileState]);

  const handleEditProfile = () => {
    if (profileData) {
      navigate('/settings', {
        state: {
          name: profileData.name,
          tag: profileData.tag,
          telegramNumber: profileData.telegramNumber,
          email: profileData.email,
          profilePic: profileData.profilePic,
        },
      });
    }
  };

  const truncateText = (text, maxLength) => {
    if (!text) return '';
    return text.length > maxLength
      ? `${text.substring(0, maxLength)}...`
      : text;
  };

  const getAccountAge = () => {
    if (!profileData?.createdAt) return 'Unknown';
    const duration = moment.duration(
      moment().diff(moment(profileData.createdAt)),
    );
    const years = duration.years();
    const months = duration.months();
    const days = duration.days();

    if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''} ${months > 0 ? `, ${months} month${months > 1 ? 's' : ''}` : ''}`;
    } else if (months > 0) {
      return `${months} month${months > 1 ? 's' : ''} ${days > 0 ? `, ${days} day${days > 1 ? 's' : ''}` : ''}`;
    } else {
      return `${days} day${days > 1 ? 's' : ''}`;
    }
  };

  const isEmailVerified = () => {
    // Check multiple possible field names for email verification
    return (
      profileData?.isEmailVerified === true ||
      profileData?.emailVerified === true ||
      profileData?.verified === true ||
      profileData?.isVerified === true ||
      profileData?.email_verified === true
    );
  };

  const getKycStatusMeta = () => {
    const status = String(profileData?.kycStatus || 'unverified').toLowerCase();

    if (status === 'approved') {
      return {
        label: 'Verified',
        badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        detail: profileData?.kycVerifiedAt
          ? `Verified ${moment(profileData.kycVerifiedAt).fromNow().toUpperCase()}`
          : 'Identity verification approved',
      };
    }

    if (status === 'pending') {
      return {
        label: 'Pending Review',
        badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        detail: 'Your submission is awaiting admin review.',
      };
    }

    if (status === 'rejected') {
      return {
        label: 'Rejected',
        badgeClass: 'bg-red-500/10 text-red-400 border-red-500/20',
        detail: 'Please open Identity Verification to resubmit.',
      };
    }

    return {
      label: 'Not Started',
      badgeClass: 'bg-white/5 text-gray-400 border-white/10',
      detail: 'Identity verification has not been submitted yet.',
    };
  };

  const hasCompletedProfile = () => {
    return !!(profileData?.name && profileData?.email && profileData?.tag);
  };

  const kycStatusMeta = getKycStatusMeta();

  useEffect(() => {
    if (!user?.name) {
      fetchUserProfile();
    } else {
      setProfileData(user);
      setIsLoading(false);
    }
    fetchUserDetails();
  }, [fetchUserProfile, fetchUserDetails, user]);

  if (isLoading) {
    return (
      <div className="mt-20 p-4 sm:p-6 max-w-4xl mx-auto">
        <SecxionShimmer type="profile" count={1} />
      </div>
    );
  }

  if (errorProfile) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-20 p-6 max-w-4xl mx-auto bg-red-50 border border-red-200 text-red-800 rounded-xl shadow-lg"
      >
        <div className="flex items-center justify-center">
          <div className="text-center">
            <FaTimesCircle className="mx-auto text-4xl mb-3 text-red-500" />
            <p className="font-semibold text-lg">Error loading profile</p>
            <p className="text-sm mt-1 text-red-600">{errorProfile}</p>
            <button
              onClick={fetchUserProfile}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
            >
              Try Again
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!profileData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto mt-20 max-w-4xl rounded-2xl border border-white/10 bg-black/20 p-6 text-gray-600 shadow-lg"
      >
        <div className="flex items-center justify-center">
          <div className="text-center">
            <SecxionSpinner size="small" message="" />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mt-24 p-4 sm:p-8 max-w-5xl mx-auto"
    >
      <BackButton fallbackTo="/home" className="mb-6" />

      {/* Header Section */}
      <div className="border-b border-white/10 pb-8 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-6 sm:space-y-0 sm:space-x-10">
            {/* Profile Picture */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex-shrink-0 mx-auto sm:mx-0"
            >
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 lg:w-40 lg:h-40">
                <div className="w-full h-full rounded-2xl bg-brand-dark-elevated flex items-center justify-center overflow-hidden shadow-2xl ring-4 ring-brand-gold/20">
                  {profileData?.profilePic ? (
                    <img
                      src={profileData.profilePic}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <PiUserSquare size={64} className="text-brand-gold" />
                  )}
                </div>
                {/* Status indicator */}
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-brand-dark-base border-4 border-brand-dark-base rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-emerald-400 rounded-full shadow-[0_0_10px_#4ade80]"></div>
                </div>
              </div>
            </motion.div>

            {/* Profile Info */}
            <div className="flex-grow min-w-0 text-center sm:text-left">
              <div className="space-y-4">
                <div className="flex items-center justify-center sm:justify-start space-x-4">
                  <h1
                    className="text-2xl sm:text-3xl lg:text-4xl font-black text-white font-spaceGrotesk uppercase tracking-tight break-words leading-tight"
                    title={profileData.name || 'No Name'}
                  >
                    {profileData.name || 'Unnamed User'}
                  </h1>
                  {hasCompletedProfile() && (
                    <div className="p-1.5 bg-brand-gold/10 rounded-lg">
                      <FaUserCheck
                        className="text-brand-gold text-lg"
                        title="Profile Complete"
                      />
                    </div>
                  )}
                </div>

                {/* User Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  {profileData.email && (
                    <div className="flex items-center justify-center sm:justify-start space-x-3 group">
                      <FaEnvelope className="text-gray-500 flex-shrink-0 group-hover:text-brand-gold transition-colors" />
                      <span
                        className="text-gray-400 font-medium break-all"
                        title={profileData.email}
                      >
                        {truncateText(profileData.email, 25)}
                      </span>
                      {isEmailVerified() ? (
                        <FaCheckCircle
                          className="text-emerald-500 flex-shrink-0 text-xs"
                          title="Verified"
                        />
                      ) : (
                        <FaTimesCircle
                          className="text-red-500 flex-shrink-0 text-xs"
                          title="Unverified"
                        />
                      )}
                    </div>
                  )}

                  {profileData.tag && (
                    <div className="flex items-center justify-center sm:justify-start space-x-3">
                      <FaUser className="text-gray-500 flex-shrink-0" />
                      <span className="bg-brand-gold/10 text-brand-gold px-4 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-brand-gold/20 font-spaceGrotesk">
                        @{profileData.tag}
                      </span>
                    </div>
                  )}

                  {profileData.telegramNumber && (
                    <div className="flex items-center justify-center sm:justify-start space-x-3">
                      <FaTelegram className="text-sky-500 flex-shrink-0" />
                      <span className="text-gray-300 font-bold font-spaceGrotesk tracking-wide">
                        {profileData.telegramNumber}
                      </span>
                    </div>
                  )}

                  {profileData.createdAt && (
                    <div className="flex items-center justify-center sm:justify-start space-x-3">
                      <FaCalendarAlt className="text-gray-500 flex-shrink-0" />
                      <span className="text-gray-400 font-medium">
                        Active for{' '}
                        <span className="text-white">{getAccountAge()}</span>
                      </span>
                    </div>
                  )}

                  <div className="flex items-start justify-center space-x-3 sm:col-span-2 sm:justify-start">
                    <FaIdCard className="mt-1 flex-shrink-0 text-gray-500" />
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-gray-400">
                          KYC Status
                        </span>
                        <span
                          className={`inline-flex items-center rounded-lg border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${kycStatusMeta.badgeClass}`}
                        >
                          {kycStatusMeta.label}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-gray-500">
                        {kycStatusMeta.detail}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Button */}
          <div className="flex-shrink-0 flex justify-center lg:justify-end">
            <div className="flex flex-wrap gap-4 justify-center lg:justify-end">
              {KYC_ENABLED && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/kyc')}
                  className="inline-flex items-center gap-3 px-8 py-3.5 text-xs font-black uppercase tracking-widest text-brand-dark-base bg-brand-gold hover:bg-brand-gold-light rounded-xl transition-all duration-300 shadow-brand-gold font-spaceGrotesk"
                >
                  <FaIdCard className="w-4 h-4" />
                  <span>Identity Verification</span>
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleEditProfile}
                className="inline-flex items-center gap-3 px-8 py-3.5 text-xs font-black uppercase tracking-widest text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all duration-300 font-spaceGrotesk"
              >
                <FaEdit className="w-4 h-4 text-brand-gold" />
                <span>Control Panel</span>
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Info Section */}
      <div className="mt-4 pt-10 border-t border-white/10">
        <div className="bg-black/20 rounded-2xl p-8 border border-white/5">
          <h3 className="text-[10px] font-black text-brand-gold mb-8 flex items-center uppercase tracking-[0.4em] font-spaceGrotesk">
            <FaUser className="mr-3 opacity-50" />
            Account Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12 text-sm">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-spaceGrotesk">
                Joined On
              </span>
              <span className="text-gray-300 font-bold tracking-tight">
                {profileData.createdAt
                  ? moment(profileData.createdAt).format(
                      'MMMM D, YYYY [AT] HH:mm',
                    )
                  : 'Unknown'}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-spaceGrotesk">
                Last Active
              </span>
              <span className="text-gray-300 font-bold tracking-tight">
                {profileData.updatedAt
                  ? moment(profileData.updatedAt).fromNow().toUpperCase()
                  : 'Unknown'}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-spaceGrotesk">
                User ID
              </span>
              <span className="text-brand-gold/60 font-mono text-xs font-black tracking-widest">
                {profileData._id
                  ? `${profileData._id.toUpperCase()}`
                  : 'Unknown'}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-spaceGrotesk">
                Account Type
              </span>
              <div>
                <span className="bg-brand-gold/10 text-brand-gold px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-brand-gold/20">
                  {profileData.role || 'Standard User'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Profile;
