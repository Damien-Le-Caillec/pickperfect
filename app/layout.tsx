import { ClerkProvider, SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import './globals.css'
import type { Metadata } from 'next'

// Configuration du référencement (SEO)
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
    // 1. On enveloppe toute l'application avec ClerkProvider
    <ClerkProvider>
      <html lang="fr">
        <body className="min-h-screen bg-white text-slate-900 font-sans antialiased">
          
          {/* 2. Le Header (Visible sur toutes les pages) */}
          <header className="flex justify-between items-center p-4 border-b border-slate-200 bg-white sticky top-0 z-50">
            {/* Logo à gauche */}
            <div className="font-black text-xl text-indigo-600 tracking-tight">
              PickPerfect
            </div>

            {/* Boutons à droite */}
            <div className="flex items-center gap-4">
              
              {/* Visible uniquement si DÉCONNECTÉ */}
              <SignedOut>
                <div className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">
                  <SignInButton mode="modal">
                    <button>Se connecter</button>
                  </SignInButton>
                </div>
              </SignedOut>

              {/* Visible uniquement si CONNECTÉ */}
              <SignedIn>
                {/* La petite pastille avec l'avatar de l'utilisateur */}
                <UserButton afterSignOutUrl="/" />
              </SignedIn>

            </div>
          </header>

          {/* 3. Le contenu de la page (Dashboard, Accueil, etc.) s'affiche ici */}
          <main>
            {children}
          </main>

        </body>
      </html>
    </ClerkProvider>
  )
};