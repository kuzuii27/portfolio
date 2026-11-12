import type { Metadata } from 'next';
import { Bricolage_Grotesque, Figtree } from 'next/font/google';
import './globals.css';

const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const text = Figtree({ subsets: ['latin'], variable: '--font-text', display: 'swap' });

export const metadata: Metadata = {
  title: 'Kuzuii - Full-stack .NET developer',
  description:
    'Full-stack .NET developer based in the Philippines. I build small, practical apps that solve real problems.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" data-theme="dark" className={`${display.variable} ${text.variable}`}>
      <head />
      <body>
        <a className="skip" href="#top">Skip to main content</a>
        {children}</body>
    </html>
  );
}
