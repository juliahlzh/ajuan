import { put } from '@vercel/blob';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { hasSupabaseRest, storageBucket, supabaseRequest } from './supabase';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'application/pdf']);
export const maxUploadSizeBytes = 10 * 1024 * 1024;
export const maxUploadSizeLabel = '10 MB';

export async function saveUpload(file: File, folder: string) {
  if (file.size > maxUploadSizeBytes) {
    throw new Error(`Ukuran file maksimal ${maxUploadSizeLabel}.`);
  }

  if (!allowedTypes.has(file.type)) {
    throw new Error('Format file harus JPG, PNG, atau PDF.');
  }

  const safeName = file.name.replace(/[^\w.\-]+/g, '_');
  const filename = `${folder}/${Date.now()}_${safeName}`;

  if (hasSupabaseRest()) {
    await supabaseRequest(`/storage/v1/object/${storageBucket}/${filename}`, {
      method: 'POST',
      headers: {
        'Content-Type': file.type,
        'x-upsert': 'true'
      },
      body: file
    });
    return `/api/files/${storageBucket}/${filename.split('/').map(encodeURIComponent).join('/')}`;
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(filename, file, {
      access: 'private',
      addRandomSuffix: true
    });
    return `/api/files/${blob.pathname.split('/').map(encodeURIComponent).join('/')}`;
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const target = path.join(process.cwd(), 'public', 'uploads', filename);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
  return `/uploads/${filename}`;
}
