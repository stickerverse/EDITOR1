
"use client";

import Image from 'next/image';
import { ProductCustomizer } from '@/components/product-customizer';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { removeBackground } from '@/ai/flows/remove-background-flow';
import { addBorder } from '@/ai/flows/add-border-flow';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

const BORDER_WIDTHS = ["thin", "medium", "thick", "extra-thick"];
const BORDER_COLORS = [
  { value: "white", label: "White", color: "#FFFFFF" },
  { value: "black", label: "Black", color: "#000000" },
  { value: "red", label: "Red", color: "#EF4444" },
  { value: "blue", label: "Blue", color: "#3B82F6" },
  { value: "green", label: "Green", color: "#22C55E" },
];

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function Home() {
  const { toast } = useToast();
  
  // The user's original uploaded or generated image
  const [originalStickerImage, setOriginalStickerImage] = useState<string | null>(null);
  
  // The image currently being displayed in the preview
  const [displayedStickerImage, setDisplayedStickerImage] = useState<string | null>(null);

  // Background removal state
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [backgroundRemoved, setBackgroundRemoved] = useState(false);
  const [backgroundRemovedImage, setBackgroundRemovedImage] = useState<string | null>(null);

  // Border addition state
  const [isAddingBorder, setIsAddingBorder] = useState(false);
  const [borderAdded, setBorderAdded] = useState(false);
  const [borderWidthIndex, setBorderWidthIndex] = useState(1);
  const [borderColor, setBorderColor] = useState(BORDER_COLORS[0].value);
  const [borderPreviews, setBorderPreviews] = useState<Record<string, string>>({});

  const debouncedBorderWidthIndex = useDebounce(borderWidthIndex, 300);

  // This function is called when a new sticker is generated or uploaded
  const handleStickerUpdate = useCallback((newImage: string) => {
    setOriginalStickerImage(newImage);
    setDisplayedStickerImage(newImage);
    // Reset all modifications
    setBackgroundRemoved(false);
    setBackgroundRemovedImage(null);
    setBorderAdded(false);
    setBorderPreviews({});
    setBorderWidthIndex(1);
    setBorderColor(BORDER_COLORS[0].value);
  }, []);

  const handleBackgroundToggle = async (checked: boolean) => {
    setBackgroundRemoved(checked);

    if (checked) {
      // Toggling ON
      if (backgroundRemovedImage) {
        // If we already have a background-removed image, just display it
        setDisplayedStickerImage(backgroundRemovedImage);
      } else if (originalStickerImage) {
        // Otherwise, process the original image
        setIsRemovingBackground(true);
        try {
          const result = await removeBackground({ imageDataUri: originalStickerImage });
          if (result.imageDataUri) {
            setBackgroundRemovedImage(result.imageDataUri);
            setDisplayedStickerImage(result.imageDataUri);
            toast({
              title: 'Success!',
              description: 'The background has been removed.',
            });
          } else {
            throw new Error('Background removal failed to return data.');
          }
        } catch (error) {
          console.error('Background removal failed:', error);
          toast({
            variant: 'destructive',
            title: 'Background Removal Failed',
            description: 'Could not remove background. Please try again.',
          });
          setBackgroundRemoved(false); // Revert switch on failure
        } finally {
          setIsRemovingBackground(false);
        }
      }
    } else {
      // Toggling OFF
      setBorderAdded(false); // Can't have a border without a removed background
      setDisplayedStickerImage(originalStickerImage); // Go back to original
    }
  };

  const applyBorder = useCallback(async (imageToBorder: string, widthIndex: number, color: string) => {
    const key = `${widthIndex}-${color}`;
    // If we have a cached preview, use it
    if (borderPreviews[key]) {
      setDisplayedStickerImage(borderPreviews[key]);
      return;
    }
    
    setIsAddingBorder(true);
    try {
      const result = await addBorder({
        imageDataUri: imageToBorder,
        borderWidth: BORDER_WIDTHS[widthIndex],
        borderColor: color,
      });
      if (result.imageDataUri) {
        // Cache the new preview and display it
        setBorderPreviews(prev => ({ ...prev, [key]: result.imageDataUri }));
        setDisplayedStickerImage(result.imageDataUri);
      } else {
        throw new Error('Border addition failed to return data.');
      }
    } catch (error) {
      console.error('Adding border failed:', error);
      toast({
        variant: 'destructive',
        title: 'Border Addition Failed',
        description: 'Could not add border. Please try again.',
      });
      setBorderAdded(false); // Revert switch on failure
    } finally {
      setIsAddingBorder(false);
    }
  }, [borderPreviews, toast]);

  // Effect to apply border when settings change
  useEffect(() => {
    if (borderAdded && backgroundRemovedImage) {
      applyBorder(backgroundRemovedImage, debouncedBorderWidthIndex, borderColor);
    }
  }, [debouncedBorderWidthIndex, borderColor, borderAdded, backgroundRemovedImage, applyBorder]);

  const handleBorderToggle = (checked: boolean) => {
    setBorderAdded(checked);
    if (!checked) {
      // If turning border off, go back to the background-removed image
      setDisplayedStickerImage(backgroundRemovedImage);
    }
  };

  const handleBorderWidthChange = (value: number[]) => {
    setBorderWidthIndex(value[0]);
  };

  const handleBorderColorChange = (colorValue: string) => {
    setBorderColor(colorValue);
  };

  const isLoading = isRemovingBackground || isAddingBorder;
  const loadingText = isRemovingBackground ? "Removing Background..." : isAddingBorder ? "Applying Border..." : "";
  const imageToDisplay = displayedStickerImage || "https://placehold.co/800x800.png";


  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          <div className="lg:sticky lg:top-8 h-max flex flex-col items-center gap-4">
            <div className="relative w-full max-w-lg aspect-square bg-card rounded-xl shadow-lg overflow-hidden border">
              {isLoading && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-10">
                  <Loader2 className="h-12 w-12 animate-spin text-white" />
                  <p className="text-white mt-4 font-semibold">{loadingText}</p>
                </div>
              )}
               <div className="relative w-full h-full">
                <Image
                    src={imageToDisplay}
                    alt="Custom Sticker Preview"
                    fill
                    className="object-contain p-4 transition-transform duration-300 hover:scale-105"
                    data-ai-hint="sticker design"
                    priority
                />
              </div>
            </div>
             <Card className="w-full max-w-lg">
                <CardContent className="p-4 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="background-switch" className="flex flex-col space-y-1">
                            <span className="font-medium">Remove Background</span>
                            <span className="text-xs text-muted-foreground">Automatically remove the image background.</span>
                        </Label>
                        <Switch
                            id="background-switch"
                            checked={backgroundRemoved}
                            onCheckedChange={handleBackgroundToggle}
                            disabled={isLoading || !originalStickerImage}
                        />
                    </div>
                     <div className="flex items-center justify-between">
                        <Label htmlFor="border-switch" className="flex flex-col space-y-1">
                            <span className={cn("font-medium", !backgroundRemoved && "text-muted-foreground/50")}>Add Sticker Border</span>
                            <span className={cn("text-xs text-muted-foreground", !backgroundRemoved && "text-muted-foreground/50")}>Add a classic die-cut border.</span>
                        </Label>
                        <Switch
                            id="border-switch"
                            checked={borderAdded}
                            onCheckedChange={handleBorderToggle}
                            disabled={isLoading || !backgroundRemoved}
                        />
                    </div>
                    {borderAdded && (
                    <div className="space-y-4 pt-2 border-t border-dashed">
                        <div className="grid gap-2">
                           <Label className="text-sm font-medium">Border Width</Label>
                           <Slider
                             value={[borderWidthIndex]}
                             onValueChange={handleBorderWidthChange}
                             min={0}
                             max={BORDER_WIDTHS.length - 1}
                             step={1}
                             disabled={isLoading || !borderAdded}
                           />
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-sm font-medium">Border Color</Label>
                            <div className="flex items-center gap-2">
                                {BORDER_COLORS.map(color => (
                                    <button
                                        key={color.value}
                                        type="button"
                                        title={color.label}
                                        onClick={() => handleBorderColorChange(color.value)}
                                        className={cn(
                                            "w-8 h-8 rounded-full border-2 transition-transform hover:scale-110",
                                            borderColor === color.value ? "ring-2 ring-offset-2 ring-primary" : "border-muted",
                                            (isLoading || !borderAdded) && "cursor-not-allowed opacity-50"
                                        )}
                                        style={{ backgroundColor: color.color }}
                                        disabled={isLoading || !borderAdded}
                                    >
                                      <span className="sr-only">{color.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    )}
                </CardContent>
            </Card>
          </div>
          
          <div className="flex flex-col">
            <ProductCustomizer onStickerUpdate={handleStickerUpdate} />
          </div>
        </div>
      </main>
    </div>
  );
}
