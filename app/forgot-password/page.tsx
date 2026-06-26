'use client'

import { useState } from "react";
import Link from 'next/link'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const res = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        })

        setLoading(false)

        if (!res.ok) {
            const d = await res.json()
            setError(d.error)
            return
        }

        setSubmitted(true)
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
                {/* Logo */}
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-2)', textDecoration: 'none', marginBottom: 'var(--s-8)' }}>
                    <div style={{ width: 36, height: 36, background: 'linear-grandient(135deg,var(--peach),var(--lavender))', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1rem' }}>
                        <i className="fas fa-gift" />
                    </div>
                    <span style={{ fontSize: '1.2rem', fontWeight: 800, background: 'linear-gradient(135deg,var(--peach),var(--lavender))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        PickPerfect
                    </span>
                </Link>

                {submitted ? (
                    /* Etat après envoi */
                    <>
                        <div style={{ textAlign: 'center', marginBottom: 'var(--s-6)' }}>
                            <div style={{ fontSize: '3rem', marginBottom: 'var(--s-4)' }}>
                                <i className="fas fa-envelope" style={{ color: 'var(--peach)' }} />
                            </div>
                            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 'var(--s-3)' }}>
                                Email envoyé !
                            </h1>
                            <p style={{ color: 'var(--text-2)', lineHeight: 1.65, fontSize: '0.925rem' }}>
                                Si l'adresse <strong>{email}</strong> est associée à un compte,
                                vous recevrez un lien de réinitialisation dans quelques minutes.
                                Vérifiez vos spams.
                            </p>
                        </div>
                        <Link href="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                            <i className="fas fa-arrow-left" /> Retour à la connexion
                        </Link>
                    </>
                ) : (
                    /* Formulaire */
                    <>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 'var(--s-2)' }}>
                            Mot de passe oublié
                        </h1>
                        <p style={{ color: 'var(--text-2)', marginBottom: 'var(--s-6)', fontSize: '0.925rem' }}>
                            Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
                        </p>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
                            {error && (
                                <div className="alert alert-error">
                                    <i className="fas fa-exclamation-circle" /> {error}
                                </div>
                            )}

                            <div className="form-group">
                                <label className="label" htmlFor="email">Adresse email</label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="vous@exemple.com"
                                    required
                                    autoComplete="email"
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
                                    ? <><span className="spinner" /> Envoi en cours...</>
                                    : <><i className="fas fa-paper-plane" /> Envoyer le lien</>
                                }
                            </button>
                        </form>

                        <p style={{ textAlign: 'center', marginTop: 'var(--s-5)', fontSize: '0.875rem', color: 'var(--text-2)' }}>
                            <Link href="/login">
                                <i className="fas fa-arrow-left" style={{ marginRight: 6 }} />
                                Retour à la connexion
                            </Link>
                        </p>
                    </>
                )}
            </div>
        </div>
    )
}