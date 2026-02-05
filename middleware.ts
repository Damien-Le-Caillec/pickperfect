import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Ici, on définit que tout ce qui commence par "/dashboard" est privé
const isProtectedRoute = createRouteMatcher(['/dashboard(.*)']);

export default clerkMiddleware((auth, req) => {
  // Si l'utilisateur essaie d'aller sur une route protégée sans être connecté, on bloque
  if (isProtectedRoute(req)) auth().protect();
});

export const config = {
  matcher: [
    // Ignore les fichiers internes de Next.js et les fichiers statiques
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Applique toujours le middleware aux routes API
    '/(api|trpc)(.*)',
  ],
};