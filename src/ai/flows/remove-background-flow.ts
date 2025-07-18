
'use server';
/**
 * @fileOverview A background removal flow that uses a dedicated image processing library.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { removeBackground as removeBgService } from '@/services/image-processing';

const RemoveBackgroundInputSchema = z.object({
  imageDataUri: z.string().describe("The user's uploaded image as a data URI."),
});
export type RemoveBackgroundInput = z.infer<typeof RemoveBackgroundInputSchema>;

const RemoveBackgroundOutputSchema = z.object({
  imageDataUri: z.string().describe("The processed image with background removed."),
});
export type RemoveBackgroundOutput = z.infer<typeof RemoveBackgroundOutputSchema>;

export async function removeBackground(input: RemoveBackgroundInput): Promise<RemoveBackgroundOutput> {
  return removeBackgroundFlow(input);
}

const removeBackgroundFlow = ai.defineFlow(
  {
    name: 'removeBackgroundFlow',
    inputSchema: RemoveBackgroundInputSchema,
    outputSchema: RemoveBackgroundOutputSchema,
  },
  async ({ imageDataUri }) => {
    // We pass the plain data URI to our service, which will handle buffer conversion
    const result = await removeBgService({ imageDataUri });

    if (!result.imageDataUri) {
      throw new Error('Background removal failed to return image data.');
    }

    return { imageDataUri: result.imageDataUri };
  }
);
