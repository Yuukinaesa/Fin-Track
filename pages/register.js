// pages/register.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import Link from 'next/link';
import Head from 'next/head';
import { useTheme } from '../lib/themeContext';
import ThemeToggle from '../components/ThemeToggle';
import ProtectedRoute from '../components/ProtectedRoute';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { darkMode } = useTheme();

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Validasi password match
    if (password !== confirmPassword) {
      setError("Password tidak cocok.");
      return;
    }
    
    // Validasi kekuatan password
    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Buat user baru
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Buat dokumen user di Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        createdAt: new Date().toISOString(),
        assets: {
          stocks: [],
          crypto: []
        }
      });
      
      router.push('/');
    } catch (error) {
      console.error("Error signing up:", error);
      if (error.code === 'auth/email-already-in-use') {
        setError("Email sudah digunakan. Gunakan email lain atau login.");
      } else if (error.code === 'auth/invalid-email') {
        setError("Format email tidak valid.");
      } else if (error.code === 'auth/weak-password') {
        setError("Password terlalu lemah. Gunakan minimal 6 karakter.");
      } else {
        setError("Pendaftaran gagal. Silakan coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAccount = () => {
    setEmail("demo@example.com");
    setPassword("demo123456");
    setConfirmPassword("demo123456");
  };

  return (
    <ProtectedRoute authPage={true}>
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center px-4 transition-colors">
        <Head>
          <title>Daftar | Fin•Track</title>
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
            <p className="text-gray-500 dark:text-gray-400 mt-2">Daftar Akun Baru</p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-200 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
            )}

            <form onSubmit={handleRegister}>
              <div className="mb-4">
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
  
              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                <input
                  type="password"
                  className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-800 dark:text-white"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Minimal 6 karakter</p>
              </div>
  
              <div className="mb-6">
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Konfirmasi Password</label>
                <input
                  type="password"
                  className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-800 dark:text-white"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Masukkan password yang sama"
                />
              </div>
  
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-60"
              >
                {loading ? 'Memproses...' : 'Daftar'}
              </button>
            </form>
  
            <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Sudah punya akun?{' '}
              <Link href="/login" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
                Login
              </Link>
            </div>
  
            <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Apakah ingin membuat akun demo untuk pengujian?</p>
              <button
                type="button"
                onClick={handleDemoAccount}
                className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Buat Akun Demo
              </button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }