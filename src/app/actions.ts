
'use server';

import { removeBackground } from '@/services/image-processing';

/**
 * A Server Action to remove the background from an image.
 * @param input An object containing the imageDataUri.
 * @returns An object with the imageDataUri of the processed image.
 */
export async function removeBackgroundAction(input: { imageDataUri: string }): Promise<{ imageDataUri: string }> {
  try {
    const result = await removeBackground({
      imageDataUri: input.imageDataUri,
      // You can expose other options like threshold, smoothing, etc. if needed
    });
    return { imageDataUri: result.imageDataUri };
  } catch (error) {
    console.error('Background removal action failed:', error);
    // In a real app, you might want to throw a more user-friendly error
    throw new Error('Failed to remove background.');
  }
}
