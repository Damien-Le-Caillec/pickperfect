import type { Metadata } from "next";
import { Inter } from 'next/font/google'
import '@fortawesome/fontawesome-free/css/all.min.css'
import './globals.css'
import FeedbackButton from "@/components/layout/FeedbackButton";

export const metadata: Metadata = {
  title: { default: 'PickPerfect', template: '%s | PickPerfect' },
  description:
    'La plateforme de social gifting - créez vos listes, invitez vos proches, évitez les doublons.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  ),
  openGraph: {
    type:     'website',
    locale:   'fr_FR',
    siteName: 'PickPerfect',
  },
}

// Police auto-hébergée par Next (aucune requête vers Google côté visiteur)
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" data-theme="light" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              const saved = localStorage.getItem('pickperfect-theme');
              // Dark par défaut si aucune préférence sauvegardée
              const theme = saved || 'dark';
              document.documentElement.setAttribute('data-theme', theme);
            })();
          `
        }} />
      </head>
      <body>
        {children}
        <FeedbackButton />
      </body>
    </html>
  )
}