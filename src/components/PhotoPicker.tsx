import { useState } from 'react';

import { ActionSheet, type SheetOption } from '@/src/components/settings';
import { useAuth } from '@/src/lib/auth';
import { successHaptic } from '@/src/lib/haptics';
import { hasUploadedPhoto, PhotoError, pickPhoto, removePhoto, uploadPhoto, type PhotoSource } from '@/src/lib/profile';
import { useToast } from '@/src/lib/toast';

/** Profile photo flow: choose a source, crop, upload, and report the result as a toast. */
export function usePhotoPicker() {
  const { user } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (task: () => Promise<string | null>) => {
    setBusy(true);
    try {
      const message = await task();
      if (message) {
        successHaptic();
        toast.show(message, { icon: 'checkmark-circle' });
      }
    } catch (err) {
      toast.show(err instanceof PhotoError ? err.message : "Couldn't update your photo. Try again.", { icon: 'alert-circle' });
    } finally {
      setBusy(false);
    }
  };

  const choose = (source: PhotoSource) =>
    run(async () => {
      if (!user) return null;
      const photo = await pickPhoto(source);
      if (!photo) return null;
      await uploadPhoto(user.id, photo);
      return 'Profile photo updated';
    });

  const options: SheetOption[] = [
    { label: 'Take photo', icon: 'camera-outline', onPress: () => void choose('camera') },
    { label: 'Choose from library', icon: 'images-outline', onPress: () => void choose('library') },
  ];
  if (hasUploadedPhoto(user)) {
    options.push({
      label: 'Remove photo',
      icon: 'trash-outline',
      danger: true,
      onPress: () =>
        void run(async () => {
          if (!user) return null;
          await removePhoto(user.id);
          return 'Profile photo removed';
        }),
    });
  }

  const sheet = <ActionSheet visible={open} title="Profile photo" options={options} onClose={() => setOpen(false)} />;
  return { open: () => setOpen(true), busy, sheet };
}
