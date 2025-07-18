'use server';
/**
 * @fileOverview Enhanced background removal implementation with multiple techniques,
 * edge detection, and adaptive thresholding for improved results
 */

import { z } from 'zod';
import sharp from 'sharp';

// ===================== SCHEMAS =====================

const RemoveBackgroundInputSchema = z.object({
  imageDataUri: z.string(),
  threshold: z.number().min(0).max(255).default(30),
  smoothing: z.number().min(0).max(10).default(2),
  featherRadius: z.number().min(0).max(20).default(3),
  mode: z.enum(['auto', 'manual', 'adaptive']).default('auto'),
  edgeDetection: z.boolean().default(true),
  adaptiveThreshold: z.boolean().default(true),
  manualHints: z.object({
    backgroundColor: z.object({
      r: z.number().min(0).max(255),
      g: z.number().min(0).max(255),
      b: z.number().min(0).max(255)
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
    technique: z.string(),
    backgroundColor: z.object({
      r: z.number(),
      g: z.number(),
      b: z.number()
    }),
    confidence: z.number()
  })
});

export type RemoveBackgroundOutput = z.infer<typeof RemoveBackgroundOutputSchema>;

// ===================== CONSTANTS =====================

const MAX_IMAGE_DIMENSION = 4096;
const EDGE_DETECTION_THRESHOLD = 20;
const ADAPTIVE_BLOCK_SIZE = 32;

// ===================== UTILITIES =====================

function dataUriToBuffer(dataUri: string): Buffer {
  const matches = dataUri.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid Data URI format');
  }
  return Buffer.from(matches[2], 'base64');
}

function bufferToDataUri(buffer: Buffer, mimeType: string = 'image/png'): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

interface Color {
  r: number;
  g: number;
  b: number;
}

/**
 * Enhanced background color detection with clustering
 */
async function getBackgroundColor(
  imageBuffer: Buffer, 
  manualHint?: Color
): Promise<{ color: Color; confidence: number }> {
  if (manualHint) {
    return { color: manualHint, confidence: 1.0 };
  }

  const image = sharp(imageBuffer);
  const { width, height } = await image.metadata();
  if (!width || !height) throw new Error("Invalid image dimensions");

  // Sample from edges and corners with weighted importance
  const sampleRegions = [
    // Corners (higher weight)
    { x: 0, y: 0, w: 20, h: 20, weight: 2 },
    { x: width - 20, y: 0, w: 20, h: 20, weight: 2 },
    { x: 0, y: height - 20, w: 20, h: 20, weight: 2 },
    { x: width - 20, y: height - 20, w: 20, h: 20, weight: 2 },
    // Edge centers (lower weight)
    { x: width / 2 - 10, y: 0, w: 20, h: 20, weight: 1 },
    { x: width / 2 - 10, y: height - 20, w: 20, h: 20, weight: 1 },
    { x: 0, y: height / 2 - 10, w: 20, h: 20, weight: 1 },
    { x: width - 20, y: height / 2 - 10, w: 20, h: 20, weight: 1 }
  ];

  const colorClusters: Map<string, { color: Color; count: number; weight: number }> = new Map();

  for (const region of sampleRegions) {
    try {
      const extractRegion = {
        left: Math.max(0, Math.floor(region.x)),
        top: Math.max(0, Math.floor(region.y)),
        width: Math.min(region.w, width - Math.floor(region.x)),
        height: Math.min(region.h, height - Math.floor(region.y))
      };

      const { data, info } = await image.clone()
        .extract(extractRegion)
        .raw()
        .toBuffer({ resolveWithObject: true });

      const channels = info.channels;
      
      // Collect colors from this region
      for (let i = 0; i < data.length; i += channels) {
        const color = {
          r: data[i],
          g: data[i + 1],
          b: data[i + 2]
        };
        
        // Quantize color to reduce noise
        const quantized = {
          r: Math.round(color.r / 8) * 8,
          g: Math.round(color.g / 8) * 8,
          b: Math.round(color.b / 8) * 8
        };
        
        const key = `${quantized.r}-${quantized.g}-${quantized.b}`;
        const existing = colorClusters.get(key);
        
        if (existing) {
          existing.count++;
          existing.weight += region.weight;
        } else {
          colorClusters.set(key, { 
            color: quantized, 
            count: 1, 
            weight: region.weight 
          });
        }
      }
    } catch (err) {
      console.warn(`Failed to sample region at (${region.x}, ${region.y})`, err);
    }
  }

  if (colorClusters.size === 0) {
    throw new Error("Failed to sample background color");
  }

  // Find dominant color cluster
  let dominantCluster = { color: { r: 0, g: 0, b: 0 }, weight: 0 };
  for (const cluster of colorClusters.values()) {
    const score = cluster.count * cluster.weight;
    if (score > dominantCluster.weight) {
      dominantCluster = { color: cluster.color, weight: score };
    }
  }

  // Calculate confidence based on color distribution
  const totalWeight = Array.from(colorClusters.values())
    .reduce((sum, cluster) => sum + (cluster.count * cluster.weight), 0);
  const confidence = dominantCluster.weight / totalWeight;

  return { 
    color: dominantCluster.color, 
    confidence: Math.min(confidence, 1.0) 
  };
}

// ===================== COLOR DISTANCE CALCULATION =====================

function calculateColorDistance(c1: Color, c2: Color): number {
  // Using CIE76 formula approximation for better perceptual accuracy
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

// ===================== EDGE DETECTION =====================

async function detectEdges(
  imageBuffer: Buffer,
  width: number,
  height: number
): Promise<Buffer> {
  // Convert to grayscale and apply Sobel edge detection
  const edgeBuffer = await sharp(imageBuffer)
    .grayscale()
    .convolve({
      width: 3,
      height: 3,
      kernel: [-1, -2, -1, 0, 0, 0, 1, 2, 1] // Sobel Y kernel
    })
    .toBuffer();

  return edgeBuffer;
}

// ===================== ADAPTIVE THRESHOLD =====================

function adaptiveThreshold(
  data: Buffer,
  width: number,
  height: number,
  baseThreshold: number
): Buffer {
  const mask = Buffer.alloc(width * height);
  const blockSize = ADAPTIVE_BLOCK_SIZE;
  
  for (let y = 0; y < height; y += blockSize) {
    for (let x = 0; x < width; x += blockSize) {
      // Calculate local threshold for this block
      let localSum = 0;
      let pixelCount = 0;
      
      const blockWidth = Math.min(blockSize, width - x);
      const blockHeight = Math.min(blockSize, height - y);
      
      for (let by = 0; by < blockHeight; by++) {
        for (let bx = 0; bx < blockWidth; bx++) {
          const idx = (y + by) * width + (x + bx);
          localSum += data[idx];
          pixelCount++;
        }
      }
      
      const localMean = localSum / pixelCount;
      const localThreshold = localMean * (baseThreshold / 255);
      
      // Apply threshold to block
      for (let by = 0; by < blockHeight; by++) {
        for (let bx = 0; bx < blockWidth; bx++) {
          const idx = (y + by) * width + (x + bx);
          mask[idx] = data[idx] > localThreshold ? 255 : 0;
        }
      }
    }
  }
  
  return mask;
}

// ===================== ENHANCED MASK CREATION =====================

async function createEnhancedMask(
  imageBuffer: Buffer,
  bgColor: Color,
  threshold: number,
  width: number,
  height: number,
  useEdgeDetection: boolean,
  useAdaptiveThreshold: boolean
): Promise<Buffer> {
  const { data } = await sharp(imageBuffer)
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Create initial color-based mask
  const colorMask = Buffer.alloc(width * height);
  const channels = data.length / (width * height);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = (y * width + x) * channels;
      const maskIndex = y * width + x;
      
      const pixelColor: Color = {
        r: data[pixelIndex],
        g: data[pixelIndex + 1],
        b: data[pixelIndex + 2]
      };
      
      const distance = calculateColorDistance(pixelColor, bgColor);
      colorMask[maskIndex] = distance;
    }
  }

  // Apply adaptive threshold if enabled
  let mask = useAdaptiveThreshold 
    ? adaptiveThreshold(colorMask, width, height, threshold)
    : Buffer.alloc(width * height);
    
  if (!useAdaptiveThreshold) {
    for (let i = 0; i < colorMask.length; i++) {
      mask[i] = colorMask[i] <= threshold ? 0 : 255;
    }
  }

  // Combine with edge detection if enabled
  if (useEdgeDetection) {
    const edges = await detectEdges(imageBuffer, width, height);
    const { data: edgeData } = await sharp(edges)
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    // Combine edge mask with color mask
    for (let i = 0; i < mask.length; i++) {
      if (edgeData[i] > EDGE_DETECTION_THRESHOLD) {
        mask[i] = 255; // Keep pixels near edges
      }
    }
  }

  return mask;
}

