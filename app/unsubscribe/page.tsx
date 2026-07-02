'use client'

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import PageLayout from "@/components/layout/PageLayout"

function UnsubscribeContent() {
    const searchParams = useSearchParams()
    const token = searchParams.get('token')
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

    useEffect(() => {
        if (!token) { setStatus('error'); return }

        fetch('/api/unsubscribe', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
        }).then(r => setStatus(r.ok ? 'success' : 'error'))
    }, [token])

    return (
        <PageLayout>
            <div style={{ maxWidth: 400, margin: '6rem auto', padding: '2rem', textAlign: 'center' }}>
                {status === 'loading' && <span className="spinner" />}
                {status === 'success' && (
                    <>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                        <h1 style={{ fontWeight: 800, marginBottom: '0.75rem' }}>Désinscription confirmée</h1>
                        <p style={{ color: 'var(--text-3)', marginBottom: '1.5rem' }}>
                            Vous ne recevrez plus d'emails de rappel de PickPerfect.
                            vous pouvez réactiver les emails depuis votre profil.
                        </p>
                        <Link href="/profile" className="btn btn-primary">Mon profil</Link>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
                        <h1 style={{ fontWeight: 800, marginBottom: '0.75rem' }}>Lien invalide</h1>
                        <p style={{ color: 'var(--text-3)', marginBottom: '1.5rem' }}>
                            Ce lien de désinscription est invalide ou expiré.
                        </p>
                        <Link href="/profile" className="btn btn-primary">Mon profil</Link>
                    </>
                )}
            </div>
        </PageLayout>
    )
}

export default function UnsubscribePage() {
    return (
        <Suspense>
            <UnsubscribeContent />
        </Suspense>
    )
}