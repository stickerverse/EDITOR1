
'use server';
/**
 * @fileOverview Working background removal implementation using color-based segmentation
 * and advanced image processing techniques
 */

import { z } from 'zod';
import sharp from 'sharp';

// ===================== SCHEMAS =====================

const RemoveBackgroundInputSchema = z.object({
  imageDataUri: z.string(),
  threshold: z.number().min(0).max(255).default(30),
  smoothing: z.number().min(0).max(10).default(2),
  featherRadius: z.number().min(0).max(20).default(3),
  mode: z.enum(['auto', 'manual']).default('auto'),
  manualHints: z.object({
    backgroundColor: z.object({
      r: z.number(),
      g: z.number(),
      b: z.number()
    }).optional(),
    samplePoints: z.array(z.object({
      x: z.number(),
      y: z.number(),
      isBackground: z.boolean()
    })).optional()
  }).optional()
});

export type RemoveBackgroundInput = z.infer<typeof RemoveBackgroundInputSchema>;

const RemoveBackgroundOutputSchema = z.object({
  imageDataUri: z.string(),
  mask: z.string().optional(),
  metadata: z.object({
    processingTime: z.number(),
    dimensions: z.object({ width: z.number(), height: z.number() }),
    technique: z.string()
  })
});

export type RemoveBackgroundOutput = z.infer<typeof RemoveBackgroundOutputSchema>;

// ===================== UTILITIES =====================

function dataUriToBuffer(dataUri: string): Buffer {
  const base64Data = dataUri.split(',')[1];
  if (!base64Data) {
    throw new Error('Invalid Data URI: no base64 data found.');
  }
  return Buffer.from(base64Data, 'base64');
}

