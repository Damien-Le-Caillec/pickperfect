'use server'

import { z }        from 'zod'
import { cookies }  from 'next/headers'
import { redirect } from 'next/navigation'
import {
  createUser,
  validateUser,
  createSession,
  deleteSession,
} from './sqlite-auth'

// ---- Schémas de validation ----
const RegisterSchema = z.object({
  email:    z.string().email('Adresse email invalide'),
  password: z.string().min(8, 'Minimum 8 caractères'),
  name:     z.string().min(2, 'Minimum 2 caractères').optional(),
})

const LoginSchema = z.object({
  email:    z.string().email('Adresse email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

// ---- Helpers ----
async function setSessionCookie(sessionId: string, expiresAt: Date) {
  const cookieStore = await cookies()
  cookieStore.set('auth_session', sessionId, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires:  expiresAt,
    path:     '/',
  })
}

// ---- Action : Inscription ----
export async function registerAction(
  _prevState: unknown,
  formData: FormData
) {
  const raw = {
    email:    formData.get('email')    as string,
    password: formData.get('password') as string,
    name:     (formData.get('name')    as string) || undefined,
  }

  const parsed = RegisterSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  try {
    const user    = await createUser(
      parsed.data.email,
      parsed.data.password,
      parsed.data.name
    )
    const session = await createSession(user.id)
    await setSessionCookie(session.id, session.expiresAt)
  } catch (err: any) {
    return { error: err.message || "Erreur lors de l'inscription" }
  }

  redirect('/dashboard')
}

// ---- Action : Connexion ----
export async function loginAction(
  _prevState: unknown,
  formData: FormData
) {
  const raw = {
    email:    formData.get('email')    as string,
    password: formData.get('password') as string,
  }

  const parsed = LoginSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const user = await validateUser(parsed.data.email, parsed.data.password)
  if (!user) {
    return { error: 'Email ou mot de passe incorrect' }
  }

  const session = await createSession(user.id)
  await setSessionCookie(session.id, session.expiresAt)

  redirect('/dashboard')
}

// ---- Action : Déconnexion ----
export async function logoutAction() {
  const cookieStore = await cookies()
  const sessionId   = cookieStore.get('auth_session')?.value

  if (sessionId) {
    await deleteSession(sessionId)
    cookieStore.delete('auth_session')
  }

  redirect('/')
}