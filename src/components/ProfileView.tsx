import React, { useState } from 'react';
import {
  User,
  Mail,
  ShieldCheck,
  AlertTriangle,
  KeyRound,
  LogOut,
  Trash2,
  Download,
  CheckCircle2,
  Calendar,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { exportFullBackup } from '../utils/storage';
import { Transaction, Account, Budget, SavingsGoal, RecurringBill, CategoryItem, AppSettings } from '../types';

import { parseAuthError } from '../utils/authErrors';

interface ProfileViewProps {
  transactions: Transaction[];
  accounts: Account[];
  budgets: Budget[];
  goals: SavingsGoal[];
  recurring: RecurringBill[];
  categories: CategoryItem[];
  settings: AppSettings;
}

export function ProfileView({
  transactions,
  accounts,
  budgets,
  goals,
  recurring,
  categories,
  settings,
}: ProfileViewProps) {
  const { user, logout, updateName, changePassword, resendVerification, deleteAccount } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('');

  const [nameSuccess, setNameSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await updateName(displayName);
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update name.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg('New passwords do not match.');
      return;
    }

    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      const parsed = parseAuthError(err, 'password', 'update');
      setErrorMsg(parsed.message || 'Failed to change password. Please verify current password.');
    }
  };

  const handleResendVerify = async () => {
    setErrorMsg(null);
    try {
      await resendVerification();
      setVerifySuccess(true);
      setTimeout(() => setVerifySuccess(false), 4000);
    } catch (err: any) {
      const parsed = parseAuthError(err, 'password', 'update');
      setErrorMsg(parsed.message || 'Failed to send verification email.');
    }
  };

  const handleDeleteAccount = async () => {
    setErrorMsg(null);
    if (!window.confirm('CRITICAL: Are you absolutely certain you want to permanently delete your account and all associated financial records? This cannot be undone.')) {
      return;
    }

    try {
      await deleteAccount(deleteConfirmPassword || undefined);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete account. Please verify your current password.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          User Profile & Security Management
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Manage your authenticated identity, credentials, verification status, and data exports
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-lg shadow-sm">
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {user?.displayName || 'Finance User'}
              </h3>
              <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5" />
                <span>{user?.email}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user?.emailVerified ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Email Verified</span>
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-semibold border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Unverified Email</span>
                </span>
                <button
                  onClick={handleResendVerify}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                >
                  Resend Link
                </button>
              </div>
            )}

            <button
              onClick={() => logout()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition ml-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {verifySuccess && (
          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
            Verification email sent to {user?.email}! Please check your inbox.
          </div>
        )}

        {/* Account Metadata Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
          <div>
            <span>Account User ID (UID):</span>{' '}
            <code className="text-slate-800 dark:text-slate-200 font-mono text-[11px] select-all">
              {user?.uid}
            </code>
          </div>
          <div>
            <span>Account Created:</span>{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {user?.metadata?.creationTime || 'N/A'}
            </strong>
          </div>
        </div>
      </div>

      {/* Edit Display Name */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <User className="w-4 h-4 text-emerald-600" />
          <span>Update Display Name</span>
        </h3>

        {nameSuccess && (
          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
            Name updated successfully!
          </div>
        )}

        <form onSubmit={handleUpdateName} className="flex flex-wrap items-center gap-3 text-xs">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your full name"
            required
            className="flex-1 min-w-[220px] py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
          <button
            type="submit"
            className="px-4 py-2 font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition"
          >
            Update Name
          </button>
        </form>
      </div>

      {/* Change Password Form (only for email/pass users) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-emerald-600" />
          <span>Change Password</span>
        </h3>

        {passwordSuccess && (
          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
            Password changed successfully!
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-3 text-xs max-w-md">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="block w-full py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="block w-full py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="block w-full py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 font-bold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 transition"
          >
            Change Password
          </button>
        </form>
      </div>

      {/* Export Data Before Deletion */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Download className="w-4 h-4 text-emerald-600" />
          <span>Export Personal Financial Data</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Download your complete financial dataset (transactions, accounts, budgets, goals, recurring schedules, and categories) as an encrypted JSON archive.
        </p>

        <button
          onClick={() =>
            exportFullBackup(
              transactions,
              accounts,
              budgets,
              goals,
              recurring,
              categories,
              settings
            )
          }
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-slate-800 dark:text-slate-200"
        >
          <Download className="w-3.5 h-3.5 text-emerald-600" />
          <span>Download Personal Backup (JSON)</span>
        </button>
      </div>

      {/* Danger Zone: Account Deletion */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-rose-200 dark:border-rose-950/80 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
          <Trash2 className="w-4 h-4" />
          <span>Permanently Delete Account</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Deleting your account will erase your authentication record and permanently delete all your user-scoped Firestore documents (transactions, accounts, budgets, goals, and categories).
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <input
            type="password"
            value={deleteConfirmPassword}
            onChange={(e) => setDeleteConfirmPassword(e.target.value)}
            placeholder="Confirm with your password"
            className="py-1.5 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white w-56"
          />
          <button
            onClick={handleDeleteAccount}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition"
          >
            Confirm & Delete My Account
          </button>
        </div>
      </div>
    </div>
  );
}
