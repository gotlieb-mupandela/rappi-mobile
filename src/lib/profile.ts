import type { User } from '@supabase/supabase-js';

import { supabase } from '@/src/lib/supabase';

const AVATAR_BUCKET = 'avatars';
const AVATAR_SIZE = 512;

export type PhotoSource = 'camera' | 'library';

export class PhotoError extends Error {}

/**
 * Uploaded photos live in `photo_url`: Google rewrites `avatar_url` on every Google sign-in,
 * so its picture is only the fallback.
 */
export function profilePhoto(user: User | null | undefined): string | undefined {
  const meta = user?.user_metadata ?? {};
  const url = meta.photo_url || meta.avatar_url || meta.picture;
  return typeof url === 'string' && url ? url : undefined;
}

export function hasUploadedPhoto(user: User | null | undefined): boolean {
  return typeof user?.user_metadata?.photo_url === 'string' && !!user.user_metadata.photo_url;
}

export function profileName(user: User | null | undefined, profileFullName?: string | null): string {
  const metaName = user?.user_metadata?.full_name;
  return (profileFullName || (typeof metaName === 'string' ? metaName : '') || '').trim();
}

export function initials(name: string, email?: string | null): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length > 0) return words.slice(0, 2).map((word) => word[0]!.toUpperCase()).join('');
  return (email?.[0] ?? '?').toUpperCase();
}

export async function saveFullName(userId: string, fullName: string): Promise<void> {
  const name = fullName.trim();
  const { error } = await supabase.from('profiles').update({ full_name: name }).eq('id', userId);
  if (error) throw new Error("Couldn't save your name. Try again.");
  const { error: metaError } = await supabase.auth.updateUser({ data: { full_name: name } });
  if (metaError) throw new Error("Couldn't save your name. Try again.");
}

/** Returns a square, resized JPEG as base64, or null when the user cancels. */
export async function pickPhoto(source: PhotoSource): Promise<string | null> {
  let ImagePicker: typeof import('expo-image-picker');
  let ImageManipulator: typeof import('expo-image-manipulator');
  try {
    ImagePicker = await import('expo-image-picker');
    ImageManipulator = await import('expo-image-manipulator');
  } catch {
    throw new PhotoError('Update the app to add a profile photo.');
  }

  const permission =
    source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new PhotoError(
      source === 'camera'
        ? "Camera access is off. Turn it on in your phone's settings."
        : "Photo access is off. Turn it on in your phone's settings.",
    );
  }

  const options = { mediaTypes: ['images' as const], allowsEditing: true, aspect: [1, 1] as [number, number], quality: 1 };
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;

  const image = await ImageManipulator.ImageManipulator.manipulate(asset.uri).resize({ width: AVATAR_SIZE, height: AVATAR_SIZE }).renderAsync();
  const saved = await image.saveAsync({ format: ImageManipulator.SaveFormat.JPEG, compress: 0.8, base64: true });
  if (!saved.base64) throw new PhotoError("Couldn't read that photo. Try another one.");
  return saved.base64;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function removeStoredPhotos(userId: string, keep?: string): Promise<void> {
  const { data } = await supabase.storage.from(AVATAR_BUCKET).list(userId);
  const stale = (data ?? []).map((file) => `${userId}/${file.name}`).filter((path) => path !== keep);
  if (stale.length > 0) await supabase.storage.from(AVATAR_BUCKET).remove(stale);
}

export async function uploadPhoto(userId: string, base64: string): Promise<void> {
  const path = `${userId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, base64ToBytes(base64), { contentType: 'image/jpeg', upsert: true });
  if (error) throw new PhotoError("Couldn't upload your photo. Try again.");
  const url = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
  const { error: metaError } = await supabase.auth.updateUser({ data: { photo_url: url } });
  if (metaError) throw new PhotoError("Couldn't save your photo. Try again.");
  await removeStoredPhotos(userId, path).catch(() => undefined);
}

export async function removePhoto(userId: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ data: { photo_url: null } });
  if (error) throw new PhotoError("Couldn't remove your photo. Try again.");
  await removeStoredPhotos(userId).catch(() => undefined);
}
