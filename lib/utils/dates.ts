// Nombre de jours (arrondi au supérieur) entre maintenant et une date
export function daysUntil(date: string | Date): number {
    return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
}
