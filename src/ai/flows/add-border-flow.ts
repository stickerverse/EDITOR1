
'use server';
/**
 * @fileOverview An AI flow for adding a border to a sticker image.
 *
 * This flow now correctly uses an image generation model to add a border.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AddBorderInputSchema = z.object({
  imageDataUri: z.string().describe("The image to process (with background removed)."),
  borderColor: z.string().describe('The color of the border.'),
  borderWidth: z.string().describe('The width of the border.'),
});
export type AddBorderInput = z.infer<typeof AddBorderInputSchema>;

const AddBorderOutputSchema = z.object({
  imageDataUri: z.string().describe("The processed image with the added border."),
});
export type AddBorderOutput = z.infer<typeof AddBorderOutputSchema>;

export async function addBorder(input: AddBorderInput): Promise<AddBorderOutput> {
  return addBorderFlow(input);
}

const addBorderFlow = ai.defineFlow(
  {
    name: 'addBorderFlow',
    inputSchema: AddBorderInputSchema,
    outputSchema: AddBorderOutputSchema,
  },
  async ({ imageDataUri, borderColor, borderWidth }) => {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: [
        { media: { url: imageDataUri } },
        { text: `Add a ${borderWidth} ${borderColor} border around the subject. The border should look like a die-cut sticker border. The background must be fully transparent, not a checkerboard pattern. The output must be a PNG.` },
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media.url) {
      throw new Error('Border addition failed to return image data.');
    }

    return { imageDataUri: media.url };
  }
);
