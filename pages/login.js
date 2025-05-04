// pages/login.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import Link from 'next/link';
import Head from 'next/head';
import { useTheme } from '../lib/themeContext';
import ThemeToggle from '../components/ThemeToggle';
import ProtectedRoute from '../components/ProtectedRoute';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { darkMode } = useTheme();

  // Reset error when inputs change
  useEffect(() => {
    if (error) setError(null);
  }, [email, password]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Email dan password harus diisi");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/');
    } catch (error) {
      console.error("Error signing in:", error);
      
      // Better error handling
      switch(error.code) {
        case 'auth/invalid-credential':
        case 'auth/invalid-email':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          setError("Email atau password salah. Pastikan Anda sudah terdaftar dan masukan kredensial yang benar.");
          break;
        case 'auth/too-many-requests':
          setError("Terlalu banyak percobaan gagal. Akun Anda sementara diblokir, coba lagi nanti atau reset password.");
          break;
        case 'auth/user-disabled':
          setError("Akun Anda telah dinonaktifkan. Silakan hubungi administrator.");
          break;
        case 'auth/network-request-failed':
          setError("Masalah koneksi. Periksa koneksi internet Anda dan coba lagi.");
          break;
        default:
          setError(`Gagal masuk: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setEmail("demo@example.com");
    setPassword("demo123456");
  };

  return (
    <ProtectedRoute authPage={true}>
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center px-4 transition-colors">
        <Head>
          <title>Login | Fin•Track</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        </Head>

        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600">
              Fin•Track
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Portfolio Dinamis Saham & Kripto</p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-200 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="mb-6">
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <input
                type="email"
                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-800 dark:text-white"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@contoh.com"
              />
            </div>

            <div className="mb-6">
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
              <input
                type="password"
                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-800 dark:text-white"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60"
            >
              {loading ? 'Memproses...' : 'Login'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Belum punya akun?{' '}
            <Link href="/register" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
              Daftar
            </Link>
          </div>

          <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
            <Link href="/reset-password" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
              Lupa Password?
            </Link>
          </div>
          
          <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Gunakan akun berikut untuk demo:</p>
            <button
              onClick={handleDemoLogin}
              className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Gunakan Akun Demo
            </button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}