import Link from 'next/link';
import './globals.css';
import SettingsBar from '../components/SettingsBar';

export const metadata = {
  metadataBase: new URL('https://calcpro.example.com'),
  title: {
    default: 'CalcPro — 566+ Free Online Calculators (Next.js)',
    template: '%s | CalcPro',
  },
  description:
    'Free advanced online calculators for finance, health, math, science, business and more — with step-by-step solutions and charts. Powered by Next.js.',
  keywords: ['calculator', 'free calculators', 'loan calculator', 'bmi calculator', 'unit converter'],
  openGraph: {
    title: 'CalcPro — Free Online Calculators',
    description: '566+ free calculators with step-by-step solutions.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-display text-lg font-extrabold text-primary">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm text-white">🧮</span>
              CalcPro
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">Next</span>
            </Link>
            <div className="flex items-center gap-4 text-sm font-semibold text-slate-600">
              <Link href="/" className="hidden transition hover:text-primary sm:block">Home</Link>
              <Link href="/finance" className="hidden transition hover:text-primary sm:block">Finance</Link>
              <Link href="/business" className="hidden transition hover:text-primary sm:block">Business</Link>
              <Link href="/career" className="hidden transition hover:text-primary sm:block">Career</Link>
              <SettingsBar />
            </div>
          </nav>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
          {children}
        </main>

        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-6 text-center text-xs text-slate-400">
            <p>CalcPro Next — 566+ free calculators. All calculations run in your browser.</p>
            <p className="mt-1">Built with Next.js, React, Tailwind CSS.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
