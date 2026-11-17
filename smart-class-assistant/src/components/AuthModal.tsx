import React, { useEffect, useState } from 'react';
import { X, Shield, GraduationCap, AlertCircle, CheckCircle2, KeyRound, MailCheck, RefreshCw } from 'lucide-react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  BOOTSTRAPPED_ADMIN_EMAIL,
} from '../firebase';
import { ACADEMIC_LEVELS, AcademicLevel, Department, UserRole } from '../types/academic';
import { validateStaffInviteCode } from '../services/firestoreService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: 'student' | 'lecturer';
  mode: 'auth' | 'verify-email' | 'onboarding';
  departments: Department[];
  pendingUserEmail?: string;
  pendingUserName?: string;
  onRecheckVerification?: () => Promise<boolean>;
  onResendVerification?: () => Promise<void>;
  onSignOutVerification?: () => Promise<void>;
  onCompleteOnboarding: (data: {
    displayName: string;
    role: UserRole;
    departmentId: string;
    departmentName: string;
    level: AcademicLevel | 'Staff';
    title: string;
    institutionalId?: string;
    inviteCode?: string;
  }) => Promise<void>;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialRole = 'student',
  mode,
  departments,
  pendingUserEmail,
  pendingUserName,
  onRecheckVerification,
  onResendVerification,
  onSignOutVerification,
  onCompleteOnboarding,
}) => {
  const [authTab, setAuthTab] = useState<'google' | 'email' | 'reset'>('google');
  const [emailMode, setEmailMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');

  // Onboarding state
  const [role, setRole] = useState<'student' | 'lecturer'>(initialRole);
  const [displayName, setDisplayName] = useState(pendingUserName || '');
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || 'dept_csc');
  const [level, setLevel] = useState<AcademicLevel>('300');
  const [title, setTitle] = useState('');
  const [institutionalId, setInstitutionalId] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  useEffect(() => {
    setErrorMsg('');
    if (mode !== 'verify-email') {
      setInfoMsg('');
    }
  }, [mode]);

  useEffect(() => {
    if (pendingUserName) {
      setDisplayName((prev) => prev || pendingUserName);
    }
  }, [pendingUserName]);

  if (!isOpen) return null;

  const isAdminAccount =
    pendingUserEmail?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

  const handleGoogleAuth = async () => {
    setBusy(true);
    setErrorMsg('');
    setInfoMsg('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google Sign-In could not be completed.';
      setErrorMsg(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg('');
    setInfoMsg('');
    try {
      if (emailMode === 'signin') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (displayName.trim()) {
          await updateProfile(cred.user, { displayName: displayName.trim() });
        }
        await sendEmailVerification(cred.user);
        setInfoMsg('Account created! Please check your inbox to verify your email address before continuing.');
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/operation-not-allowed') {
        setErrorMsg(
          'Email/Password sign-in is not yet enabled in your Firebase Console (Authentication -> Sign-in method). Please use "Continue with Google" or enable Email/Password in Firebase Console.'
        );
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Authentication failed.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg('');
    setInfoMsg('');
    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setInfoMsg('Password reset instructions have been sent to your email address.');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/operation-not-allowed') {
        setErrorMsg('Email/Password provider is not enabled in Firebase Console. Google-authenticated accounts manage passwords through Google.');
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Could not send reset email.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyCheck = async () => {
    if (!onRecheckVerification) return;
    setBusy(true);
    setErrorMsg('');
    setInfoMsg('');
    try {
      const verified = await onRecheckVerification();
      if (!verified) {
        setErrorMsg(
          'Your email is not verified yet. Please open the verification link sent to your inbox (and check your spam folder), then click Continue.'
        );
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to refresh verification status.');
    } finally {
      setBusy(false);
    }
  };

  const handleResendLink = async () => {
    if (!onResendVerification) return;
    setBusy(true);
    setErrorMsg('');
    setInfoMsg('');
    try {
      await onResendVerification();
      setInfoMsg(`A fresh verification link was sent to ${pendingUserEmail || 'your email'}.`);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/too-many-requests') {
        setErrorMsg('Too many verification emails requested. Please wait a minute and check your inbox/spam folder.');
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Could not resend verification email.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg('');
    try {
      if (auth.currentUser && !auth.currentUser.emailVerified) {
        setErrorMsg('Please verify your email address before completing registration.');
        setBusy(false);
        return;
      }

      const chosenDept = departments.find((d) => d.id === departmentId);
      const deptName = chosenDept?.name || 'Computer Science';

      if (role === 'lecturer' && !isAdminAccount) {
        if (!inviteCode.trim()) {
          setErrorMsg('Please enter your institutional Staff Invite Code (e.g., SCA-FACULTY-2026) or register as Student and submit a staff verification request from Profile.');
          setBusy(false);
          return;
        }
        const valid = await validateStaffInviteCode(inviteCode.trim().toUpperCase());
        if (!valid) {
          setErrorMsg('Invalid or inactive Staff Invite Code. Verify the code with your administrator or register as a Student first.');
          setBusy(false);
          return;
        }
      }

      await onCompleteOnboarding({
        displayName: displayName.trim() || pendingUserName || 'Academic User',
        role: isAdminAccount ? 'admin' : role,
        departmentId: departmentId || 'dept_csc',
        departmentName: deptName,
        level: role === 'lecturer' || isAdminAccount ? 'Staff' : level,
        title: title.trim() || (isAdminAccount ? 'System Administrator' : role === 'lecturer' ? 'Lecturer' : 'Undergraduate'),
        institutionalId: institutionalId.trim() || undefined,
        inviteCode: role === 'lecturer' && !isAdminAccount ? inviteCode.trim().toUpperCase() : undefined,
      });
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save your academic profile.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#060E1E]/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-[#0A1628] px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <GraduationCap className="h-5 w-5 text-blue-400" aria-hidden="true" />
            <h2 className="text-base font-semibold">
              {mode === 'auth'
                ? 'Access Smart Class Assistant'
                : mode === 'verify-email'
                  ? 'Verify Your Email Address'
                  : 'Complete Academic Registration'}
            </h2>
          </div>
          {mode === 'auth' && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close authentication modal"
              className="rounded-lg p-1.5 text-blue-200 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="p-6">
          {errorMsg && (
            <div role="alert" className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div role="status" className="mb-4 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              <span>{infoMsg}</span>
            </div>
          )}

          {mode === 'verify-email' ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-slate-700">
                <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-slate-900">Email verification required</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    We sent a verification link to{' '}
                    <span className="font-semibold text-slate-900">
                      {pendingUserEmail || 'your email address'}
                    </span>
                    . Click the link in your inbox (or spam folder) so we can securely create your academic profile.
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={busy}
                onClick={handleVerifyCheck}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} aria-hidden="true" />
                {busy ? 'Checking Verification...' : "I've Verified My Email — Continue"}
              </button>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleResendLink}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
                >
                  Resend Verification Link
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onSignOutVerification?.()}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
                >
                  Use Google Sign-In / Switch Account
                </button>
              </div>
            </div>
          ) : mode === 'auth' ? (
            <>
              <div className="mb-5 grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setAuthTab('google')}
                  className={`rounded-md py-2 transition-colors cursor-pointer ${
                    authTab === 'google' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Google Sign-In
                </button>
                <button
                  type="button"
                  onClick={() => setAuthTab('email')}
                  className={`rounded-md py-2 transition-colors cursor-pointer ${
                    authTab === 'email' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Email Login
                </button>
                <button
                  type="button"
                  onClick={() => setAuthTab('reset')}
                  className={`rounded-md py-2 transition-colors cursor-pointer ${
                    authTab === 'reset' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Reset Password
                </button>
              </div>

              {authTab === 'google' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">
                    Sign in securely with your Google or institutional academic account. New users choose Student or Lecturer access immediately after signing in.
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleGoogleAuth}
                    className="flex w-full items-center justify-center gap-3 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    <Shield className="h-4 w-4" aria-hidden="true" />
                    {busy ? 'Connecting...' : 'Continue with Google'}
                  </button>
                  <p className="text-center text-xs text-slate-500">
                    Role-based access protects student submissions, lecturer materials, and admin controls.
                  </p>
                </div>
              )}

              {authTab === 'email' && (
                <form onSubmit={handleEmailAuth} className="space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-500">
                      {emailMode === 'signin' ? 'Sign in with email & password' : 'Create an academic email account'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEmailMode(emailMode === 'signin' ? 'signup' : 'signin')}
                      className="font-semibold text-blue-600 hover:underline cursor-pointer"
                    >
                      {emailMode === 'signin' ? 'Need an account? Register' : 'Already registered? Sign In'}
                    </button>
                  </div>

                  {emailMode === 'signup' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Full Name</label>
                      <input
                        type="text"
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g., Amara Nwosu"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Institutional Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@university.edu"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Password</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
                  >
                    {busy ? 'Processing...' : emailMode === 'signin' ? 'Sign In' : 'Create Account'}
                  </button>
                </form>
              )}

              {authTab === 'reset' && (
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <p className="text-sm text-slate-600">
                    Enter your registered email address to receive a password reset link.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Email Address</label>
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="name@university.edu"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0A1628] py-2.5 text-sm font-semibold text-white hover:bg-[#13284A] disabled:opacity-60 cursor-pointer"
                  >
                    <KeyRound className="h-4 w-4" aria-hidden="true" />
                    {busy ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>
              )}
            </>
          ) : (
            <form onSubmit={handleOnboardingSubmit} className="space-y-4">
              {isAdminAccount ? (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                  <strong>Administrator Account Verified:</strong> Your email ({pendingUserEmail}) is configured as the system administrator. You can manage staff, students, departments, and switch between Student, Lecturer, and Admin views.
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Account Type</label>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('student')}
                      className={`rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-colors cursor-pointer ${
                        role === 'student'
                          ? 'border-blue-600 bg-blue-50 text-blue-900'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Student Account
                      <span className="mt-0.5 block font-normal text-slate-500">
                        Access lectures, notes &amp; quizzes
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('lecturer')}
                      className={`rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-colors cursor-pointer ${
                        role === 'lecturer'
                          ? 'border-blue-600 bg-blue-50 text-blue-900'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Lecturer / Staff
                      <span className="mt-0.5 block font-normal text-slate-500">
                        Upload materials &amp; grade work
                      </span>
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your full name"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Department</label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  >
                    {departments.length > 0 ? (
                      departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.code} — {d.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="dept_csc">CSC — Computer Science</option>
                        <option value="dept_eng">EEE — Electrical Engineering</option>
                        <option value="dept_bus">BUS — Business &amp; Management</option>
                      </>
                    )}
                  </select>
                </div>

                {role === 'student' && !isAdminAccount ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Academic Level</label>
                    <select
                      value={level}
                      onChange={(e) => setLevel(e.target.value as AcademicLevel)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                    >
                      {ACADEMIC_LEVELS.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl === 'Postgraduate' ? 'Postgraduate' : `${lvl} Level`}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Academic Title</label>
                    <input
                      type="text"
                      maxLength={60}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Dr., Prof., Lecturer"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {role === 'student' && !isAdminAccount ? 'Matric / Student ID (Optional)' : 'Staff ID (Optional)'}
                </label>
                <input
                  type="text"
                  maxLength={60}
                  value={institutionalId}
                  onChange={(e) => setInstitutionalId(e.target.value)}
                  placeholder="e.g., CSC/2024/0142"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>

              {role === 'lecturer' && !isAdminAccount && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Institutional Staff Invite Code
                  </label>
                  <input
                    type="text"
                    required
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Enter staff code issued by administrator"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono uppercase focus:border-blue-600 focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Don’t have a code yet? Choose Student Account and submit a Lecturer verification request in Profile &amp; Settings.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
              >
                {busy ? 'Setting up your workspace...' : 'Save & Enter Workspace'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
