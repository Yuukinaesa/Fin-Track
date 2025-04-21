// components/ProtectedRoute.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/authContext';

export default function ProtectedRoute({ children, authPage = false, dashboardPage = false }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Tambahkan timeout untuk menghindari loading tanpa batas
    const checkAuth = async () => {
      if (!loading) {
        // Jika sudah login dan membuka halaman auth
        if (authPage && user) {
          router.push('/');
          return;
        }

        // Jika belum login dan mencoba mengakses halaman yang membutuhkan otentikasi
        if (!authPage && dashboardPage && !user) {
          router.push('/login');
          return;
        }

        // Jika belum login dan mencoba mengakses halaman selain auth
        if (!authPage && !dashboardPage && !user) {
          router.push('/login');
          return;
        }

        // Jika sudah login dan mencoba mengakses halaman non-auth/non-dashboard
        if (!authPage && !dashboardPage && user) {
          router.push('/');
          return;
        }

        setIsChecking(false);
      }
    };

    checkAuth();

    // Timeout jaga-jaga jika loading terlalu lama
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.log("Auth check timed out, redirecting");
        if (authPage) {
          router.push('/');
        } else {
          router.push('/login');
        }
      }
    }, 5000); // 5 detik timeout

    return () => clearTimeout(timeoutId);
  }, [user, loading, router, authPage, dashboardPage]);

  if (loading || isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}