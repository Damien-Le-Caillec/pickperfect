import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { put } from '@vercel/blob'

// Enregistre une image et renvoie son URL publique.
// - Sur Vercel (Blob configuré) : stockage Vercel Blob, le disque n'y est pas permanent
// - Ailleurs (Docker, dev) : public/uploads, servi par app/api/uploads
export async function saveImage(folder: 'avatars' | 'items', filename: string, data: Buffer): Promise<string> {
    if (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) {
        const blob = await put(`${folder}/${filename}`, data, {
            access:      'public',
            contentType: 'image/webp',
        })
        return blob.url
    }

    const dir = join(process.cwd(), 'public', 'uploads', folder)
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, filename), data)
    return `/uploads/${folder}/${filename}`
}
