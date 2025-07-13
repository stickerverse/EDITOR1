
"use client";

import Image from 'next/image';
import { ProductCustomizer } from '@/components/product-customizer';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { removeBackground } from '@/ai/flows/remove-background-flow';
import { addBorder } from '@/ai/flows/add-border-flow';
import { cn } from '@/lib/utils';

export default function Home() {
  const { toast } = useToast();
  const [originalStickerImage, setOriginalStickerImage] = useState<string | null>("https://placehold.co/800x800.png");
  const [displayedStickerImage, setDisplayedStickerImage] = useState<string>("https://placehold.co/800x800.png");

  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [backgroundRemoved, setBackgroundRemoved] = useState(false);
  const [backgroundRemovedImage, setBackgroundRemovedImage] = useState<string | null>(null);

  const [isAddingBorder, setIsAddingBorder] = useState(false);
  const [borderAdded, setBorderAdded] = useState(false);
  const [borderedImage, setBorderedImage] = useState<string | null>(null);

  const handleStickerUpdate = (newImage: string) => {
    setOriginalStickerImage(newImage);
    setDisplayedStickerImage(newImage);
    setBackgroundRemoved(false);
    setBackgroundRemovedImage(null);
    setBorderAdded(false);
    setBorderedImage(null);
  };

  const handleBackgroundToggle = async (checked: boolean) => {
    setBackgroundRemoved(checked);
    // If background is removed, border must also be removed
    if (!checked) {
      setBorderAdded(false);
    }

    if (checked) {
      if (backgroundRemovedImage) {
        setDisplayedStickerImage(backgroundRemovedImage);
      } else if (originalStickerImage) {
        setIsRemovingBackground(true);
        try {
          const result = await removeBackground({ imageDataUri: originalStickerImage });
          if (result.imageDataUri) {
            setBackgroundRemovedImage(result.imageDataUri);
            setDisplayedStickerImage(result.imageDataUri);
            toast({
              title: 'Background Removed!',
              description: 'The background has been successfully removed.',
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
          setBackgroundRemoved(false); // Revert toggle on failure
        } finally {
          setIsRemovingBackground(false);
        }
      }
    } else {
      if (originalStickerImage) {
        setDisplayedStickerImage(originalStickerImage);
      }
    }
  };

  const handleBorderToggle = async (checked: boolean) => {
    setBorderAdded(checked);

    if (checked) {
      if (borderedImage) {
        setDisplayedStickerImage(borderedImage);
      } else if (backgroundRemovedImage) {
        setIsAddingBorder(true);
        try {
          const result = await addBorder({ imageDataUri: backgroundRemovedImage });
          if (result.imageDataUri) {
            setBorderedImage(result.imageDataUri);
            setDisplayedStickerImage(result.imageDataUri);
             toast({
              title: 'Border Added!',
              description: 'A classic sticker border has been added.',
            });
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
          setBorderAdded(false); // Revert toggle on failure
        } finally {
          setIsAddingBorder(false);
        }
      }
    } else {
        if(backgroundRemovedImage) {
            setDisplayedStickerImage(backgroundRemovedImage);
        }
    }
  }

  const isLoading = isRemovingBackground || isAddingBorder;
  const loadingText = isRemovingBackground ? "Removing Background..." : isAddingBorder ? "Adding Border..." : "";


  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          <div className="flex flex-col items-center gap-4">
            <div className="sticky top-8 w-full max-w-lg aspect-square bg-card rounded-xl shadow-lg overflow-hidden border">
              {isLoading && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-10">
                  <Loader2 className="h-12 w-12 animate-spin text-white" />
                  <p className="text-white mt-4 font-semibold">{loadingText}</p>
                </div>
              )}
              <Image
                src={displayedStickerImage}
                alt="Custom Sticker Preview"
                fill
                className="object-contain p-4 transition-transform duration-300 hover:scale-105"
                data-ai-hint="sticker design"
                priority
              />
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
                            <span className={cn("text-xs text-muted-foreground", !backgroundRemoved && "text-muted-foreground/50")}>Add a classic white border for a die-cut look.</span>
                        </Label>
                        <Switch
                            id="border-switch"
                            checked={borderAdded}
                            onCheckedChange={handleBorderToggle}
                            disabled={isLoading || !backgroundRemoved}
                        />
                    </div>
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
