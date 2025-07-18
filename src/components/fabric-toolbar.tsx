"use client";

import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Eraser, 
  Square, 
  Circle, 
  Heart, 
  Star, 
  Triangle,
  Smile,
  Crown,
  Shield,
  Zap,
  Palette,
  Scissors,
  FileImage,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BorderStyle {
  width: number;
  color: string;
  style: 'solid' | 'dashed' | 'dotted';
}

interface FabricToolbarProps {
  onRemoveBackground: () => void | Promise<void>;
  onAddBorder: (borderStyle: BorderStyle) => void | Promise<void>;
  onBorderPreview?: (borderStyle: BorderStyle) => void;
  onClearBorderPreview?: () => void;
  onAddClipart: (clipartId: string) => void;
  isLoading?: boolean;
  hasActiveImage?: boolean;
}

// Clipart categories and icons with proper typing
interface ClipartItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  name: string;
}

interface ClipartCategory {
  category: string;
  items: ClipartItem[];
}

const clipartLibrary: ClipartCategory[] = [
  {
    category: 'Basic Shapes',
    items: [
      { id: 'square', icon: Square, name: 'Square' },
      { id: 'circle', icon: Circle, name: 'Circle' },
      { id: 'triangle', icon: Triangle, name: 'Triangle' },
    ]
  },
  {
    category: 'Fun Icons',
    items: [
      { id: 'heart', icon: Heart, name: 'Heart' },
      { id: 'star', icon: Star, name: 'Star' },
      { id: 'smile', icon: Smile, name: 'Smile' },
      { id: 'crown', icon: Crown, name: 'Crown' },
      { id: 'shield', icon: Shield, name: 'Shield' },
      { id: 'zap', icon: Zap, name: 'Lightning' },
    ]
  }
];

// Default border settings
const DEFAULT_BORDER_WIDTH = 3;
const DEFAULT_BORDER_COLOR = '#ffffff';
const DEFAULT_BORDER_STYLE: 'solid' | 'dashed' | 'dotted' = 'solid';

