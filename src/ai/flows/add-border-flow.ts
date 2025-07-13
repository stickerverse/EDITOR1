
'use server';
/**
 * @fileOverview An AI flow for adding a border to a sticker image.
 *
 * - addBorder - A function that adds a die-cut style border to an image.
 * - AddBorderInput - The input type for the addBorder function.
 * - AddBorderOutput - The return type for the addBorder function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AddBorderInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "The image to process (with background already removed), as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  borderColor: z.string().describe('The color of the border.'),
  borderWidth: z.string().describe('The width of the border (e.g., thin, medium, thick).'),
});
export type AddBorderInput = z.infer<typeof AddBorderInputSchema>;

const AddBorderOutputSchema = z.object({
  imageDataUri: z.string().describe("The processed image with the added border as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
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
      prompt: `Add a ${borderWidth} ${borderColor} die-cut sticker border to the subject of this image. The background must be transparent.`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
      input: {
        media: { url: imageDataUri },
      }
    });

    if (!media.url) {
      throw new Error('Adding border failed');
    }

    return {
      imageDataUri: media.url,
    };
  }
);
