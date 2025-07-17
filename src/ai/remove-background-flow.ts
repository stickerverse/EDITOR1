'use server';
/**
 * @fileOverview A background removal flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import {unpaas} from 'genkitx-unpaas';

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
    const response = await unpaas.removeBackground({
        image: {url: imageDataUri},
        output: {format: 'png'},
    });

    const media = response.media[0];

    if (!media?.url) {
      throw new Error('Background removal failed');
    }

    return {
      imageDataUri: media.url,
    };
  }
);
