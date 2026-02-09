import { SignInButton, SignUpButton, SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      
      <section className="relative overflow-hidden bg-slate-900 text-white pt-20 pb-32">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-900 to-slate-900 z-0" />
        
        <div className="container mx-auto px-6 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-fade-in-up">
            <h1 className="text-5xl lg:text-7xl font-black tracking-tight leading-tight">
              Offrez <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">parfaitement</span>,<br />
              à chaque fois.
            </h1>
            <p className="text-xl text-slate-300 max-w-lg leading-relaxed">
              Fini les cadeaux gênants et les doublons. Créez vos listes, partagez-les et laissez notre IA trouver les meilleures idées pour vos proches.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <SignedOut>
                <SignUpButton mode="modal">
                  <button className="px-8 py-4 bg-indigo-500 hover:bg-indigo-400 text-white rounded-full font-bold text-lg transition-all transform hover:scale-105 shadow-lg shadow-indigo-500/25">
                    Commencer gratuitement
                  </button>
                </SignUpButton>
                <SignInButton mode="modal">
                  <button className="px-8 py-4 bg-transparent border border-slate-600 hover:border-white text-white rounded-full font-bold text-lg transition-all">
                    Se connecter
                  </button>
                </SignInButton>
              </SignedOut>

              <SignedIn>
                <Link 
                  href="/home" 
                  className="px-8 py-4 bg-white text-indigo-900 rounded-full font-bold text-lg hover:bg-indigo-50 transition-all shadow-xl flex items-center gap-2"
                >
                  Accéder à mes listes
                </Link>
              </SignedIn>
            </div>
            
            <p className="text-sm text-slate-400 flex items-center gap-2">
              Pas de carte bancaire requise &nbsp; • &nbsp;  100% Gratuit
            </p>
          </div>

          <div className="relative h-[500px] w-full hidden lg:block rounded-3xl overflow-hidden shadow-2xl border border-slate-700 transform rotate-2 hover:rotate-0 transition-all duration-500">
             <div className="absolute inset-0 bg-slate-800 flex items-center justify-center text-slate-500">
                <Image src="/hero-gift.jpg" alt="Joie d'offrir" fill className="object-cover" />
             </div>
          </div>
        </div>
      </section>


      <section className="py-24 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Pourquoi tout le monde adore PickPerfect ?</h2>
            <p className="text-slate-600 text-lg">Nous avons repensé la liste de cadeaux pour la rendre intelligente et sociale.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all border border-slate-100">
              <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center text-3xl mb-6">🧠</div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Suggestions IA</h3>
              <p className="text-slate-500 leading-relaxed">
                En panne d'inspiration ? Notre IA analyse les goûts de vos amis pour vous proposer le cadeau idéal en 2 secondes.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all border border-slate-100">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center text-3xl mb-6">📉</div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Alerte Prix</h3>
              <p className="text-slate-500 leading-relaxed">
                Ajoutez un produit. Si son prix baisse sur Amazon ou ailleurs, on vous prévient immédiatement.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all border border-slate-100">
              <div className="w-14 h-14 bg-pink-100 rounded-xl flex items-center justify-center text-3xl mb-6">🔒</div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Surprise Gardée</h3>
              <p className="text-slate-500 leading-relaxed">
                Réservez un cadeau sur la liste d'un ami sans qu'il ne le sache. Fini les doublons, vive la surprise.
              </p>
            </div>
          </div>
        </div>
      </section>


      <section className="py-24 bg-white overflow-hidden">
        <div className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="relative h-[400px] rounded-3xl overflow-hidden shadow-2xl">
             <div className="absolute inset-0 bg-slate-100 flex items-center justify-center text-slate-400">
                <Image src="/community.jpg" alt="Amis réunis" fill className="object-cover" />
             </div>
          </div>
          
          <div className="space-y-6">
            <h2 className="text-4xl font-bold text-slate-900">
              Rejoignez les <span className="text-indigo-600">pros du cadeau</span>.
            </h2>
            <p className="text-lg text-slate-600">
              Que ce soit pour Noël, un anniversaire ou une naissance, centralisez toutes vos envies au même endroit. Vos proches vous remercieront (et votre portefeuille aussi).
            </p>
            <ul className="space-y-4 pt-4">
              {['Partage facile via WhatsApp', 'Gestion de cagnottes (bientôt)', 'Disponible sur mobile et desktop'].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                  <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="container mx-auto px-6 text-center">
          <p className="mb-4 text-white font-bold text-xl">PickPerfect 🎁</p>
          <p>&copy; 2024 PickPerfect. Fait avec ❤️ pour les fêtes.</p>
        </div>
      </footer>
    </div>
  );
}