
'use server';

import { removeBackground, type RemoveBackgroundInput } from '@/services/image-processing';

/**
 * A Server Action to remove the background from an image.
 * @param input An object containing the imageDataUri and other processing options.
 * @returns An object with the imageDataUri of the processed image and its mask.
 */
export async function removeBackgroundAction(input: RemoveBackgroundInput): Promise<{ imageDataUri: string, mask?: string }> {
  try {
    const result = await removeBackground(input);
    return { 
      imageDataUri: result.imageDataUri,
      mask: result.mask 
    };
  } catch (error) {
    console.error('Background removal action failed:', error);
    // In a real app, you might want to throw a more user-friendly error
    throw new Error('Failed to remove background.');
  }
}
