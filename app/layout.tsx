import { ClerkProvider, SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import './globals.css'
import type { Metadata } from 'next'
import { config } from '@fortawesome/fontawesome-svg-core'
import '@fortawesome/fontawesome-svg-core/styles.css'
config.autoAddCss = false;

export const metadata: Metadata = {
  title: 'PickPerfect',
  description: 'Gérez vos listes de cadeaux intelligemment',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="fr">
        <body className="min-h-screen bg-white text-slate-900 font-sans antialiased">
          
          <header className="flex justify-between items-center p-4 border-b border-slate-200 bg-white sticky top-0 z-50">
            <div className="font-black text-xl text-indigo-600 tracking-tight">
              PickPerfect
            </div>

            <div className="flex items-center gap-4">
              
              <SignedOut>
                <div className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">
                  <SignInButton mode="modal">
                    <button>Se connecter</button>
                  </SignInButton>
                </div>
              </SignedOut>

              <SignedIn>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>

            </div>
          </header>

          <main>
            {children}
          </main>

        </body>
      </html>
    </ClerkProvider>
  )
};