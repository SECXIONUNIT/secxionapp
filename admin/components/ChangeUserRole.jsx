import React, { useState } from 'react';
import ROLE from '../common/role';
import { IoMdClose } from 'react-icons/io';
import { FaUserShield, FaTrashAlt } from 'react-icons/fa';
import SummaryApi, { authFetch } from '../common';
import { toast } from 'react-toastify';
import AdminModalActions from './ui/AdminModalActions';

const ChangeUserRole = ({ name, email, role, userId, onClose, callFunc }) => {
  const [userRole, setUserRole] = useState(role);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOnChangeSelect = (e) => {
    setUserRole(e.target.value);
  };

  const updateUserRole = async () => {
    setIsUpdating(true);
    try {
      const fetchResponse = await authFetch(SummaryApi.updateUser.url, {
        method: SummaryApi.updateUser.method,
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          role: userRole,
        }),
      });

      const responseData = await fetchResponse.json();

      if (responseData.success) {
        toast.success(responseData.message);
        onClose();
        callFunc();
      } else {
        toast.error(responseData.message);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteUser = async () => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    setIsDeleting(true);
    try {
      const fetchResponse = await authFetch(SummaryApi.deleteUser.url, {
        method: SummaryApi.deleteUser.method,
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ userIds: [userId] }),
      });

      const responseData = await fetchResponse.json();

      if (responseData.success) {
        toast.success('User deleted successfully.');
        onClose();
        callFunc();
      } else {
        toast.error(responseData.message);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-user-role-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-500/10 rounded-xl">
              <FaUserShield className="text-yellow-500 text-lg" />
            </div>
            <h2 id="change-user-role-title" className="text-lg font-semibold text-white">
              Edit User Role
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 min-w-11 items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/70"
            aria-label="Close edit user role dialog"
          >
            <IoMdClose size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* User Info */}
          <div className="flex items-center space-x-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center text-slate-900 font-bold text-lg flex-shrink-0">
              {name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white font-medium truncate capitalize">
                {name}
              </p>
              <p className="text-slate-400 text-sm truncate">{email}</p>
            </div>
          </div>

          {/* Role Selector */}
          <div>
            <label htmlFor="change-user-role-select" className="block text-sm font-medium text-slate-400 mb-2">
              User Role
            </label>
            <select
              id="change-user-role-select"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-colors"
              value={userRole}
              onChange={handleOnChangeSelect}
            >
              {Object.values(ROLE).map((el) => (
                <option value={el} key={el} className="bg-slate-900">
                  {el}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <AdminModalActions stacked className="p-5">
          <button
            type="button"
            className="w-full py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-slate-900 font-semibold rounded-xl hover:from-yellow-400 hover:to-yellow-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            onClick={updateUserRole}
            disabled={isUpdating || userRole === role}
          >
            {isUpdating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-900 border-t-transparent"></div>
                <span>Updating...</span>
              </>
            ) : (
              <span>Update Role</span>
            )}
          </button>

          <button
            type="button"
            className="w-full py-3 bg-red-500/10 text-red-400 font-medium rounded-xl border border-red-500/30 hover:bg-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            onClick={deleteUser}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-400 border-t-transparent"></div>
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <FaTrashAlt />
                <span>Delete User</span>
              </>
            )}
          </button>
        </AdminModalActions>
      </div>
    </div>
  );
};

export default ChangeUserRole;
