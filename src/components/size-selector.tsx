
import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface Size {
    width: number;
    height: number;
    unit: 'in' | 'px';
    selectionType: 'preset' | 'custom';
    activePresetId: string | null;
}

interface SizeSelectorProps {
    size: Size;
    onSizeChange: (newSize: Size) => void;
}

const PRESET_SIZES = [
  { id: '1in', label: '1" x 1"', width: 1, height: 1 },
  { id: '2in', label: '2" x 2"', width: 2, height: 2 },
  { id: '3in', label: '3" x 3"', width: 3, height: 3 },
  { id: '4in', label: '4" x 4"', width: 4, height: 4 },
  { id: '5in', label: '5" x 5"', width: 5, height: 5 },
  { id: '6in', label: '6" x 6"', width: 6, height: 6 },
  { id: '7in', label: '7" x 7"', width: 7, height: 7 },
  { id: '8in', label: '8" x 8"', width: 8, height: 8 },
];

export function SizeSelector({ size, onSizeChange }: SizeSelectorProps) {
    
    const handlePresetClick = (preset: typeof PRESET_SIZES[0]) => {
        onSizeChange({
            ...size,
            width: preset.width,
            height: preset.height,
            selectionType: 'preset',
            activePresetId: preset.id,
        });
    };

    const handleCustomClick = () => {
        onSizeChange({
            ...size,
            selectionType: 'custom',
            activePresetId: 'custom',
        });
    };

    const handleCustomInputChange = (field: 'width' | 'height', value: string) => {
        const numericValue = parseFloat(value) || 0;
        onSizeChange({
            ...size,
            [field]: numericValue,
            selectionType: 'custom',
            activePresetId: 'custom',
        });
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PRESET_SIZES.map((preset) => {
                    const isActive = size.activePresetId === preset.id;
                    return (
                        <Button
                            key={preset.id}
                            variant="outline"
                            onClick={() => handlePresetClick(preset)}
                            aria-pressed={isActive}
                            className={cn(
                                "h-auto flex-row justify-center items-baseline gap-1.5 py-3 px-2 text-center transition-all duration-200",
                                isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg"
                            )}
                        >
                            <span className="font-bold text-base leading-none">{preset.label.split(' ')[0]}</span>
                            <span className="text-xs text-muted-foreground">x</span>
                             <span className="font-bold text-base leading-none">{preset.label.split(' ')[2]}</span>
                        </Button>
                    );
                })}
            </div>
            
            <Button
                variant="outline"
                onClick={handleCustomClick}
                 aria-pressed={size.selectionType === 'custom'}
                className={cn(
                    "w-full justify-center transition-all duration-200",
                     size.activePresetId === 'custom' && "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg"
                )}
            >
                Custom Size
            </Button>
            
            {size.selectionType === 'custom' && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                        <Label htmlFor="custom-width" className="mb-2 block">Width (in)</Label>
                        <Input
                            id="custom-width"
                            type="number"
                            value={size.width}
                            onChange={(e) => handleCustomInputChange('width', e.target.value)}
                            className="w-full"
                            placeholder="e.g. 3.5"
                        />
                    </div>
                    <div>
                         <Label htmlFor="custom-height" className="mb-2 block">Height (in)</Label>
                        <Input
                            id="custom-height"
                            type="number"
                            value={size.height}
                            onChange={(e) => handleCustomInputChange('height', e.target.value)}
                            className="w-full"
                             placeholder="e.g. 5"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
