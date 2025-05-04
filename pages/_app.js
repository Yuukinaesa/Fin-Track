// pages/_app.js
import '../styles/globals.css';
import { AuthProvider } from '../lib/authContext';
import { ThemeProvider } from '../lib/themeContext';
import Head from 'next/head';

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </Head>
        <Component {...pageProps} />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default MyApp;