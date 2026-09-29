// Couleurs de profil partagées entre l'éditeur (/profile) et le profil public (/profile/[id]).
// premium: true → nécessite la récompense "Thème coloré" (r1)

export interface AccentColor { id: string; label: string; color: string; premium?: boolean }
export interface BannerColor { id: string; label: string; value: string; premium?: boolean }

export const ACCENT_COLORS: AccentColor[] = [
  { id: 'peach',    label: 'Pêche',    color: '#FF7B6B' },
  { id: 'lavender', label: 'Lavande',  color: '#A78BFA' },
  { id: 'mint',     label: 'Menthe',   color: '#34D399' },
  { id: 'gold',     label: 'Or',       color: '#FBBF24' },
  { id: 'rose',     label: 'Rose',     color: '#F472B6', premium: true },
  { id: 'sky',      label: 'Ciel',     color: '#0EA5E9', premium: true },
  { id: 'violet',   label: 'Violet',   color: '#7C3AED', premium: true },
  { id: 'ruby',     label: 'Rubis',    color: '#E11D48', premium: true },
]

export const BANNER_COLORS: BannerColor[] = [
  { id: 'sunset',     label: 'Coucher de soleil', value: 'linear-gradient(135deg,#FF7B6B,#FF9A5C,#A78BFA)' },
  { id: 'aurora',     label: 'Aurora',            value: 'linear-gradient(135deg,#34D399,#059669,#A78BFA)' },
  { id: 'fire',       label: 'Feu',               value: 'linear-gradient(135deg,#FBBF24,#F97316,#EF4444)' },
  { id: 'night',      label: 'Nuit étoilée',      value: 'linear-gradient(135deg,#0F0C29,#302B63,#24243E)' },
  { id: 'ocean',      label: 'Océan',             value: 'linear-gradient(135deg,#0EA5E9,#0284C7,#34D399)' },
  { id: 'rose',       label: 'Rose bonbon',       value: 'linear-gradient(135deg,#FDA4AF,#FB7185,#A78BFA)' },
  { id: 'forest',     label: 'Forêt',             value: 'linear-gradient(135deg,#166534,#15803D,#4ADE80)' },
  { id: 'candy',      label: 'Candy',             value: 'linear-gradient(135deg,#F0ABFC,#E879F9,#818CF8)' },
  { id: 'gold',       label: 'Or',                value: 'linear-gradient(135deg,#FBBF24,#D97706,#92400E)' },
  { id: 'ice',        label: 'Glace',             value: 'linear-gradient(135deg,#BAE6FD,#7DD3FC,#A5B4FC)' },
  { id: 'lava',       label: 'Lave',              value: 'linear-gradient(135deg,#7C3AED,#DB2777,#F97316)' },
  { id: 'midnight',   label: 'Minuit',            value: 'linear-gradient(135deg,#1E1B4B,#4C1D95,#2563EB)' },
  { id: 'galaxy',     label: 'Galaxie',           value: 'linear-gradient(135deg,#0F0C29,#7C3AED,#EC4899,#FBBF24)', premium: true },
  { id: 'holo',       label: 'Holographique',     value: 'linear-gradient(135deg,#A5F3FC,#C4B5FD,#FBCFE8,#FDE68A)', premium: true },
  { id: 'royal',      label: 'Royal',             value: 'linear-gradient(135deg,#1E3A8A,#6D28D9,#D4AF37)', premium: true },
  { id: 'emerald',    label: 'Émeraude',          value: 'linear-gradient(135deg,#064E3B,#10B981,#D1FAE5)', premium: true },
]

// Anciennes valeurs encore présentes en base (valeur par défaut du schéma)
const LEGACY_BANNERS: Record<string, string> = {
  'gradient-peach-lavender': 'linear-gradient(135deg,#FF7B6B,#A78BFA)',
  'gradient-mint-lavender':  'linear-gradient(135deg,#34D399,#A78BFA)',
  'gradient-gold-peach':     'linear-gradient(135deg,#FBBF24,#FF7B6B)',
  'gradient-dark':           'linear-gradient(135deg,#1C1917,#3B3240)',
  'gradient-ocean':          'linear-gradient(135deg,#0EA5E9,#34D399)',
}

export function getBannerValue(id?: string | null): string {
  if (!id) return LEGACY_BANNERS['gradient-peach-lavender']
  return BANNER_COLORS.find(b => b.id === id)?.value
    ?? LEGACY_BANNERS[id]
    ?? LEGACY_BANNERS['gradient-peach-lavender']
}

export function getAccentColor(id?: string | null): string {
  return ACCENT_COLORS.find(a => a.id === id)?.color ?? '#FF7B6B'
}

// Une couleur est-elle autorisée pour cet utilisateur ?
export function isAccentAllowed(id: string, hasPremiumTheme: boolean): boolean {
  const c = ACCENT_COLORS.find(a => a.id === id)
  return !!c && (!c.premium || hasPremiumTheme)
}

export function isBannerAllowed(id: string, hasPremiumTheme: boolean): boolean {
  if (id in LEGACY_BANNERS) return true
  const b = BANNER_COLORS.find(x => x.id === id)
  return !!b && (!b.premium || hasPremiumTheme)
}
