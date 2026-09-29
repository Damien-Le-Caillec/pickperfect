'use client'

import { useEffect, useState } from 'react'

// Bandeau affiché tant que l'adresse email n'est pas confirmée
export default function EmailVerifyBanner() {
    const [show,    setShow]    = useState(false)
    const [sending, setSending] = useState(false)
    const [msg,     setMsg]     = useState('')
    const [notice,  setNotice]  = useState<'ok' | 'invalid' | null>(null)

    useEffect(() => {
        const verified = new URLSearchParams(window.location.search).get('verified')
        if (verified === 'ok' || verified === 'invalid') setNotice(verified)

        fetch('/api/auth/me')
            .then(r => (r.ok ? r.json() : null))
            .then(d => { if (d?.success && d.user && !d.user.emailVerified) setShow(true) })
            .catch(() => {})
    }, [])

    const resend = async () => {
        setSending(true)
        const res  = await fetch('/api/auth/verify-email', { method: 'POST' })
        const data = await res.json().catch(() => ({}))
        setSending(false)
        setMsg(res.ok ? 'Email envoyé ! Pensez à vérifier vos spams.' : data.error ?? 'Erreur')
    }

    if (notice === 'ok') {
        return (
            <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
                <i className="fas fa-check-circle" /> Adresse email confirmée, merci !
            </div>
        )
    }

    if (!show) return null

    return (
        <div className="alert alert-warning" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <i className="fas fa-envelope" />
            <span style={{ flex: 1, minWidth: 200 }}>
                {notice === 'invalid'
                    ? 'Ce lien de confirmation est invalide ou expiré.'
                    : 'Confirmez votre adresse email pour sécuriser votre compte.'}
                {msg && <> — {msg}</>}
            </span>
            <button className="btn btn-secondary btn-sm" onClick={resend} disabled={sending}>
                {sending ? <span className="spinner" /> : 'Renvoyer le lien'}
            </button>
        </div>
    )
}
