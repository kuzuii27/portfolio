import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kuzuii - Full-stack .NET developer',
  description:
    'Full-stack .NET developer based in the Philippines. I build small, practical apps that solve real problems.',
};

// Runs before paint so the saved or system theme never flashes.
const themeInit = `try{var t=localStorage.getItem('theme');document.documentElement.dataset.theme=t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch(e){document.documentElement.dataset.theme='light'}`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
