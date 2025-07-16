import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ContourCutIcon, RoundedRectangleIcon, SquareIcon, CircleIcon } from './icons';
import type { StickerShape } from './sticker-customizer';

interface StickerShapeSelectorProps {
    selectedShape: StickerShape;
    onShapeChange: (shape: StickerShape) => void;
}

const shapes: { id: StickerShape; label: string; icon: React.ElementType }[] = [
    { id: 'contour', label: 'Contour', icon: ContourCutIcon },
    { id: 'rounded', label: 'Rounded', icon: RoundedRectangleIcon },
    { id: 'square', label: 'Square', icon: SquareIcon },
    { id: 'circle', label: 'Circle', icon: CircleIcon },
];

export function StickerShapeSelector({ selectedShape, onShapeChange }: StickerShapeSelectorProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {shapes.map(({ id, label, icon: Icon }) => {
                const isActive = selectedShape === id;
                return (
                    <Button
                        key={id}
                        variant="outline"
                        data-state={isActive ? 'active' : 'inactive'}
                        data-shape={id}
                        onClick={() => onShapeChange(id)}
                        className={cn(
                            "sticker-button h-auto flex-col p-3 text-center transition-all duration-300",
                            "border-slate-700 bg-slate-800/80 text-slate-300 overflow-hidden",
                            "hover:bg-slate-700/80 hover:text-white",
                            isActive && "border-indigo-500 bg-indigo-500/20 text-white"
                        )}
                    >
                        <Icon className="h-8 w-8 mb-2" />
                        <span className="font-semibold text-sm capitalize">{label}</span>
                    </Button>
                );
            })}
        </div>
    );
}
