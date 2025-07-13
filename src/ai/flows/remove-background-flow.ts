
'use server';
/**
 * @fileOverview A background removal AI flow.
 *
 * - removeBackground - A function that handles removing the background from an image.
 * - RemoveBackgroundInput - The input type for the removeBackground function.
 * - RemoveBackgroundOutput - The return type for the removeBackground function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const RemoveBackgroundInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "The image to process, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type RemoveBackgroundInput = z.infer<typeof RemoveBackgroundInputSchema>;

const RemoveBackgroundOutputSchema = z.object({
  imageDataUri: z.string().describe("The processed image with the background removed as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
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
        {media: {url: imageDataUri}},
        {text: 'Remove the background of this image. The output should be the subject on a transparent background.'},
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media.url) {
      throw new Error('Background removal failed');
    }

    return {
      imageDataUri: media.url,
    };
  }
);
