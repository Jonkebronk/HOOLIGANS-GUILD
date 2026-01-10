import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { SessionProvider } from '@/components/providers/session-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HOOLIGANS Guild - Loot Council',
  description: 'Loot Council Management Platform for HOOLIGANS Guild',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `const whTooltips = {colorLinks: true, iconizeLinks: true, renameLinks: false, dataEnv: 5};`,
          }}
        />
        <script src="https://wow.zamimg.com/js/tooltips.js" />
      </head>
      <body className={inter.className}>
        <SessionProvider>
          {children}
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
