"use client";

import React, { useState } from 'react';
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
  FileImage
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FabricToolbarProps {
  onRemoveBackground: () => void;
  onAddBorder: (borderStyle: BorderStyle) => void;
  onBorderPreview: (borderStyle: BorderStyle) => void;
  onClearBorderPreview: () => void;
  onAddClipart: (clipartId: string) => void;
  isLoading?: boolean;
  hasActiveImage?: boolean;
}

interface BorderStyle {
  width: number;
  color: string;
  style: 'solid' | 'dashed' | 'dotted';
}

// Clipart categories and icons
const clipartLibrary = [
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

export function FabricToolbar({ 
  onRemoveBackground, 
  onAddBorder, 
  onBorderPreview,
  onClearBorderPreview,
  onAddClipart, 
  isLoading = false,
  hasActiveImage = false 
}: FabricToolbarProps) {
  const [borderWidth, setBorderWidth] = useState([3]);
  const [borderColor, setBorderColor] = useState('#ffffff');
  const [borderStyle, setBorderStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');

  const currentBorderStyle = {
    width: borderWidth[0],
    color: borderColor,
    style: borderStyle
  };

  // Live preview when any border setting changes
  const handleBorderWidthChange = (value: number[]) => {
    setBorderWidth(value);
    const newStyle = { ...currentBorderStyle, width: value[0] };
    onBorderPreview(newStyle);
  };

  const handleBorderColorChange = (color: string) => {
    setBorderColor(color);
    const newStyle = { ...currentBorderStyle, color };
    onBorderPreview(newStyle);
  };

  const handleBorderStyleChange = (style: 'solid' | 'dashed' | 'dotted') => {
    setBorderStyle(style);
    const newStyle = { ...currentBorderStyle, style };
    onBorderPreview(newStyle);
  };

  const handleAddBorder = () => {
    onAddBorder(currentBorderStyle);
  };

  return (
    <Card className="w-full bg-slate-900/50 border-slate-700">
      <div className="p-4">
        <Tabs defaultValue="background" className="w-full" onValueChange={(value) => { if (value !== 'border') onClearBorderPreview(); }}>
          <TabsList className="grid w-full grid-cols-3 bg-slate-800 text-slate-400">
            <TabsTrigger value="background" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white transition-all duration-200">
              <Eraser className="mr-2 h-4 w-4" />
              Background
            </TabsTrigger>
            <TabsTrigger value="border" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white transition-all duration-200">
              <Scissors className="mr-2 h-4 w-4" />
              Border
            </TabsTrigger>
            <TabsTrigger value="clipart" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white transition-all duration-200">
              <FileImage className="mr-2 h-4 w-4" />
              Clipart
            </TabsTrigger>
          </TabsList>

          <TabsContent value="background" className="mt-4">
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-white mb-2">Background Removal</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Remove the background from your uploaded image to create clean stickers
                </p>
                <Button 
                  onClick={onRemoveBackground}
                  disabled={!hasActiveImage || isLoading}
                  className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold px-6 py-2"
                >
                  {isLoading ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Eraser className="mr-2 h-4 w-4" />
                      Remove Background
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="border" className="mt-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Border Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Border Width</Label>
                  <Slider
                    value={borderWidth}
                    onValueChange={handleBorderWidthChange}
                    max={20}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <span className="text-sm text-slate-400">{borderWidth[0]}px</span>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Border Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={borderColor}
                      onChange={(e) => handleBorderColorChange(e.target.value)}
                      className="w-12 h-10 rounded border border-slate-600 bg-slate-800"
                    />
                    <span className="text-sm text-slate-400">{borderColor}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Border Style</Label>
                  <Select value={borderStyle} onValueChange={handleBorderStyleChange}>
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      <SelectItem value="solid">Solid</SelectItem>
                      <SelectItem value="dashed">Dashed</SelectItem>
                      <SelectItem value="dotted">Dotted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleAddBorder}
                  disabled={!hasActiveImage}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold"
                >
                  <Palette className="mr-2 h-4 w-4" />
                  Apply Border
                </Button>
                <Button 
                  onClick={onClearBorderPreview}
                  disabled={!hasActiveImage}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Clear Preview
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="clipart" className="mt-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Add Clipart</h3>
              
              {clipartLibrary.map((category) => (
                <div key={category.category} className="space-y-2">
                  <h4 className="text-md font-medium text-slate-300">{category.category}</h4>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {category.items.map((item) => {
                      const IconComponent = item.icon;
                      return (
                        <Button
                          key={item.id}
                          variant="outline"
                          onClick={() => {
                            onAddClipart(item.id);
                          }}
                          className={cn(
                            "h-16 flex flex-col items-center gap-1 border-slate-600 bg-slate-800/50 hover:bg-slate-700 hover:border-slate-500 text-slate-300 hover:text-white transition-all duration-200 hover:scale-105"
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
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
}