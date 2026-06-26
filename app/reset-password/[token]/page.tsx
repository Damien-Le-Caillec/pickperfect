'use client'

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
    const params = useParams()
    const router = useRouter()
    const token = params.token as string

    const [valid, setValid] = useState<boolean | null>(null)
    const [password, setPassword] = useState('')
    const [password2, setPassword2] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    // Vérifier la validité du token
    useEffect(() => {
        fetch(`/api/auth/reset-password?token=${token}`)
            .then(r => r.json())
            .then(d => setValid(d.valid))
    }, [token])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (password !== password2) {
            setError('Les mots de passe ne correspondent pas')
            return
        }
        if (password.length < 12) {
            setError('Minimum 12 caractères')
            return
        }

        setLoading(true)

        const res = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, password }),
        })

        const data = await res.json()
        setLoading(false)

        if (!res.ok) { setError(data.error); return }

        setSuccess(true)
        setTimeout(() => router.push('/login'), 3000)
    }

    // Token en cours de vérification
    if (valid === null) {
        return (
           <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text-3)' }}>
                <span className="spinner" /> Vérification du lien...
            </div> 
        )
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg)',
            padding: 'var(--s-6)',
        }}>
            <div className="card" style={{ maxWidth: 440, width: '100%', padding: 'var(--s-10)' }}>
                {/* Token invalide */}
                {!valid ? (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: 'var(--s-4)', color: 'var(--error)' }}>
                            <i className="fas fa-times-circle" />
                        </div>
                        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 'var(--s-3)' }}>
                            Lien invalide ou expiré
                        </h1>
                        <p style={{ color: 'var(--text-2)', marginBottom: 'var(--s-6)', lineHeight: 1.65 }}>
                            Ce lien de réinitialisation a expiré ou a déjà été utilisé.
                            Faites une nouvelle demande.
                        </p>
                        <Link href="/forgot-password" className="btn btn-primary" style={{ justifyContent: 'center', width: '100%' }}>
                            Nouvelle demande
                        </Link>
                    </div>

                /* Succès */
                ) : success ? (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: 'var(--s-4)', color: 'var(--success)' }}>
                            <i className="fas fa-check-circle" />
                        </div>
                        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 'var(--s-3)' }}>
                            Mot de passe modifié !
                        </h1>
                        <p style={{ color: 'var(--text-2)', lineHeight: 1.65 }}>
                            Vous allez être redirigé vers la page de connexion...
                        </p>
                    </div>

                /* Formulaire */
                ) : (
                    <>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 'var(--s-2)' }}>
                            Nouveau mot de passe
                        </h1>
                        <p style={{ color: 'var(--text-2)', marginBottom: 'var(--s-6)', fontSize: '0.925rem' }}>
                            Choisissez un mot de passe sécurisé d'au moins 12 caractères.
                        </p>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
                            {error && (
                                <div className="alert alert-error">
                                    <i className="fas fa-exclamation-circle" /> {error}
                                </div>
                            )}

                            <div className="form-group">
                                <label className="label" htmlFor="pwd">Nouveau mot de passe</label>
                                <input
                                    id="pwd"
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Minimum 12 caractères"
                                    required
                                    minLength={12}
                                    autoComplete="new-password"
                                    disabled={loading}
                                />
                            </div>

                            <div className="form-group">
                                <label className="label" htmlFor="pwd2">Confirmer</label>
                                <input
                                    id="pwd2"
                                    type="password"
                                    value={password2}
                                    onChange={e => setPassword2(e.target.value)}
                                    placeholder="Répétez le mot de passe"
                                    required
                                    autoComplete="new-password"
                                    disabled={loading}
                                />
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{ justifyContent: 'center' }}
                                disabled={loading}
                            >
                                {loading
                                    ? <><span className="spinner" /> Enregistrement...</>
                                    : <><i className="fas fa-lock" /> Enregistrer le mot de passe</>
                                }
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    )
}