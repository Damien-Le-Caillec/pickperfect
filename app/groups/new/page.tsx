'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from 'next/link'
import PageLayout from "@/components/layout/PageLayout"

export default function NewGroupPage() {
    const router = useRouter()
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const res = await fetch('/api/groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description: description || undefined }),
        })
        const data = await res.json()
        setLoading(false)

        if (!res.ok) { setError(data.error); return }
        router.push(`groups/${data.id}`)
    }

    return (
        <PageLayout>
            <div style={{ maxWidth: 560, margin: '0 auto', padding: '2rem 1.5rem' }}>
                <Link href="/groups" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-3)', fontSize: '0.875rem', marginBottom: '1.5rem', textDecoration: 'none' }}>
                    <i className="fas fa-arrow-left" /> Mes groupes
                </Link>

                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Nouveau groupe</h1>
                <p style={{ color: 'var(--text-2)', marginBottom: '2rem' }}>
                Créez un groupe pour partager vos listes avec plusieurs proches en une fois.
                </p>

                <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {error && <div className="alert alert-error"><i className="fas fa-exclamation-circle" /> {error}</div>}

                <div className="form-group">
                    <label className="label" htmlFor="name">Nom du groupe *</label>
                    <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="La famille, Les copains du lycée…" required maxLength={60} />
                </div>

                <div className="form-group">
                    <label className="label" htmlFor="desc">Description <span className="form-hint">(optionnel)</span></label>
                    <textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} rows={3} maxLength={300} />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <Link href="/groups" className="btn btn-secondary">Annuler</Link>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? <><span className="spinner" /> Création…</> : <><i className="fas fa-check" /> Créer</>}
                    </button>
                </div>
                </form>
            </div>
        </PageLayout>
    )
}