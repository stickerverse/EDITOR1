
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

export default function Home() {
  const { toast } = useToast();
  const [originalStickerImage, setOriginalStickerImage] = useState<string | null>("https://placehold.co/800x800.png");
  const [displayedStickerImage, setDisplayedStickerImage] = useState<string>("https://placehold.co/800x800.png");

  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [backgroundRemoved, setBackgroundRemoved] = useState(false);
  const [backgroundRemovedImage, setBackgroundRemovedImage] = useState<string | null>(null);

  const handleStickerUpdate = (newImage: string) => {
    setOriginalStickerImage(newImage);
    setDisplayedStickerImage(newImage);
    setBackgroundRemoved(false);
    setBackgroundRemovedImage(null);
  };

  const handleBackgroundToggle = async (checked: boolean) => {
    setBackgroundRemoved(checked);

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


  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          <div className="flex flex-col items-center gap-4">
            <div className="sticky top-8 w-full max-w-lg aspect-square bg-card rounded-xl shadow-lg overflow-hidden border">
              {isRemovingBackground && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-10">
                  <Loader2 className="h-12 w-12 animate-spin text-white" />
                  <p className="text-white mt-4 font-semibold">Removing Background...</p>
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
                <CardContent className="p-4 flex items-center justify-between">
                    <Label htmlFor="background-switch" className="flex flex-col space-y-1">
                        <span className="font-medium">Remove Background</span>
                        <span className="text-xs text-muted-foreground">Automatically remove the background of your image.</span>
                    </Label>
                    <Switch
                        id="background-switch"
                        checked={backgroundRemoved}
                        onCheckedChange={handleBackgroundToggle}
                        disabled={isRemovingBackground || !originalStickerImage}
                    />
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
