
'use server';
/**
 * @fileOverview A sticker generation AI flow.
 *
 * - generateSticker - A function that handles the sticker generation process.
 * - GenerateStickerInput - The input type for the generateSticker function.
 * - GenerateStickerOutput - The return type for the generateSticker function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateStickerInputSchema = z.object({
  prompt: z.string().describe('The user prompt for the sticker design.'),
});
export type GenerateStickerInput = z.infer<typeof GenerateStickerInputSchema>;

const GenerateStickerOutputSchema = z.object({
  imageDataUri: z.string().describe("The generated sticker image as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type GenerateStickerOutput = z.infer<typeof GenerateStickerOutputSchema>;

export async function generateSticker(input: GenerateStickerInput): Promise<GenerateStickerOutput> {
  return generateStickerFlow(input);
}

const generateStickerFlow = ai.defineFlow(
  {
    name: 'generateStickerFlow',
    inputSchema: GenerateStickerInputSchema,
    outputSchema: GenerateStickerOutputSchema,
  },
  async ({ prompt }) => {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: `A die-cut sticker of ${prompt}, vector art, vibrant colors. The background must be fully transparent, not a checkerboard pattern. The output must be a PNG.`,
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
      throw new Error('Image generation failed');
    }

    return {
      imageDataUri: media.url,
    };
  }
);