// ===================== MORPHOLOGICAL OPERATIONS =====================

async function applyMorphology(
  maskBuffer: Buffer,
  width: number,
  height: number,
  operations: Array<'erode' | 'dilate' | 'close' | 'open'>
): Promise<Buffer> {
  let processedMask = sharp(maskBuffer, {
    raw: { width, height, channels: 1 }
  });

  for (const op of operations) {
    switch (op) {
      case 'erode':
        processedMask = processedMask.convolve({
          width: 3,
          height: 3,
          kernel: [1, 1, 1, 1, 1, 1, 1, 1, 1],
          scale: 9,
          offset: -8
        });
        break;
      case 'dilate':
        processedMask = processedMask.convolve({
          width: 3,
          height: 3,
          kernel: [1, 1, 1, 1, 1, 1, 1, 1, 1],
          scale: 1,
          offset: 0
        });
        break;
      case 'close':
        // Dilate then erode
        processedMask = await applyMorphology(
          await processedMask.toBuffer(),
          width,
          height,
          ['dilate', 'erode']
        );
        return processedMask;
      case 'open':
        // Erode then dilate
        processedMask = await applyMorphology(
          await processedMask.toBuffer(),
          width,
          height,
          ['erode', 'dilate']
        );
        return processedMask;
    }
  }

  return processedMask.toBuffer();
}

