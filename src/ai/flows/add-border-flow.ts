'use server';
/**
 * @fileOverview An AI flow for adding a border to a sticker image.
 *
 * This flow now correctly uses an image generation model to add a border.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod'; // Fixed: Should be 'zod', not 'genkit'

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
  try {
    return await addBorderFlow(input);
  } catch (error) {
    console.error('Error in addBorder:', error);
    throw new Error(`Border addition failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

const addBorderFlow = ai.defineFlow(
  {
    name: 'addBorderFlow',
    inputSchema: AddBorderInputSchema,
    outputSchema: AddBorderOutputSchema,
  },
  async ({ imageDataUri, borderColor, borderWidth }) => {
    try {
      const { media } = await ai.generate({
        model: 'googleai/gemini-2.0-flash-preview-image-generation',
        prompt: [
          { media: { url: imageDataUri } },
          { 
            text: `The provided image has a transparent background. Add a ${borderWidth} ${borderColor} border around the subject in the image. The new border should look like a die-cut sticker border. The background of the final image must remain fully transparent, not a solid color or a checkerboard pattern. The output must be a PNG file.` 
          },
        ],
        config: {
          // Removed responseModalities as it may not be supported
          // You may need to adjust these safety settings based on your Genkit setup
          safetySettings: [
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          ],
        },
      });

      if (!media?.url) {
        throw new Error('AI model failed to generate image with border - no media URL returned');
      }

      return { imageDataUri: media.url };
    } catch (error) {
      console.error('Error in addBorderFlow:', error);
      throw new Error(`Failed to add border to image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);