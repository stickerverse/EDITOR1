
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

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;

  let h = 0;
  const s = max === 0 ? 0 : diff / max;
  const v = max;

  if (diff !== 0) {
    if (max === r) {
      h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      h = ((b - r) / diff + 2) / 6;
    } else {
      h = ((r - g) / diff + 4) / 6;
    }
  }

  return { h: h * 360, s: s * 100, v: v * 100 };
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
    this.mask = new Uint8Array(width * height);
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
      const currentColor: Color = {
        r: this.pixels[pixelIdx],
        g: this.pixels[pixelIdx + 1],
        b: this.pixels[pixelIdx + 2]
      };

      const distance = colorDistance(currentColor, targetColor);
      
      if (distance <= threshold) {
        this.mask[idx] = markAsBackground ? 255 : 0;
        
        // Add neighbors
        stack.push({x: x + 1, y});
        stack.push({x: x - 1, y});
        stack.push({x, y: y + 1});
        stack.push({x, y: y - 1});
      }
    }
  }
}

// ===================== EDGE DETECTION =====================

class EdgeDetection {
  static detectEdges(pixels: Uint8ClampedArray, width: number, height: number): Uint8Array {
    const edges = new Uint8Array(width * height);
    const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0;
        let gy = 0;

        // Apply Sobel operator
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            // Convert to grayscale
            const gray = pixels[idx] * 0.299 + 
                        pixels[idx + 1] * 0.587 + 
                        pixels[idx + 2] * 0.114;
            
            gx += gray * sobelX[ky + 1][kx + 1];
            gy += gray * sobelY[ky + 1][kx + 1];
          }
        }

        const magnitude = Math.sqrt(gx * gx + gy * gy);
        edges[y * width + x] = Math.min(255, magnitude);
      }
    }

    return edges;
  }
}

// ===================== MORPHOLOGICAL OPERATIONS =====================

class MorphologicalOps {
  static erode(mask: Uint8Array, width: number, height: number, iterations: number = 1): Uint8Array {
    let result = new Uint8Array(mask);
    
    for (let iter = 0; iter < iterations; iter++) {
      const temp = new Uint8Array(result);
      
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = y * width + x;
          let min = 255;
          
          // Check 3x3 neighborhood
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nIdx = (y + dy) * width + (x + dx);
              min = Math.min(min, temp[nIdx]);
            }
          }
          
          result[idx] = min;
        }
      }
    }
    
    return result;
  }

  static dilate(mask: Uint8Array, width: number, height: number, iterations: number = 1): Uint8Array {
    let result = new Uint8Array(mask);
    
    for (let iter = 0; iter < iterations; iter++) {
      const temp = new Uint8Array(result);
      
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = y * width + x;
          let max = 0;
          
          // Check 3x3 neighborhood
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nIdx = (y + dy) * width + (x + dx);
              max = Math.max(max, temp[nIdx]);
            }
          }
          
          result[idx] = max;
        }
      }
    }
    
    return result;
  }

  static close(mask: Uint8Array, width: number, height: number, iterations: number = 1): Uint8Array {
    // Closing = dilation followed by erosion
    const dilated = this.dilate(mask, width, height, iterations);
    return this.erode(dilated, width, height, iterations);
  }

  static open(mask: Uint8Array, width: number, height: number, iterations: number = 1): Uint8Array {
    // Opening = erosion followed by dilation
    const eroded = this.erode(mask, width, height, iterations);
    return this.dilate(eroded, width, height, iterations);
  }
}

// ===================== EDGE REFINEMENT =====================

class EdgeRefinement {
  static refineEdges(
    mask: Uint8Array, 
    originalPixels: Uint8ClampedArray,
    width: number, 
    height: number,
    featherRadius: number = 3
  ): Uint8Array {
    const refined = new Uint8Array(mask);
    const edges = EdgeDetection.detectEdges(originalPixels, width, height);
    
    // Apply feathering to edges
    for (let y = featherRadius; y < height - featherRadius; y++) {
      for (let x = featherRadius; x < width - featherRadius; x++) {
        const idx = y * width + x;
        
        // Check if pixel is near an edge in the mask
        let isEdge = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nIdx = (y + dy) * width + (x + dx);
            if (mask[idx] !== mask[nIdx]) {
              isEdge = true;
              break;
            }
          }
          if (isEdge) break;
        }
        
        if (isEdge && edges[idx] > 30) {
          // Apply feathering
          let sum = 0;
          let weightSum = 0;
          
          for (let dy = -featherRadius; dy <= featherRadius; dy++) {
            for (let dx = -featherRadius; dx <= featherRadius; dx++) {
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist <= featherRadius) {
                const nIdx = (y + dy) * width + (x + dx);
                const weight = 1 - (dist / featherRadius);
                sum += mask[nIdx] * weight;
                weightSum += weight;
              }
            }
          }
          
          refined[idx] = Math.round(sum / weightSum);
        }
      }
    }
    
    return refined;
  }

  static antiAlias(mask: Uint8Array, width: number, height: number): Uint8Array {
    const result = new Uint8Array(mask);
    
    // Simple anti-aliasing using 3x3 averaging for edge pixels
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        
        // Check if it's an edge pixel
        let isEdge = false;
        let sum = 0;
        let count = 0;
        
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nIdx = (y + dy) * width + (x + dx);
            sum += mask[nIdx];
            count++;
            
            if (mask[idx] !== mask[nIdx]) {
              isEdge = true;
            }
          }
        }
        
        if (isEdge) {
          result[idx] = Math.round(sum / count);
        }
      }
    }
    
    return result;
  }
}