export function FabricToolbar({ 
  onRemoveBackground, 
  onAddBorder, 
  onBorderPreview,
  onClearBorderPreview,
  onAddClipart, 
  isLoading = false,
  hasActiveImage = false 
}: FabricToolbarProps) {
  const [borderWidth, setBorderWidth] = useState<number[]>([DEFAULT_BORDER_WIDTH]);
  const [borderColor, setBorderColor] = useState(DEFAULT_BORDER_COLOR);
  const [borderStyle, setBorderStyle] = useState<'solid' | 'dashed' | 'dotted'>(DEFAULT_BORDER_STYLE);
  const [activeTab, setActiveTab] = useState('background');
  const [isProcessing, setIsProcessing] = useState(false);

  const currentBorderStyle: BorderStyle = {
    width: borderWidth[0],
    color: borderColor,
    style: borderStyle
  };

  // Clear preview when switching tabs or when component unmounts
  useEffect(() => {
    return () => {
      if (onClearBorderPreview) {
        onClearBorderPreview();
      }
    };
  }, [onClearBorderPreview]);

  // Live preview when any border setting changes
  const handleBorderWidthChange = (value: number[]) => {
    setBorderWidth(value);
    if (onBorderPreview && hasActiveImage) {
      const newStyle = { ...currentBorderStyle, width: value[0] };
      onBorderPreview(newStyle);
    }
  };

  const handleBorderColorChange = (color: string) => {
    setBorderColor(color);
    if (onBorderPreview && hasActiveImage) {
      const newStyle = { ...currentBorderStyle, color };
      onBorderPreview(newStyle);
    }
  };

  const handleBorderStyleChange = (style: 'solid' | 'dashed' | 'dotted') => {
    setBorderStyle(style);
    if (onBorderPreview && hasActiveImage) {
      const newStyle = { ...currentBorderStyle, style };
      onBorderPreview(newStyle);
    }
  };

  const handleAddBorder = async () => {
    if (!hasActiveImage) return;
    
    setIsProcessing(true);
    try {
      await onAddBorder(currentBorderStyle);
    } catch (error) {
      console.error('Error applying border:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveBackground = async () => {
    if (!hasActiveImage) return;
    
    setIsProcessing(true);
    try {
      await onRemoveBackground();
    } catch (error) {
      console.error('Error removing background:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Clear border preview when switching away from border tab
    if (value !== 'border' && onClearBorderPreview) {
      onClearBorderPreview();
    }
    // Set preview when switching to border tab
    if (value === 'border' && onBorderPreview && hasActiveImage) {
      onBorderPreview(currentBorderStyle);
    }
  };

  const handleAddClipart = (clipartId: string) => {
    onAddClipart(clipartId);
  };

  return (
    <Card className="w-full shadow-lg">
      <div className="p-4">
        <Tabs 
          value={activeTab} 
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="background">
              <Eraser className="mr-2 h-4 w-4" />
              Background
            </TabsTrigger>
            <TabsTrigger value="border">
              <Scissors className="mr-2 h-4 w-4" />
              Border
            </TabsTrigger>
            <TabsTrigger value="clipart">
              <FileImage className="mr-2 h-4 w-4" />
              Clipart
            </TabsTrigger>
          </TabsList>

          <TabsContent value="background" className="mt-4">
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Background Removal</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Remove the background from your selected image to create clean stickers
                </p>
                <Button 
                  onClick={handleRemoveBackground}
                  disabled={!hasActiveImage || isLoading || isProcessing}
                  className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold px-6 py-2"
                >
                  {(isLoading || isProcessing) ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Eraser className="mr-2 h-4 w-4" />
                      Remove Background
                    </>
                  )}
                </Button>
                {!hasActiveImage && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Select an image on the canvas to enable this feature
                  </p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="border" className="mt-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Border Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="border-width">Border Width</Label>
                  <Slider
                    id="border-width"
                    value={borderWidth}
                    onValueChange={handleBorderWidthChange}
                    max={20}
                    min={1}
                    step={1}
                    className="w-full"
                    disabled={!hasActiveImage}
                  />
                  <span className="text-sm text-muted-foreground">{borderWidth[0]}px</span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="border-color">Border Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="border-color"
                      type="color"
                      value={borderColor}
                      onChange={(e) => handleBorderColorChange(e.target.value)}
                      className="w-12 h-10 rounded border bg-background cursor-pointer disabled:cursor-not-allowed"
                      disabled={!hasActiveImage}
                    />
                    <span className="text-sm text-muted-foreground">{borderColor}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="border-style">Border Style</Label>
                  <Select 
                    value={borderStyle} 
                    onValueChange={handleBorderStyleChange}
                    disabled={!hasActiveImage}
                  >
                    <SelectTrigger id="border-style">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solid">Solid</SelectItem>
                      <SelectItem value="dashed">Dashed</SelectItem>
                      <SelectItem value="dotted">Dotted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {hasActiveImage && onBorderPreview && (
                <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
                  <p>Preview is shown on the selected image. Adjust settings to see changes.</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={handleAddBorder}
                  disabled={!hasActiveImage || isLoading || isProcessing}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold"
                >
                  {(isLoading || isProcessing) ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <Palette className="mr-2 h-4 w-4" />
                      Apply Border
                    </>
                  )}
                </Button>
                {onClearBorderPreview && (
                  <Button 
                    onClick={onClearBorderPreview}
                    disabled={!hasActiveImage}
                    variant="outline"
                  >
                    Clear Preview
                  </Button>
                )}
              </div>

              {!hasActiveImage && (
                <p className="text-xs text-center text-muted-foreground">
                  Select an image on the canvas to enable border settings
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="clipart" className="mt-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Add Clipart</h3>
              
              {clipartLibrary.map((category) => (
                <div key={category.category} className="space-y-2">
                  <h4 className="text-md font-medium text-muted-foreground">{category.category}</h4>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {category.items.map((item) => {
                      const IconComponent = item.icon;
                      return (
                        <Button
                          key={item.id}
                          variant="outline"
                          onClick={() => handleAddClipart(item.id)}
                          disabled={isLoading}
                          className={cn(
                            "h-16 flex flex-col items-center gap-1",
                            "bg-secondary hover:bg-muted",
                            "text-foreground hover:text-foreground",
                            "transition-all duration-200 hover:scale-105",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                          )}
                        >
                          <IconComponent className="h-6 w-6" />
                          <span className="text-xs">{item.name}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
              
              <div className="mt-4 p-3 bg-muted/50 rounded-md">
                <p className="text-xs text-muted-foreground">
                  Click on any clipart to add it to your canvas. You can then resize, rotate, and position it as needed.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
}

// Export the BorderStyle type for use in other components
export type { BorderStyle };