import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    
    setError('');
    setIsSubmitting(true);
    try {
      await login(username.trim(), password);
      // AuthContext will automatically update user state and redirect
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.error || 'Invalid credentials or connection error. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#09090b] px-4 select-none">
      <div className="w-full max-w-md bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 shadow-xl rounded-2xl p-8 transform transition-all animate-scale-in">
        {/* Brand Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-indigo-600/20 mb-3">
            S
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            Welcome Back
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 font-medium">
            Sign in to manage your shop's ledger
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 flex gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/30 text-rose-800 dark:text-rose-400 text-sm font-medium items-start">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username Input */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isSubmitting}
                placeholder="Enter username"
                className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-zinc-950 dark:text-zinc-100 transition-all disabled:opacity-50"
              />
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <User className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                placeholder="Enter password"
                className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-10 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-zinc-950 dark:text-zinc-100 transition-all disabled:opacity-50"
              />
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <Lock className="w-4 h-4" />
              </div>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSubmitting}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 disabled:opacity-50"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me Option */}
          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isSubmitting}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500/20 border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 cursor-pointer disabled:opacity-50"
            />
            <label 
              htmlFor="remember-me" 
              className="ml-2.5 text-sm font-semibold text-zinc-600 dark:text-zinc-400 cursor-pointer select-none disabled:opacity-50"
            >
              Remember this device
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/10 cursor-pointer"
          >
            {isSubmitting ? (
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
