
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

// ===================== COLOR UTILITIES =====================

interface Color {
  r: number;
  g: number;
  b: number;
}

function colorDistance(c1: Color, c2: Color): number {
  // Using weighted Euclidean distance for better perceptual accuracy
  const rMean = (c1.r + c2.r) / 2;
  const deltaR = c1.r - c2.r;
  const deltaG = c1.g - c2.g;
  const deltaB = c1.b - c2.b;
  
  const weightR = 2 + rMean / 256;
  const weightG = 4;
  const weightB = 2 + (255 - rMean) / 256;
  
  return Math.sqrt(
    weightR * deltaR * deltaR +
    weightG * deltaG * deltaG +
    weightB * deltaB * deltaB
  );
}


// ===================== FLOOD FILL ALGORITHM =====================

class FloodFillSegmentation {
  private width: number;
  private height: number;
  private pixels: Uint8ClampedArray;
  private visited: Uint8Array;
  private mask: Uint8Array;

  constructor(width: number, height: number, pixels: Uint8ClampedArray) {
    this.width = width;
    this.height = height;
    this.pixels = pixels;
    this.visited = new Uint8Array(width * height);
    this.mask = new Uint8Array(width * height); // 0 = foreground, 255 = background
  }

  segment(threshold: number, startPoints?: Array<{x: number, y: number, isBackground: boolean}>): Uint8Array {
    // Initialize with corner sampling if no manual points
    if (!startPoints || startPoints.length === 0) {
      startPoints = this.getCornerPoints();
    }

    // Process each starting point
    for (const point of startPoints) {
      if (point.isBackground) {
        this.floodFill(point.x, point.y, threshold, true);
      }
    }

    // Invert mask (background = 0, foreground = 255)
    for (let i = 0; i < this.mask.length; i++) {
      this.mask[i] = this.mask[i] > 0 ? 0 : 255;
    }

    return this.mask;
  }

  private getCornerPoints(): Array<{x: number, y: number, isBackground: boolean}> {
    const margin = 5;
    return [
      { x: margin, y: margin, isBackground: true },
      { x: this.width - margin - 1, y: margin, isBackground: true },
      { x: margin, y: this.height - margin - 1, isBackground: true },
      { x: this.width - margin - 1, y: this.height - margin - 1, isBackground: true }
    ];
  }

  private floodFill(startX: number, startY: number, threshold: number, markAsBackground: boolean): void {
    const stack: Array<{x: number, y: number}> = [{x: startX, y: startY}];
    const startIdx = (startY * this.width + startX) * 4;
    const startAlpha = this.pixels[startIdx + 3];

    // Don't start flood fill on a fully transparent pixel
    if (startAlpha === 0) {
        return;
    }
    
    const targetColor: Color = {
      r: this.pixels[startIdx],
      g: this.pixels[startIdx + 1],
      b: this.pixels[startIdx + 2]
    };

    while (stack.length > 0) {
      const {x, y} = stack.pop()!;
      
      if (x < 0 || x >= this.width || y < 0 || y >= this.height) continue;
      
      const idx = y * this.width + x;
      if (this.visited[idx]) continue;
      
      this.visited[idx] = 1;

      const pixelIdx = idx * 4;
      const pixelAlpha = this.pixels[pixelIdx + 3];

      // Skip fully transparent pixels
      if(pixelAlpha === 0) continue;

      const currentColor: Color = {
        r: this.pixels[pixelIdx],
        g: this.pixels[pixelIdx + 1],
        b: this.pixels[pixelIdx + 2]
      };

      const distance = colorDistance(currentColor, targetColor);
      
      if (distance <= threshold) {
        if(markAsBackground) this.mask[idx] = 255;
        
        // Add neighbors
        stack.push({x: x + 1, y});
        stack.push({x: x - 1, y});
        stack.push({x, y: y + 1});
        stack.push({x, y: y - 1});
      }
    }
  }
}

// ===================== MAIN FUNCTION =====================

export async function removeBackground(input: RemoveBackgroundInput): Promise<RemoveBackgroundOutput> {
  const startTime = Date.now();
  
  try {
    // Parse input
    const validatedInput = RemoveBackgroundInputSchema.parse(input);
    const imageBuffer = dataUriToBuffer(validatedInput.imageDataUri);
    
    // Load image and get metadata
    let originalImage = sharp(imageBuffer);
    const metadata = await originalImage.metadata();
    const { width, height } = metadata;
    
    if (!width || !height) {
      throw new Error('Invalid image dimensions');
    }

    // *** FIX: Ensure the image has 4 channels (RGBA) before processing ***
    const rgbaImageBuffer = await sharp({
        create: {
            width,
            height,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
    })
    .composite([{ input: imageBuffer, gravity: 'center' }])
    .png()
    .toBuffer();
    
    // Get raw RGBA pixel data from the normalized image
    const { data: pixels } = await sharp(rgbaImageBuffer)
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    // Perform segmentation
    const segmenter = new FloodFillSegmentation(width, height, pixels);
    let mask = segmenter.segment(
      validatedInput.threshold,
      validatedInput.manualHints?.samplePoints
    );
    
    // Create a sharp object for the mask
    let maskSharp = sharp(Buffer.from(mask), { raw: { width, height, channels: 1 } });
    
    // Apply morphological operations (opening and closing) for smoothing
    if (validatedInput.smoothing > 0) {
        maskSharp = maskSharp.morphology({
            operation: 'open',
            kernel: `circle:${validatedInput.smoothing}`
        }).morphology({
            operation: 'close',
            kernel: `circle:${validatedInput.smoothing}`
        });
    }

    // Apply feathering (blur) to the mask edges
    if (validatedInput.featherRadius > 0) {
        maskSharp = maskSharp.blur(validatedInput.featherRadius);
    }

    const finalMaskBuffer = await maskSharp.toBuffer();

    // Create final image by compositing the original with the mask
    const outputBuffer = await sharp(rgbaImageBuffer)
        .composite([{ 
            input: finalMaskBuffer, 
            blend: 'dest-in' 
        }])
        .png()
        .toBuffer();
    
    // Create a visual mask image for debugging/display
    const visualMaskBuffer = await sharp(finalMaskBuffer, {raw: {width, height, channels: 1}}).png().toBuffer();
    
    return {
      imageDataUri: bufferToDataUri(outputBuffer),
      mask: bufferToDataUri(visualMaskBuffer),
      metadata: {
        processingTime: Date.now() - startTime,
        dimensions: { width, height },
        technique: 'Flood Fill Segmentation with Edge Refinement'
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
