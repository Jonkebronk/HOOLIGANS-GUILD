import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { SessionProvider } from '@/components/providers/session-provider';
import { TeamProvider } from '@/components/providers/team-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HOOLIGANS Guild',
  description: 'Guild Management Platform for HOOLIGANS',
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
            __html: `const whTooltips = {colorLinks: true, iconizeLinks: true, iconSize: 'medium', renameLinks: false, hide: {droppedby: true, sellprice: true}};`,
          }}
        />
        <script src="https://wow.zamimg.com/js/tooltips.js" />
      </head>
      <body className={inter.className}>
        <SessionProvider>
          <TeamProvider>
            {children}
            <Toaster />
          </TeamProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