// ===================== MAIN FUNCTION =====================

export async function removeBackground(input: RemoveBackgroundInput): Promise<RemoveBackgroundOutput> {
  const startTime = Date.now();
  
  try {
    const validatedInput = RemoveBackgroundInputSchema.parse(input);
    const imageBuffer = dataUriToBuffer(validatedInput.imageDataUri);
    
    // Get image metadata and validate dimensions
    const metadata = await sharp(imageBuffer).metadata();
    const { width, height } = metadata;
    
    if (!width || !height) {
      throw new Error('Invalid image dimensions');
    }
    
    if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
      throw new Error(`Image dimensions exceed maximum allowed size of ${MAX_IMAGE_DIMENSION}px`);
    }

    // Ensure image has alpha channel
    const rgbaBuffer = await sharp(imageBuffer)
      .ensureAlpha()
      .toBuffer();

    // Get background color with confidence
    const { color: bgColor, confidence } = await getBackgroundColor(
      imageBuffer,
      validatedInput.manualHints?.backgroundColor
    );

    // Create enhanced mask
    const maskBuffer = await createEnhancedMask(
      rgbaBuffer,
      bgColor,
      validatedInput.threshold,
      width,
      height,
      validatedInput.edgeDetection,
      validatedInput.adaptiveThreshold
    );

    // Apply morphological operations for cleaner mask
    let refinedMask = await applyMorphology(
      maskBuffer,
      width,
      height,
      ['open', 'close'] // Remove small holes and smooth edges
    );

    // Apply smoothing if requested
    if (validatedInput.smoothing > 0) {
      refinedMask = await sharp(refinedMask, {
        raw: { width, height, channels: 1 }
      })
        .median(Math.max(3, validatedInput.smoothing * 2 - 1))
        .toBuffer();
    }

    // Apply feathering to soften edges
    if (validatedInput.featherRadius > 0) {
      refinedMask = await sharp(refinedMask, {
        raw: { width, height, channels: 1 }
      })
        .blur(validatedInput.featherRadius)
        .toBuffer();
    }

    // Apply mask to original image
    const outputBuffer = await sharp(imageBuffer)
      .ensureAlpha()
      .composite([{
        input: refinedMask,
        blend: 'dest-in'
      }])
      .png({ 
        compressionLevel: 9,
        quality: 100,
        effort: 10
      })
      .toBuffer();

    // Create visual mask for debugging
    const visualMaskBuffer = await sharp(refinedMask, {
      raw: { width, height, channels: 1 }
    })
      .png()
      .toBuffer();

    return {
      imageDataUri: bufferToDataUri(outputBuffer),
      mask: bufferToDataUri(visualMaskBuffer),
      metadata: {
        processingTime: Date.now() - startTime,
        dimensions: { width, height },
        technique: `Enhanced color segmentation with ${validatedInput.edgeDetection ? 'edge detection' : 'threshold'} and ${validatedInput.adaptiveThreshold ? 'adaptive' : 'fixed'} threshold`,
        backgroundColor: bgColor,
        confidence
      }
    };
  } catch (error) {
    console.error('Background removal error:', error);
    throw new Error(`Failed to remove background: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ===================== AUTO MODE =====================

export async function removeBackgroundAuto(imageDataUri: string): Promise<RemoveBackgroundOutput> {
  // First analyze the image
  const analysis = await analyzeImage(imageDataUri);
  
  // Determine best parameters based on complexity
  const params: RemoveBackgroundInput = {
    imageDataUri,
    threshold: analysis.suggestedThreshold,
    smoothing: analysis.complexity === 'complex' ? 3 : 2,
    featherRadius: analysis.complexity === 'simple' ? 1 : 3,
    mode: 'auto',
    edgeDetection: analysis.complexity !== 'simple',
    adaptiveThreshold: analysis.complexity === 'complex'
  };
  
  return removeBackground(params);
}

// ===================== IMPROVED ANALYSIS =====================

export async function analyzeImage(imageDataUri: string): Promise<{
  suggestedThreshold: number;
  backgroundColor: Color;
  complexity: 'simple' | 'medium' | 'complex';
  histogram: {
    r: number[];
    g: number[];
    b: number[];
  };
}> {
  const buffer = dataUriToBuffer(imageDataUri);
  const image = sharp(buffer);
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  
  if (!width || !height) {
    throw new Error('Invalid image dimensions');
  }
  
  // Get background color
  const { color: backgroundColor } = await getBackgroundColor(buffer);
  
  // Initialize histograms
  const histogram = {
    r: new Array(256).fill(0),
    g: new Array(256).fill(0),
    b: new Array(256).fill(0)
  };
  
  // Analyze color distribution and variance
  let colorVariance = 0;
  let edgePixels = 0;
  const sampleSize = Math.min(10000, width * height);
  const step = Math.floor((width * height) / sampleSize);
  
  for (let i = 0; i < data.length; i += step * channels) {
    const pixelColor: Color = {
      r: data[i],
      g: data[i + 1],
      b: data[i + 2]
    };
    
    // Update histogram
    histogram.r[pixelColor.r]++;
    histogram.g[pixelColor.g]++;
    histogram.b[pixelColor.b]++;
    
    const distance = calculateColorDistance(pixelColor, backgroundColor);
    colorVariance += distance;
    
    // Check if pixel is likely an edge
    if (distance > 50 && distance < 150) {
      edgePixels++;
    }
  }
  
  colorVariance /= sampleSize;
  const edgeRatio = edgePixels / sampleSize;
  
  // Calculate histogram spread (standard deviation)
  const calculateSpread = (hist: number[]): number => {
    const total = hist.reduce((a, b) => a + b, 0);
    const mean = hist.reduce((a, b, i) => a + b * i, 0) / total;
    const variance = hist.reduce((a, b, i) => a + b * Math.pow(i - mean, 2), 0) / total;
    return Math.sqrt(variance);
  };
  
  const spreads = {
    r: calculateSpread(histogram.r),
    g: calculateSpread(histogram.g),
    b: calculateSpread(histogram.b)
  };
  
  const avgSpread = (spreads.r + spreads.g + spreads.b) / 3;
  
  // Determine complexity based on multiple factors
  let complexity: 'simple' | 'medium' | 'complex';
  let suggestedThreshold: number;
  
  if (colorVariance < 40 && avgSpread < 30 && edgeRatio < 0.1) {
    complexity = 'simple';
    suggestedThreshold = 20;
  } else if (colorVariance < 80 && avgSpread < 60 && edgeRatio < 0.3) {
    complexity = 'medium';
    suggestedThreshold = 35;
  } else {
    complexity = 'complex';
    suggestedThreshold = 50;
  }
  
  // Adjust threshold based on background color brightness
  const brightness = (backgroundColor.r + backgroundColor.g + backgroundColor.b) / 3;
  if (brightness > 200) {
    // Light background - decrease threshold
    suggestedThreshold *= 0.8;
  } else if (brightness < 50) {
    // Dark background - increase threshold
    suggestedThreshold *= 1.2;
  }
  
  return {
    suggestedThreshold: Math.round(suggestedThreshold),
    backgroundColor,
    complexity,
    histogram
  };
}

// ===================== VALIDATION =====================

export async function validateImageForBackgroundRemoval(
  imageDataUri: string
): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
}> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    const buffer = dataUriToBuffer(imageDataUri);
    const image = sharp(buffer);
    const metadata = await image.metadata();
    
    const { width, height, format } = metadata;
    const size = buffer.length;
    
    // Check dimensions
    if (!width || !height) {
      errors.push('Unable to determine image dimensions');
    } else {
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        errors.push(`Image dimensions (${width}x${height}) exceed maximum allowed size of ${MAX_IMAGE_DIMENSION}px`);
      }
      if (width < 50 || height < 50) {
        errors.push('Image is too small (minimum 50x50 pixels)');
      }
      if (width > 2048 || height > 2048) {
        warnings.push('Large images may take longer to process');
      }
    }
    
    // Check format
    const supportedFormats = ['jpeg', 'jpg', 'png', 'webp'];
    if (format && !supportedFormats.includes(format)) {
      warnings.push(`Format ${format} may not produce optimal results`);
    }
    
    // Check file size
    if (size > 10 * 1024 * 1024) {
      errors.push('Image file size exceeds 10MB limit');
    } else if (size > 5 * 1024 * 1024) {
      warnings.push('Large file size may result in slower processing');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metadata: width && height && format ? { width, height, format, size } : undefined
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`Invalid image: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings
    };
  }
}