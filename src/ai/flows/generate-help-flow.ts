'use server';
/**
 * @fileOverview An AI flow for generating a helpful guide for the application.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateHelpOutputSchema = z.object({
    helpText: z.string().describe("A helpful, fun, and quick guide on how to use the sticker customizer application. Use markdown for formatting, including headers, lists, and bold text."),
});

export type GenerateHelpOutput = z.infer<typeof GenerateHelpOutputSchema>;

export async function generateHelp(): Promise<GenerateHelpOutput> {
    return generateHelpFlow();
}

const generateHelpFlow = ai.defineFlow(
    {
        name: 'generateHelpFlow',
        inputSchema: z.void(),
        outputSchema: GenerateHelpOutputSchema,
    },
    async () => {
        const prompt = `You are a friendly and fun AI assistant for "Stickerific", a sticker creator app. 
        Your goal is to provide a quick and easy-to-understand guide for new users. 
        Use markdown for formatting. Be enthusiastic and use emojis!

        Explain the following features:
        - **Product Types**: Briefly describe Die-cut, Sticker Sheets, Kiss-cut, and Text Decals.
        - **Adding a Design**: Explain the three ways to add a design (Generate with AI, Upload an image, or create a Text decal).
        - **The Canvas**: Explain that this is the main work area.
        - **Interacting with Stickers**: Describe how to move, resize, and rotate stickers on the canvas.
        - **Context Menu**: Explain that right-clicking a sticker opens a cool neon menu with options to Delete, Duplicate, and Bring to Front.
        - **Material & Quantity**: Briefly explain that users can choose their sticker material and how many they want.
        - **Custom Layout for Sheets**: Explain the "Custom Layout" switch for sticker sheets that lets users arrange stickers freely.
        `;

        const { output } = await ai.generate({
            prompt,
            model: 'googleai/gemini-2.0-flash',
            output: {
                schema: GenerateHelpOutputSchema,
            },
        });
        
        return output!;
    }
);
