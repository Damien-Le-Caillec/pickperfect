export const OCCASIONS: Record<string, { label: string; avgPrice: number; icon: string }> = {
  anniversaire:   { label: 'Anniversaire',      avgPrice: 40,  icon: 'fa-birthday-cake' },
  noel:           { label: 'Noël',              avgPrice: 50,  icon: 'fa-snowflake'     },
  mariage:        { label: 'Mariage',           avgPrice: 100, icon: 'fa-rings-wedding' },
  naissance:      { label: 'Naissance',         avgPrice: 50,  icon: 'fa-baby'          },
  saint_valentin: { label: 'Saint-Valentin',    avgPrice: 40,  icon: 'fa-heart'         },
  fete_parents:   { label: 'Fête des parents',  avgPrice: 35,  icon: 'fa-star'          },
  diplome:        { label: 'Diplôme',           avgPrice: 60,  icon: 'fa-graduation-cap'},
  cremaillere:    { label: 'Crémaillère',       avgPrice: 40,  icon: 'fa-home'          },
  secret_santa:   { label: 'Secret Santa',      avgPrice: 20,  icon: 'fa-hat-santa'     },
}