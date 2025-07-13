
"use client";

import Image from 'next/image';
import { ProductCustomizer } from '@/components/product-customizer';
import { useState, useCallback, useEffect, useMemo } from 'react';
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

interface StickerState {
  // Base images
  originalUrl: string | null;
  bgRemovedUrl: string | null;

  // Bordered images, cached by settings
  borderedUrls: Record<string, string>;
  
  // UI Controls State
  bgRemoved: boolean;
  borderAdded: boolean;
  borderWidthIndex: number;
  borderColor: string;

  // Status
  isLoading: boolean;
  loadingText: string;
}

const initialState: StickerState = {
  originalUrl: null,
  bgRemovedUrl: null,
  borderedUrls: {},
  bgRemoved: false,
  borderAdded: false,
  borderWidthIndex: 1,
  borderColor: BORDER_COLORS[0].value,
  isLoading: false,
  loadingText: "",
};


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
  const [sticker, setSticker] = useState<StickerState>(initialState);
  
  const debouncedBorderWidthIndex = useDebounce(sticker.borderWidthIndex, 300);
  const debouncedBorderColor = useDebounce(sticker.borderColor, 300);

  const handleStickerUpdate = useCallback((newImage: string) => {
    // Reset state completely for the new image
    setSticker({
      ...initialState,
      originalUrl: newImage,
    });
  }, []);

  const handleBackgroundToggle = async (checked: boolean) => {
    setSticker(s => ({ ...s, bgRemoved: checked, borderAdded: checked ? s.borderAdded : false }));

    if (checked) {
      if (sticker.bgRemovedUrl) {
        // Already exists, do nothing
        return;
      }
      
      if (sticker.originalUrl) {
        setSticker(s => ({ ...s, isLoading: true, loadingText: "Removing Background..." }));
        try {
          const result = await removeBackground({ imageDataUri: sticker.originalUrl });
          if (result.imageDataUri) {
            setSticker(s => ({ ...s, bgRemovedUrl: result.imageDataUri }));
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
          setSticker(s => ({ ...s, bgRemoved: false })); // Revert switch on failure
        } finally {
          setSticker(s => ({ ...s, isLoading: false, loadingText: "" }));
        }
      }
    }
  };
  
  const handleBorderToggle = (checked: boolean) => {
    setSticker(s => ({ ...s, borderAdded: checked }));
  };
  
  const handleBorderWidthChange = (value: number[]) => {
    setSticker(s => ({...s, borderWidthIndex: value[0]}));
  };

  const handleBorderColorChange = (colorValue: string) => {
    setSticker(s => ({...s, borderColor: colorValue}));
  };

  // Effect to apply border when settings change
  useEffect(() => {
    const applyBorder = async () => {
      if (!sticker.bgRemovedUrl) return;

      const key = `${debouncedBorderWidthIndex}-${debouncedBorderColor}`;
      if (sticker.borderedUrls[key]) {
        // Already have this border, no need to re-generate
        return;
      }
      
      setSticker(s => ({ ...s, isLoading: true, loadingText: "Applying Border..." }));
      try {
        const result = await addBorder({
          imageDataUri: sticker.bgRemovedUrl,
          borderWidth: BORDER_WIDTHS[debouncedBorderWidthIndex],
          borderColor: debouncedBorderColor,
        });
        if (result.imageDataUri) {
          setSticker(s => ({ 
            ...s, 
            borderedUrls: { ...s.borderedUrls, [key]: result.imageDataUri }
          }));
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
        // We don't revert the switch here, to allow for retries
      } finally {
        setSticker(s => ({ ...s, isLoading: false, loadingText: "" }));
      }
    };
    
    if (sticker.borderAdded && sticker.bgRemoved) {
      applyBorder();
    }
  }, [
    debouncedBorderWidthIndex, 
    debouncedBorderColor, 
    sticker.borderAdded,
    sticker.bgRemoved, 
    sticker.bgRemovedUrl, 
    sticker.borderedUrls,
    toast
  ]);


  const imageToDisplay = useMemo(() => {
    if (sticker.borderAdded && sticker.bgRemoved) {
      const key = `${debouncedBorderWidthIndex}-${debouncedBorderColor}`;
      return sticker.borderedUrls[key] || sticker.bgRemovedUrl;
    }
    if (sticker.bgRemoved) {
      return sticker.bgRemovedUrl;
    }
    return sticker.originalUrl;
  }, [sticker, debouncedBorderColor, debouncedBorderWidthIndex]);

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          <div className="lg:sticky lg:top-8 h-max flex flex-col items-center gap-4">
            <div className="relative w-full max-w-lg aspect-square bg-card rounded-xl shadow-lg overflow-hidden border">
              {sticker.isLoading && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-10">
                  <Loader2 className="h-12 w-12 animate-spin text-white" />
                  <p className="text-white mt-4 font-semibold">{sticker.loadingText}</p>
                </div>
              )}
               <div className="relative w-full h-full">
                <Image
                    src={imageToDisplay || "https://placehold.co/800x800.png"}
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
                            checked={sticker.bgRemoved}
                            onCheckedChange={handleBackgroundToggle}
                            disabled={sticker.isLoading || !sticker.originalUrl}
                        />
                    </div>
                     <div className="flex items-center justify-between">
                        <Label htmlFor="border-switch" className="flex flex-col space-y-1">
                            <span className={cn("font-medium", !sticker.bgRemoved && "text-muted-foreground/50")}>Add Sticker Border</span>
                            <span className={cn("text-xs text-muted-foreground", !sticker.bgRemoved && "text-muted-foreground/50")}>Add a classic die-cut border.</span>
                        </Label>
                        <Switch
                            id="border-switch"
                            checked={sticker.borderAdded}
                            onCheckedChange={handleBorderToggle}
                            disabled={sticker.isLoading || !sticker.bgRemoved}
                        />
                    </div>
                    {sticker.borderAdded && (
                    <div className="space-y-4 pt-2 border-t border-dashed">
                        <div className="grid gap-2">
                           <Label className="text-sm font-medium">Border Width</Label>
                           <Slider
                             value={[sticker.borderWidthIndex]}
                             onValueChange={handleBorderWidthChange}
                             min={0}
                             max={BORDER_WIDTHS.length - 1}
                             step={1}
                             disabled={sticker.isLoading || !sticker.borderAdded}
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
                                            sticker.borderColor === color.value ? "ring-2 ring-offset-2 ring-primary" : "border-muted",
                                            (sticker.isLoading || !sticker.borderAdded) && "cursor-not-allowed opacity-50"
                                        )}
                                        style={{ backgroundColor: color.color }}
                                        disabled={sticker.isLoading || !sticker.borderAdded}
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
