
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
  { id: 'sm', label: '2" x 2"', width: 2, height: 2 },
  { id: 'md', label: '3" x 3"', width: 3, height: 3 },
  { id: 'lg', label: '4" x 4"', width: 4, height: 4 },
  { id: 'xl', label: '5" x 5"', width: 5, height: 5 },
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
                                "h-auto flex-col py-3 px-2 text-center transition-all duration-200",
                                "border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 hover:text-white",
                                isActive && "ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900 shadow-lg shadow-indigo-500/70"
                            )}
                        >
                            <span className="font-bold text-lg leading-none">{preset.label.split(' ')[0]}</span>
                            <span className="text-xs text-slate-400 mt-1">x {preset.label.split(' ')[2]}</span>
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
                    "border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 hover:text-white",
                     size.activePresetId === 'custom' && "ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900 shadow-lg shadow-indigo-500/70"
                )}
            >
                Custom Size
            </Button>
            
            {size.selectionType === 'custom' && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                        <Label htmlFor="custom-width" className="text-slate-400 mb-2 block">Width (in)</Label>
                        <Input
                            id="custom-width"
                            type="number"
                            value={size.width}
                            onChange={(e) => handleCustomInputChange('width', e.target.value)}
                            className="w-full bg-slate-800/80 border-slate-700 text-slate-200 focus:ring-indigo-500"
                            placeholder="e.g. 3.5"
                        />
                    </div>
                    <div>
                         <Label htmlFor="custom-height" className="text-slate-400 mb-2 block">Height (in)</Label>
                        <Input
                            id="custom-height"
                            type="number"
                            value={size.height}
                            onChange={(e) => handleCustomInputChange('height', e.target.value)}
                            className="w-full bg-slate-800/80 border-slate-700 text-slate-200 focus:ring-indigo-500"
                             placeholder="e.g. 5"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