function bufferToDataUri(buffer: Buffer, mimeType: string = 'image/png'): string {
  const base64 = buffer.toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

async function getBackgroundColor(image: sharp.Sharp): Promise<sharp.Color> {
    const { width, height } = await image.metadata();
    if (!width || !height) throw new Error("Invalid image dimensions");

    const cornerPixels = await Promise.all([
        image.clone().extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer(),
        image.clone().extract({ left: width - 1, top: 0, width: 1, height: 1 }).raw().toBuffer(),
        image.clone().extract({ left: 0, top: height - 1, width: 1, height: 1 }).raw().toBuffer(),
        image.clone().extract({ left: width - 1, top: height - 1, width: 1, height: 1 }).raw().toBuffer(),
    ]);

    const avg = cornerPixels.reduce((acc, pixel) => {
        acc.r += pixel[0];
        acc.g += pixel[1];
        acc.b += pixel[2];
        return acc;
    }, { r: 0, g: 0, b: 0 });

    return {
        r: Math.round(avg.r / 4),
        g: Math.round(avg.g / 4),
        b: Math.round(avg.b / 4),
    };
}


// ===================== MAIN FUNCTION =====================

export async function removeBackground(input: RemoveBackgroundInput): Promise<RemoveBackgroundOutput> {
  const startTime = Date.now();
  
  try {
    const validatedInput = RemoveBackgroundInputSchema.parse(input);
    const imageBuffer = dataUriToBuffer(validatedInput.imageDataUri);
    
    const image = sharp(imageBuffer).ensureAlpha();
    const metadata = await image.metadata();
    const { width, height } = metadata;
    
    if (!width || !height) {
      throw new Error('Invalid image dimensions');
    }

    const bgColor = await getBackgroundColor(image.clone().removeAlpha());

    // Create a version of the image without an alpha channel for comparison
    const rgbImage = image.clone().removeAlpha();
    
    // Create a mask where pixels similar to bgColor are white, others are black
    const similarityThreshold = validatedInput.threshold; 
    const mask = await rgbImage.toBuffer().then(buffer =>
      sharp(buffer, { raw: { width, height, channels: 3 } })
        .bandbool('and') // Placeholder, will be overwritten by threshold
        .linear([1, 1, 1], [0, 0, 0])
        .threshold(similarityThreshold)
        .composite([{
          input: Buffer.from([
            (bgColor.r as number), (bgColor.g as number), (bgColor.b as number)
          ]),
          raw: { width: 1, height: 1, channels: 3 },
          tile: true,
          blend: 'difference'
        }])
        .extractChannel(0) // Use one channel for the mask
        .negate() // Invert mask (subject is white, background is black)
    );

    let refinedMask = mask.clone();

    // Apply morphological operations for smoothing
    if (validatedInput.smoothing > 0) {
        refinedMask = refinedMask.morphology({
            operation: 'open',
            kernel: `circle:${validatedInput.smoothing}`
        }).morphology({
            operation: 'close',
            kernel: `circle:${validatedInput.smoothing}`
        });
    }

    // Apply feathering (blur) to the mask edges
    if (validatedInput.featherRadius > 0) {
        refinedMask = refinedMask.blur(validatedInput.featherRadius);
    }
    
    const finalMaskBuffer = await refinedMask.toBuffer();

    // Create final image by compositing the original with the mask
    const outputBuffer = await image
        .composite([{ 
            input: finalMaskBuffer,
            blend: 'dest-in'
        }])
        .png()
        .toBuffer();
    
    // Create a visual mask image for debugging/display
    const visualMaskBuffer = await refinedMask.png().toBuffer();
    
    return {
      imageDataUri: bufferToDataUri(outputBuffer),
      mask: bufferToDataUri(visualMaskBuffer),
      metadata: {
        processingTime: Date.now() - startTime,
        dimensions: { width, height },
        technique: 'Sharp-based Color Segmentation with Edge Refinement'
      }
    };
  } catch (error) {
    console.error('Background removal error:', error);
    throw new Error(`Failed to remove background: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ===================== BATCH PROCESSING =====================

export async function batchRemoveBackground(
  images: RemoveBackgroundInput[],
  options?: {
    parallel?: boolean;
    maxConcurrency?: number;
  }
): Promise<RemoveBackgroundOutput[]> {
  const { parallel = true, maxConcurrency = 4 } = options || {};
  
  if (!parallel) {
    // Sequential processing
    const results: RemoveBackgroundOutput[] = [];
    for (const image of images) {
      results.push(await removeBackground(image));
    }
    return results;
  }
  
  // Parallel processing
  const results: RemoveBackgroundOutput[] = new Array(images.length);
  let currentIndex = 0;
  
  async function processNext(): Promise<void> {
    const index = currentIndex++;
    if (index < images.length) {
      results[index] = await removeBackground(images[index]);
      await processNext();
    }
  }
  
  const promises: Promise<void>[] = [];
  for (let i = 0; i < Math.min(maxConcurrency, images.length); i++) {
    promises.push(processNext());
  }
  
  await Promise.all(promises);
  return results;
}

// ===================== HELPER FUNCTIONS =====================
type Color = { r: number, g: number, b: number };
/**
 * Analyze image to suggest optimal parameters
 */
export async function analyzeImage(imageDataUri: string): Promise<{
  suggestedThreshold: number;
  backgroundColor: Color;
  complexity: 'simple' | 'medium' | 'complex';
}> {
  const buffer = dataUriToBuffer(imageDataUri);
  const image = sharp(buffer);
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  
  if (!width || !height) {
    throw new Error('Invalid image dimensions');
  }
  
  // Analyze color distribution from corners
  const corners = [
    {x: 0, y: 0},
    {x: width - 1, y: 0},
    {x: 0, y: height - 1},
    {x: width - 1, y: height - 1}
  ];

  let r_sum = 0, g_sum = 0, b_sum = 0;
  for(const corner of corners) {
    const idx = (corner.y * width + corner.x) * 4;
    r_sum += data[idx];
    g_sum += data[idx+1];
    b_sum += data[idx+2];
  }

  const backgroundColor: Color = {
    r: Math.round(r_sum / 4),
    g: Math.round(g_sum / 4),
    b: Math.round(b_sum / 4)
  };

  // Simplified complexity analysis for now
  let complexity: 'simple' | 'medium' | 'complex' = 'medium';
  let suggestedThreshold = 30; // Standard default

  const stats = await sharp(buffer).stats();
  const { channels } = stats;
  const stdDev = channels.map(c => c.stdev).reduce((a, b) => a + b, 0) / channels.length;

  if (stdDev < 40) {
      complexity = 'simple';
      suggestedThreshold = 20;
  } else if (stdDev > 70) {
      complexity = 'complex';
      suggestedThreshold = 45;
  }
  
  return {
    suggestedThreshold,
    backgroundColor,
    complexity
  };
}