// ===================== MAIN FUNCTION =====================

export async function removeBackground(input: RemoveBackgroundInput): Promise<RemoveBackgroundOutput> {
  const startTime = Date.now();
  
  try {
    // Parse input
    const validatedInput = RemoveBackgroundInputSchema.parse(input);
    const imageBuffer = dataUriToBuffer(validatedInput.imageDataUri);
    
    // Load image
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const { width, height, channels } = metadata;
    
    if (!width || !height) {
      throw new Error('Invalid image dimensions');
    }
    
    // Get raw pixel data
    const { data: rawPixels } = await image
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    // Ensure pixel data is in RGBA format for consistency
    const pixels = new Uint8ClampedArray(width * height * 4);
    if (channels === 3) {
      for (let i = 0; i < width * height; i++) {
        pixels[i * 4] = rawPixels[i * 3];
        pixels[i * 4 + 1] = rawPixels[i * 3 + 1];
        pixels[i * 4 + 2] = rawPixels[i * 3 + 2];
        pixels[i * 4 + 3] = 255;
      }
    } else if (channels === 4) {
      pixels.set(rawPixels);
    } else {
        throw new Error(`Unsupported number of channels: ${channels}`);
    }
    
    // Perform segmentation
    const segmenter = new FloodFillSegmentation(width, height, pixels);
    let mask = segmenter.segment(
      validatedInput.threshold,
      validatedInput.manualHints?.samplePoints
    );
    
    // Apply morphological operations to clean up the mask
    mask = MorphologicalOps.open(mask, width, height, validatedInput.smoothing);
    mask = MorphologicalOps.close(mask, width, height, validatedInput.smoothing);
    
    // Refine edges
    mask = EdgeRefinement.refineEdges(
      mask,
      pixels,
      width,
      height,
      validatedInput.featherRadius
    );
    
    // Apply anti-aliasing
    mask = EdgeRefinement.antiAlias(mask, width, height);
    
    // Create output image with transparency
    const outputPixels = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      const srcIdx = i * 4;
      outputPixels[srcIdx] = pixels[srcIdx];
      outputPixels[srcIdx + 1] = pixels[srcIdx + 1];
      outputPixels[srcIdx + 2] = pixels[srcIdx + 2];
      outputPixels[srcIdx + 3] = mask[i];
    }
    
    // Convert to PNG
    const outputBuffer = await sharp(Buffer.from(outputPixels), {
      raw: {
        width,
        height,
        channels: 4
      }
    })
    .png()
    .toBuffer();
    
    // Create mask image
    const maskBuffer = await sharp(Buffer.from(mask), {
      raw: {
        width,
        height,
        channels: 1
      }
    })
    .png()
    .toBuffer();
    
    return {
      imageDataUri: bufferToDataUri(outputBuffer),
      mask: bufferToDataUri(maskBuffer),
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
  const metadata = await image.metadata();
  const { width, height } = metadata;
  
  if (!width || !height) {
    throw new Error('Invalid image dimensions');
  }
  
  // Sample image at lower resolution for analysis
  const sampleSize = 100;
  const { data: samples } = await image
    .resize(sampleSize, sampleSize, { fit: 'contain' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  // Analyze color distribution
  const colorMap = new Map<string, number>();
  const colors: Color[] = [];
  
  for (let i = 0; i < samples.length; i += 3) {
    const color = {
      r: samples[i],
      g: samples[i + 1],
      b: samples[i + 2]
    };
    
    const key = `${color.r},${color.g},${color.b}`;
    colorMap.set(key, (colorMap.get(key) || 0) + 1);
    colors.push(color);
  }
  
  // Find most common color (likely background)
  let maxCount = 0;
  let backgroundColor: Color = { r: 255, g: 255, b: 255 };
  
  for (const [key, count] of colorMap) {
    if (count > maxCount) {
      maxCount = count;
      const [r, g, b] = key.split(',').map(Number);
      backgroundColor = { r, g, b };
    }
  }
  
  // Calculate color variance
  let variance = 0;
  for (const color of colors) {
    variance += colorDistance(color, backgroundColor);
  }
  variance /= colors.length;
  
  // Determine complexity and threshold
  let complexity: 'simple' | 'medium' | 'complex';
  let suggestedThreshold: number;
  
  if (variance < 30) {
    complexity = 'simple';
    suggestedThreshold = 20;
  } else if (variance < 60) {
    complexity = 'medium';
    suggestedThreshold = 30;
  } else {
    complexity = 'complex';
    suggestedThreshold = 40;
  }
  
  return {
    suggestedThreshold,
    backgroundColor,
    complexity
  };
}

    