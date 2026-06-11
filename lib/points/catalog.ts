// ---- RÉCOMPENSES ----
export const REWARDS = [
  // Numériques
  { id: 'r1',  cost: 50,    category: 'digital',   icon: 'fa-palette',       name: 'Thème coloré',          desc: 'Couleur personnalisée pour votre profil' },
  { id: 'r2',  cost: 100,   category: 'digital',   icon: 'fa-medal',         name: 'Badge exclusif',        desc: 'Badge visible sur votre profil' },
  { id: 'r3',  cost: 200,   category: 'digital',   icon: 'fa-star',          name: 'Étoile premium',        desc: 'Icône étoile à côté de votre nom' },
  // Privilèges
  { id: 'r4',  cost: 500,   category: 'privilege', icon: 'fa-infinity',      name: 'Listes illimitées',     desc: 'Créez autant de listes privées que vous voulez' },
  { id: 'r5',  cost: 750,   category: 'privilege', icon: 'fa-chart-bar',     name: 'Analytics avancées',   desc: 'Stats détaillées sur vos listes' },
  { id: 'r6',  cost: 1000,  category: 'privilege', icon: 'fa-qrcode',        name: 'QR code personnalisé', desc: 'QR code unique pour partager vos listes' },
  { id: 'r7',  cost: 1500,  category: 'privilege', icon: 'fa-crown',         name: 'Profil premium',       desc: 'Design premium pour votre page profil' },
  { id: 'r8',  cost: 2000,  category: 'privilege', icon: 'fa-flask',         name: 'Accès bêta',           desc: 'Nouvelles fonctionnalités en avant-première' },
  // Cashback
  { id: 'r9',  cost: 2500,  category: 'cashback',  icon: 'fa-percent',       name: '5% cashback',          desc: '5% de cashback sur votre prochain achat' },
  { id: 'r10', cost: 5000,  category: 'cashback',  icon: 'fa-ticket-alt',    name: 'Abonnement 1 an',      desc: 'Premium gratuit pendant 1 an' },
  { id: 'r11', cost: 10000, category: 'physical',  icon: 'fa-gift',          name: 'Cadeau physique',      desc: 'Cadeau PickPerfect livré chez vous' },
] as const

export type Reward = typeof REWARDS[number]

// ---- BADGES ----
// condition : champs de Points à vérifier pour débloquer
export const BADGES_CONFIG = [
  {
    id:        'first_step',
    name:      'Premier pas',
    desc:      'Bienvenue sur PickPerfect',
    icon:      'fa-door-open',
    color:     '#A2E4B8',
    condition: (_: any) => true, // Donné à l'inscription
  },
  {
    id:        'first_reservation',
    name:      'Généreux',
    desc:      'Première réservation effectuée',
    icon:      'fa-hand-holding-heart',
    color:     '#FF9A8B',
    condition: (p: any) => (p?.totalPoints ?? 0) >= 5,
  },
  {
    id:        'bronze',
    name:      'Bronze',
    desc:      '100 points gagnés',
    icon:      'fa-award',
    color:     '#CD7F32',
    condition: (p: any) => (p?.totalPoints ?? 0) >= 100,
  },
  {
    id:        'silver',
    name:      'Argent',
    desc:      '500 points gagnés',
    icon:      'fa-award',
    color:     '#C0C0C0',
    condition: (p: any) => (p?.totalPoints ?? 0) >= 500,
  },
  {
    id:        'gold',
    name:      'Or',
    desc:      '1000 points gagnés',
    icon:      'fa-award',
    color:     '#FFD166',
    condition: (p: any) => (p?.totalPoints ?? 0) >= 1000,
  },
  {
    id:        'sharer',
    name:      'Communicant',
    desc:      'Première liste partagée',
    icon:      'fa-share-alt',
    color:     '#C5B3E6',
    condition: (p: any) => (p?.totalPoints ?? 0) >= 10,
  },
  {
    id:        'level5',
    name:      'Niveau 5',
    desc:      'Atteindre le niveau 5',
    icon:      'fa-star',
    color:     '#60A5FA',
    condition: (p: any) => (p?.level ?? 1) >= 5,
  },
  {
    id:        'level10',
    name:      'Niveau 10',
    desc:      'Atteindre le niveau 10',
    icon:      'fa-star',
    color:     '#F59E0B',
    condition: (p: any) => (p?.level ?? 1) >= 10,
  },
] as const

export type BadgeConfig = typeof BADGES_CONFIG[number]

// ---- LABELS DES ACTIONS ----
export const ACTION_LABELS: Record<string, string> = {
  item_reservation:      'Réservation d\'un cadeau',
  list_share:            'Partage d\'une liste',
  daily_login:           'Connexion quotidienne',
  list_created:          'Création d\'une liste',
  affiliate_purchase:    'Achat via lien affilié',
  badge_earned:          'Badge débloqué',
  reward_redeemed:       'Récompense échangée',
}