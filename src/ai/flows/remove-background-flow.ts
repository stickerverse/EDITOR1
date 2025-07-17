'use server';
/**
 * @fileOverview A background removal flow that uses an image generation model.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

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
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: [
        { media: { url: imageDataUri } },
        { text: `Remove the background from this image. The subject should be perfectly preserved. The background must be fully transparent, not a checkerboard pattern. The output must be a PNG.` },
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        safetySettings: [
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        ],
      },
    });

    if (!media?.url) {
      throw new Error('Background removal failed to return image data.');
    }