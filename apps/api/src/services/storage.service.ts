import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { env } from '../env.js';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const storage = supabase.storage.from(env.SUPABASE_STORAGE_BUCKET);
const publicObjectPath = `/storage/v1/object/public/${encodeURIComponent(env.SUPABASE_STORAGE_BUCKET)}/`;

function getFileExtension(originalName: string, contentType: string) {
  const originalExtension = path.extname(originalName).toLowerCase();
  if (originalExtension) return originalExtension;

  const extensions: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
  };

  return extensions[contentType] ?? '';
}

function getManagedObjectPath(publicUrl: string | null | undefined) {
  if (!publicUrl) return null;

  try {
    const url = new URL(publicUrl);
    const supabaseUrl = new URL(env.SUPABASE_URL);
    if (url.origin !== supabaseUrl.origin || !url.pathname.startsWith(publicObjectPath)) {
      return null;
    }

    return decodeURIComponent(url.pathname.slice(publicObjectPath.length));
  } catch {
    return null;
  }
}

export const storageService = {
  async uploadProductImage(productId: string, file: Express.Multer.File) {
    const extension = getFileExtension(file.originalname, file.mimetype);
    const objectPath = `products/${productId}/${randomUUID()}${extension}`;
    const { error } = await storage.upload(objectPath, file.buffer, {
      cacheControl: '3600',
      contentType: file.mimetype,
      upsert: false,
    });

    if (error) {
      throw new Error(`Supabase Storage upload failed: ${error.message}`);
    }

    const { data } = storage.getPublicUrl(objectPath);
    return {
      objectPath,
      publicUrl: data.publicUrl,
    };
  },

  async removeObject(objectPath: string) {
    const { error } = await storage.remove([objectPath]);
    if (error) {
      throw new Error(`Supabase Storage delete failed: ${error.message}`);
    }
  },

  async removeManagedImage(publicUrl: string | null | undefined) {
    const objectPath = getManagedObjectPath(publicUrl);
    if (!objectPath) return false;

    await this.removeObject(objectPath);
    return true;
  },

  async removeManagedImageSafely(publicUrl: string | null | undefined) {
    try {
      return await this.removeManagedImage(publicUrl);
    } catch (error) {
      console.warn(
        '[Storage] Failed to remove old product image:',
        error instanceof Error ? error.message : error
      );
      return false;
    }
  },
};
