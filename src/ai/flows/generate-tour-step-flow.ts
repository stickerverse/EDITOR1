'use server';
/**
 * @fileOverview An AI flow for generating a single, concise tour step explanation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateTourStepInputSchema = z.object({
    featureDescription: z.string().describe("A brief description of the UI feature to explain."),
});
export type GenerateTourStepInput = z.infer<typeof GenerateTourStepInputSchema>;


const GenerateTourStepOutputSchema = z.object({
    explanation: z.string().describe("A fun, friendly, and very concise explanation (1-2 sentences) of the feature. Use an emoji!"),
});
export type GenerateTourStepOutput = z.infer<typeof GenerateTourStepOutputSchema>;


export async function generateTourStep(input: GenerateTourStepInput): Promise<GenerateTourStepOutput> {
    return generateTourStepFlow(input);
}

const generateTourStepFlow = ai.defineFlow(
    {
        name: 'generateTourStepFlow',
        inputSchema: GenerateTourStepInputSchema,
        outputSchema: GenerateTourStepOutputSchema,
    },
    async ({ featureDescription }) => {
        const prompt = `You are a friendly and fun AI assistant for "Stickerific", a sticker creator app. 
        Your goal is to provide a very short, one or two-sentence explanation for a specific feature.
        Be enthusiastic and use at least one emoji.

        Generate an explanation for the following feature:
        "${featureDescription}"
        `;

        const { output } = await ai.generate({
            prompt,
            model: 'googleai/gemini-2.0-flash',
            output: {
                schema: GenerateTourStepOutputSchema,
            },
        });
        
        return output!;
    }
);
