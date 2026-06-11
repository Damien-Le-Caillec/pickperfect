'use client'

export default function GlobalError({
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <html lang="fr">
      <body style={{
        margin: 0,
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        background: '#FAFAF9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '1.5rem',
      }}>
        <div style={{
          background: 'white',
          border: '1px solid #E2E8F0',
          borderRadius: 24,
          padding: '3rem 2.5rem',
          textAlign: 'center',
          maxWidth: 420,
          width: '100%',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.75rem' }}>
            Erreur critique
          </h1>
          <p style={{ color: '#718096', marginBottom: '2rem', lineHeight: 1.65 }}>
            Une erreur inattendue s'est produite.
          </p>
          <button
            onClick={reset}
            style={{
              background: 'linear-gradient(135deg, #FF9A8B, #E8826F)',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              padding: '0.75rem 2rem',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  )
}