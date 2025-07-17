
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import NextImage from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Star, Wand2, Upload, Sparkles, FileCheck2, ImagePlus, Scissors, Type, Library, Palette, CaseSensitive, LayoutGrid, GripVertical, Settings, RotateCw, Copy, ChevronsUp, Trash2, Bot, Layers, Circle, RectangleHorizontal, Square as SquareIconShape, Ruler, Lock, Unlock } from 'lucide-react';
import { generateSticker } from '@/ai/flows/generate-sticker-flow';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { ContourCutIcon, RoundedRectangleIcon as RoundedIcon, SquareIcon as SquareShapeIcon, CircleIcon as CircleShapeIcon } from '@/components/icons';
import { StickerContextMenu } from '@/components/sticker-context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SizeSelector } from '@/components/size-selector';
import type { Size } from '@/components/size-selector';
import { removeBackground } from '@/ai/flows/remove-background-flow';
import { addBorder } from '@/ai/flows/add-border-flow';

// Helper function to safely calculate aspect ratios
const calculateAspectRatio = (design: Design): number => {
  if (design.originalDimensions.height === 0) {
    console.warn('Design height is zero, defaulting to square aspect ratio');
    return 1;
  }
  return design.originalDimensions.width / design.originalDimensions.height;
};

const materials = [
    { id: 'vinyl', name: 'Vinyl', image: 'https://d6ce0no7ktiq.cloudfront.net/images/attachment/2023/06/08/4d0ae46e9e164daa9171d70e51cd46c7acaa2419.png' },
    { id: 'holographic', name: 'Holographic', image: 'https://d6ce0no7ktiq.cloudfront.net/images/attachment/2023/03/09/48e2c5c8c6ab57d013675b3b245daa2136e0c7cf.png' },
    { id: 'transparent', name: 'Transparent', image: 'https://d6ce0no7ktiq.cloudfront.net/images/attachment/2023/03/09/2d46e2873ec899b83a152c2f2ad52c1368398333.png' },
    { id: 'matte', name: 'Matte', image: 'https://placehold.co/100x100.png' },
];

const quantityOptions = [
  { quantity: 50, pricePer: 0.89 },
  { quantity: 100, pricePer: 0.69 },
  { quantity: 200, pricePer: 0.54 },
  { quantity: 500, pricePer: 0.44 },
  { quantity: 1000, pricePer: 0.35 },
];


// Data models based on the new JSON structure
interface StickerSheet {
  sheetId: string;
  userId: string;
  title: string;
  lastModified: string;
  dimensions: { width: number; height: number; unit: string; };
  material: { id: string; name: string; };
  settings: { autoPackEnabled: boolean; showBleedArea: boolean; };
}

interface Design {
  designId: string;
  sourceType: 'upload' | 'ai_generated' | 'library' | 'text';
  sourceUrl?: string; // Optional for text
  originalDimensions: { width: number; height: number; };
  fileName?: string;
  aiPrompt?: string;
  textData?: {
    content: string;
    font: string;
    color: string;
  }
}

interface StickerInstance {
  stickerId: string;
  designId: string;
  position: { x: number; y: number; unit: string; };
  size: { width: number; height: number; unit: string; };
  rotation: number;
  zIndex: number;
  cutLine: { type: 'kiss_cut' | 'die_cut'; offset: number; shape: 'auto' | 'custom'; pathData?: string; };
}

interface AppState {
  stickerSheet: StickerSheet;
  designLibrary: Design[];
  stickers: StickerInstance[];
}

const initialAppState: AppState = {
  stickerSheet: {
    sheetId: `sheet_${Math.random().toString(36).substr(2, 9)}`,
    userId: `user_${Math.random().toString(36).substr(2, 9)}`,
    title: 'My Awesome Project',
    lastModified: new Date().toISOString(),
    dimensions: { width: 8.5, height: 11, unit: 'inches' },
    material: { id: materials[0].id, name: materials[0].name },
    settings: { autoPackEnabled: true, showBleedArea: true },
  },
  designLibrary: [],
  stickers: [],
};

type DragAction = {
    type: 'move' | 'resize-br' | 'rotate';
    stickerId: string;
    startX: number;
    startY: number;
    originalSticker: StickerInstance;
} | null;

type ContextMenuState = {
  isOpen: boolean;
  position: { x: number; y: number };
  stickerId: string | null;
};

export type StickerShape = 'Die Cut' | 'circle' | 'square' | 'rounded';

function CustomizationSection({ id, title, icon: Icon, children, className }: { id?: string; title: string; icon: React.ElementType; children: React.ReactNode; className?: string }) {
  return (
    <div id={id} className={cn("space-y-3", className)}>
        <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                <Icon className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
        </div>
        <div className="rounded-lg bg-slate-900/50 p-4">
            {children}
        </div>
    </div>
  );
}

const ThemedCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "group relative flex w-full flex-col rounded-xl bg-slate-950 p-4 shadow-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-indigo-500/20",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-20 blur-sm transition-opacity duration-300 group-hover:opacity-30"></div>
      <div className="absolute inset-px rounded-[11px] bg-slate-950"></div>
      <div className="relative h-full">
        {children}
      </div>
    </div>
));
ThemedCard.displayName = "ThemedCard";

interface StickerCustomizerProps {
    productType: string;
}

export function StickerCustomizer({ productType }: StickerCustomizerProps) {
  const { toast } = useToast();
  const [appState, setAppState] = useState<AppState>(initialAppState);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [activeStickerId, setActiveStickerId] = useState<string | null>(null);

  const [quantity, setQuantity] = useState(quantityOptions[0].quantity);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [dragAction, setDragAction] = useState<DragAction>(null);
  
  const [stickerShape, setStickerShape] = useState<StickerShape>('Die Cut');

  // State for Text Decals
  const [decalText, setDecalText] = useState('Your Text Here');
  const [decalFont, setDecalFont] = useState('serif');
  const [decalColor, setDecalColor] = useState('#FFFFFF');
  
  // State for Sheet Configuration
  const [sheetLayout, setSheetLayout] = useState({ rows: 2, cols: 2 });
  const [hoveredLayout, setHoveredLayout] = useState({ rows: 0, cols: 0 });
  
  // State for sticker properties
  const [isAspectRatioLocked, setIsAspectRatioLocked] = useState(true);

  const [size, setSize] = useState<Size>({
    width: 2,
    height: 2,
    unit: 'in',
    selectionType: 'preset',
    activePresetId: 'sm'
  });

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    position: { x: 0, y: 0 },
    stickerId: null,
  });

  const [isTourActive, setIsTourActive] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const selectedQuantityOption = quantityOptions.find(q => q.quantity === quantity) || { quantity: quantity, pricePer: 1.25 };
  const totalPrice = (selectedQuantityOption.pricePer * selectedQuantityOption.quantity).toFixed(2);

  const canvasRef = useRef<HTMLDivElement>(null);
  const PIXELS_PER_INCH = 96;

  // Find the active sticker and its design
  const activeSticker = appState.stickers.find(s => s.stickerId === activeStickerId);
  const activeDesign = activeSticker ? appState.designLibrary.find(d => d.designId === activeSticker.designId) : null;
  
  const imageToDisplay = activeDesign?.sourceUrl ?? appState.designLibrary.find(d => d.sourceType !== 'text')?.sourceUrl;

  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const updateStickerSize = useCallback((id: string, newSize: { width: number; height: number; unit: 'in' | 'px' }) => {
    setAppState(current => ({
        ...current,
        stickers: current.stickers.map(s => {
            if (s.stickerId === id) {
                const widthPx = newSize.unit === 'in' ? newSize.width * PIXELS_PER_INCH : newSize.width;
                const heightPx = newSize.unit === 'in' ? newSize.height * PIXELS_PER_INCH : newSize.height;

                const originalDesign = current.designLibrary.find(d => d.designId === s.designId);
                if (!originalDesign) return s;

                let finalWidth = widthPx;
                let finalHeight = heightPx;

                if (isAspectRatioLocked) {
                    const aspectRatio = calculateAspectRatio(originalDesign);
                    if (widthPx !== s.size.width) { // Width changed
                        finalHeight = widthPx / aspectRatio;
                    } else if (heightPx !== s.size.height) { // Height changed
                        finalWidth = heightPx * aspectRatio;
                    }
                }
                return { ...s, size: { width: finalWidth, height: finalHeight, unit: 'px' } };
            }
            return s;
        }),
    }));
  }, [isAspectRatioLocked]);

  useEffect(() => {
    if (activeStickerId) {
      updateStickerSize(activeStickerId, { ...size, unit: size.unit });
    }
  }, [size, activeStickerId, updateStickerSize]);

  const handleAddToCart = () => {
    toast({
      title: "Added to Cart!",
      description: `Your custom stickers are on the way.`,
    })
  }

  const handleQuantityButtonClick = (qty: number) => {
    setQuantity(qty);
    const customInput = document.getElementById('custom-quantity-input') as HTMLInputElement;
    if (customInput) customInput.value = '';
  }

  const handleCustomQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numValue = parseInt(value, 10);
    
    if (value === "") {
        setQuantity(0);
    } else if (!isNaN(numValue) && numValue > 0 && numValue <= 10000) {
        setQuantity(numValue);
    } else if (numValue > 10000) {
        toast({
            variant: "destructive",
            title: "Quantity too large",
            description: "Maximum quantity is 10,000 stickers.",
        });
    }
  };

  const addDesignToLibrary = (design: Omit<Design, 'designId'>, dimensions: {width: number, height: number}) => {
    const designId = `design_${Math.random().toString(36).substr(2, 9)}`;
    const newDesign: Design = {
      ...design,
      designId,
      originalDimensions: dimensions,
    };
    
    setAppState(current => ({
      ...current,
      designLibrary: [...current.designLibrary, newDesign],
    }));
    return newDesign;
  }

  const addStickerToSheet = (designId: string, designData?: Design, options?: { position?: {x: number, y: number}, zIndex?: number, rotation?: number }) => {
    const design = designData || appState.designLibrary.find(d => d.designId === designId);
    if (!design) return;

    const stickerId = `inst_${Math.random().toString(36).substr(2, 9)}`;
    
    const maxZIndex = appState.stickers.reduce((max, s) => Math.max(max, s.zIndex), 0);

    const initialWidthPx = size.width * PIXELS_PER_INCH;
    const initialHeightPx = size.height * PIXELS_PER_INCH;
    
    const newSticker: StickerInstance = {
      stickerId,
      designId,
      position: options?.position ? { ...options.position, unit: 'px' } : { x: 50, y: 50, unit: 'px' },
      size: { width: initialWidthPx, height: initialHeightPx, unit: 'px' },
      rotation: options?.rotation ?? 0,
      zIndex: options?.zIndex ?? (maxZIndex + 1),
      cutLine: { type: productType === 'kiss-cut' ? 'kiss_cut' : 'die_cut', offset: 0.1, shape: 'auto' },
    };

    setAppState(current => {
      const newStickers = [...current.stickers, newSticker];
      return { ...current, stickers: newStickers.sort((a, b) => a.zIndex - b.zIndex) };
    });
    setActiveStickerId(stickerId);
  }

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        setIsLoading(true);
        setLoadingText("Removing background...");

        try {
            const { imageDataUri: noBgDataUri } = await removeBackground({ imageDataUri: dataUrl });
            setLoadingText("Adding die-cut border...");
            const { imageDataUri: finalDataUri } = await addBorder({
                imageDataUri: noBgDataUri,
                borderColor: 'white',
                borderWidth: 'thick'
            });

            const img = document.createElement('img');
            
            img.onload = () => {
                const newDesign = addDesignToLibrary(
                    {
                        sourceType: 'upload',
                        sourceUrl: finalDataUri,
                        fileName: file.name,
                    },
                    { width: img.width, height: img.height }
                );
                addStickerToSheet(newDesign.designId, newDesign);
                setUploadedFileName(file.name);
                toast({
                    title: "Image Processed!",
                    description: `${file.name} is ready and added to your design library.`,
                });
            };
            
            img.onerror = () => {
                console.error('Failed to load processed image');
                toast({
                    variant: "destructive",
                    title: "Image Load Failed",
                    description: "Could not load the processed image.",
                });
                setIsLoading(false);
                setLoadingText("");
            };
            
            img.src = finalDataUri;
        } catch (error) {
            console.error("Image processing failed:", error);
            toast({
                variant: "destructive",
                title: "Processing Failed",
                description: "Could not process the image. Please try another one.",
            });
        } finally {
            setIsLoading(false);
            setLoadingText("");
        }
    };
    
    reader.onerror = () => {
        toast({
            variant: "destructive",
            title: "File Read Error",
            description: "Could not read the selected file.",
        });
        setIsLoading(false);
        setLoadingText("");
    };
    
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleGenerateSticker = async () => {
    if (!prompt) {
      toast({
        variant: "destructive",
        title: "Prompt is empty",
        description: "Please enter a description for your sticker.",
      });
      return;
    }
    setIsGenerating(true);
    setLoadingText("Generating your masterpiece...");
    setUploadedFileName(null);
    try {
      const result = await generateSticker({ prompt });
      if (result.imageDataUri) {
          setIsLoading(true);
          setLoadingText("Removing background...");
          const { imageDataUri: noBgDataUri } = await removeBackground({ imageDataUri: result.imageDataUri });
          setLoadingText("Adding die-cut border...");
          const { imageDataUri: finalDataUri } = await addBorder({
              imageDataUri: noBgDataUri,
              borderColor: 'white',
              borderWidth: 'thick'
          });

        const img = document.createElement('img');
        
        img.onload = () => {
            const newDesign = addDesignToLibrary(
              {
                sourceType: 'ai_generated',
                sourceUrl: finalDataUri,
                aiPrompt: prompt,
              },
              { width: img.width, height: img.height }
            );
            addStickerToSheet(newDesign.designId, newDesign);
            toast({
              title: "Sticker Generated!",
              description: "Your new design has been added.",
            });
        };
        
        img.onerror = () => {
            console.error('Failed to load generated image');
            toast({
                variant: "destructive",
                title: "Image Load Failed",
                description: "Could not load the generated image.",
            });
            setIsGenerating(false);
            setIsLoading(false);
            setLoadingText("");
        };
        
        img.src = finalDataUri;
      } else {
        throw new Error("Image generation failed to return data.");
      }
    } catch (error) {
      console.error("Sticker generation failed:", error);
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "Could not generate sticker. Please try again.",
      });
    } finally {
      setIsGenerating(false);
      setIsLoading(false);
      setLoadingText("");
    }
  };
  
  const handleDragStartFromLibrary = (e: React.DragEvent, designId: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'design', id: designId }));
    e.dataTransfer.effectAllowed = 'copy';
  };
  
  const handleDropOnCanvas = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();

    const dataString = e.dataTransfer.getData('application/json');
    if (dataString) {
      try {
        const data: {type: 'design' | 'canvas-sticker', id: string} = JSON.parse(dataString);
        const x = e.clientX - canvasRect.left;
        const y = e.clientY - canvasRect.top;

        if (data.type === 'design') { // Adding a new sticker from the library
            addStickerToSheet(data.id, undefined, { position: { x: x - 50, y: y - 50 }}); // Offset to center
        }
      } catch (err) {
        console.error("Failed to parse dropped data", err);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent, stickerId: string) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      if (contextMenu.isOpen && contextMenu.stickerId === stickerId) {
        closeContextMenu();
        return;
      }

      if (!canvasRef.current) {
        console.warn('Canvas ref not available for context menu');
        return;
      }
      
      setContextMenu({
        isOpen: true,
        position: {
          x: e.clientX,
          y: e.clientY,
        },
        stickerId: stickerId,
      });
    } catch (error) {
      console.error('Error opening context menu:', error);
    }
  };

  const closeContextMenu = () => {
    setContextMenu(prev => ({ ...prev, isOpen: false, stickerId: null }));
  };

  const handleDeleteSticker = () => {
    if (!contextMenu.stickerId) return;
    setAppState(current => ({
        ...current,
        stickers: current.stickers.filter(s => s.stickerId !== contextMenu.stickerId)
    }));
    if (activeStickerId === contextMenu.stickerId) {
      setActiveStickerId(null);
    }
    toast({ title: "Sticker Removed" });
  };
  
  const handleDuplicateSticker = () => {
    if (!contextMenu.stickerId) return;
    const originalSticker = appState.stickers.find(s => s.stickerId === contextMenu.stickerId);
    if (originalSticker) {
      addStickerToSheet(originalSticker.designId, undefined, {
        position: { x: originalSticker.position.x + 20, y: originalSticker.position.y + 20 },
        rotation: originalSticker.rotation
      });
      toast({ title: "Sticker Duplicated" });
    }
  };

  const handleBringToFront = () => {
    if (!contextMenu.stickerId) return;
    const maxZIndex = appState.stickers.reduce((max, s) => Math.max(max, s.zIndex), 0);
    setAppState(current => ({
      ...current,
      stickers: current.stickers.map(s => 
        s.stickerId === contextMenu.stickerId ? { ...s, zIndex: maxZIndex + 1 } : s
      ).sort((a,b) => a.zIndex - b.zIndex)
    }));
    toast({ title: "Brought to Front" });
  };

  const handleAddTextDecal = () => {
    const textDesign = {
      sourceType: 'text' as const,
      textData: {
        content: decalText,
        font: decalFont,
        color: decalColor,
      },
    };
    const newDesign = addDesignToLibrary(textDesign, { width: 300, height: 100 });
    addStickerToSheet(newDesign.designId, newDesign);
    toast({
      title: "Text Layer Added",
      description: "Your text has been added to the canvas."
    });
  }

  const handlePointerDown = (e: React.PointerEvent, type: 'move' | 'resize-br' | 'rotate', stickerId: string) => {
    if (e.button !== 0) return; // Only allow left-clicks for dragging
    if (contextMenu.isOpen) {
        closeContextMenu();
        e.stopPropagation();
        return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    const targetSticker = appState.stickers.find(s => s.stickerId === stickerId);
    if (!targetSticker) return;
    
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    
    setActiveStickerId(stickerId);
    setDragAction({
        type,
        stickerId,
        startX: e.clientX,
        startY: e.clientY,
        originalSticker: targetSticker,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragAction) return;
    e.preventDefault();
    e.stopPropagation();

    const dx = e.clientX - dragAction.startX;
    const dy = e.clientY - dragAction.startY;
    
    const isDraggable = productType !== 'sheet' || !appState.stickerSheet.settings.autoPackEnabled;

    if (dragAction.type === 'move' && isDraggable) {
        const newX = dragAction.originalSticker.position.x + dx;
        const newY = dragAction.originalSticker.position.y + dy;
        setAppState(current => ({
            ...current,
            stickers: current.stickers.map(s => s.stickerId === dragAction.stickerId ? { ...s, position: { ...s.position, x: newX, y: newY } } : s)
        }));
    } else if (dragAction.type === 'resize-br') {
        const { originalSticker } = dragAction;
        const design = appState.designLibrary.find(d => d.designId === originalSticker.designId);
        if (!design) return;

        let newWidth = originalSticker.size.width + dx;
        let newHeight = originalSticker.size.height + dy;
        
        if(isAspectRatioLocked) {
            const aspectRatio = design.sourceType === 'text' 
                ? (originalSticker.size.height === 0 ? 1 : originalSticker.size.width / originalSticker.size.height)
                : calculateAspectRatio(design);
            newHeight = newWidth / aspectRatio;
        }

        if (newWidth > 10 && newHeight > 10) {
            setAppState(current => ({
                ...current,
                stickers: current.stickers.map(s => s.stickerId === dragAction.stickerId ? { ...s, size: { ...s.size, width: newWidth, height: newHeight } } : s)
            }));
            setSize(prev => ({
                ...prev,
                width: newWidth / PIXELS_PER_INCH,
                height: newHeight / PIXELS_PER_INCH,
                selectionType: 'custom',
                activePresetId: null
            }));
        }
    } else if (dragAction.type === 'rotate') {
        const { originalSticker } = dragAction;
        const stickerElement = document.getElementById(`sticker-${originalSticker.stickerId}`);
        if (!stickerElement || !canvasRef.current) return;

        const canvasRect = canvasRef.current.getBoundingClientRect();
        const stickerRect = stickerElement.getBoundingClientRect();
        
        const centerX = stickerRect.left - canvasRect.left + stickerRect.width / 2;
        const centerY = stickerRect.top - canvasRect.top + stickerRect.height / 2;

        const angle = Math.atan2(e.clientY - canvasRect.top - centerY, e.clientX - canvasRect.left - centerX) * (180 / Math.PI);
        
        const startAngle = Math.atan2(dragAction.startY - canvasRect.top - centerY, dragAction.startX - canvasRect.left - centerX) * (180 / Math.PI);
        
        const newRotation = originalSticker.rotation + (angle - startAngle);
        
        setAppState(current => ({
            ...current,
            stickers: current.stickers.map(s => s.stickerId === dragAction.stickerId ? { ...s, rotation: newRotation } : s)
        }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragAction) {
        const { stickerId } = dragAction;

        const sticker = appState.stickers.find(s => s.stickerId === stickerId);
        const design = sticker ? appState.designLibrary.find(d => d.designId === sticker.designId) : null;
        
        // If the action was resizing a text decal, measure it and snap the container to fit
        if (dragAction.type === 'resize-br' && design && design.sourceType === 'text') {
            const textElement = document.getElementById(`sticker-text-${stickerId}`);
            if (textElement) {
                const rect = textElement.getBoundingClientRect();
                setAppState(current => ({
                    ...current,
                    stickers: current.stickers.map(s => {
                        if (s.stickerId === stickerId) {
                            return { ...s, size: { ...s.size, width: rect.width, height: rect.height } };
                        }
                        return s;
                    })
                }));
            }
        }

        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        setDragAction(null);
    }
  };

  const handleToggleCustomLayout = (checked: boolean) => {
    setAppState(currentAppState => {
      const designLibrary = currentAppState.designLibrary;
      const currentDesign = designLibrary.find(d => d.sourceType !== 'text') ?? (designLibrary.length > 0 ? designLibrary[0] : null);

      if (checked) {
        // Switching to Custom Layout from Auto Layout
        if (!currentDesign || !canvasRef.current) {
          toast({
            variant: 'destructive',
            title: 'No Design Available',
            description: 'Please add a design to the library before enabling custom layout.',
          });
          return { ...currentAppState, stickerSheet: { ...currentAppState.stickerSheet, settings: { ...currentAppState.stickerSheet.settings, autoPackEnabled: true } } };
        }
        
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const { rows, cols } = sheetLayout;
        const gap = 8; // Corresponds to gap-2 in Tailwind
        const padding = 8; // Corresponds to p-2
        
        const availableWidth = canvasRect.width - (padding * 2) - (gap * (cols - 1));
        const availableHeight = canvasRect.height - (padding * 2) - (gap * (rows - 1));

        const cellWidth = availableWidth / cols;
        const cellHeight = availableHeight / cols;
        
        const designAspectRatio = calculateAspectRatio(currentDesign);
        
        let stickerWidth = cellWidth;
        let stickerHeight = cellWidth / designAspectRatio;

        if (stickerHeight > cellHeight) {
            stickerHeight = cellHeight;
            stickerWidth = cellHeight * designAspectRatio;
        }

        const offsetX = (cellWidth - stickerWidth) / 2;
        const offsetY = (cellHeight - stickerHeight) / 2;

        const newStickers: StickerInstance[] = [];
        let maxZ = currentAppState.stickers.reduce((max, s) => Math.max(max, s.zIndex), 0);
        for (let i = 0; i < rows; i++) {
          for (let j = 0; j < cols; j++) {
            const x = padding + j * (cellWidth + gap) + offsetX;
            const y = padding + i * (cellHeight + gap) + offsetY;
            const stickerId = `inst_grid_${i}_${j}_${Math.random().toString(36).substr(2, 5)}`;
            maxZ++;
    
            newStickers.push({
              stickerId,
              designId: currentDesign.designId,
              position: { x, y, unit: 'px' },
              size: { width: stickerWidth, height: stickerHeight, unit: 'px' },
              rotation: 0,
              zIndex: maxZ,
              cutLine: { type: 'kiss_cut', offset: 0.1, shape: 'auto' },
            });
          }
        }
        return {
          ...currentAppState,
          stickerSheet: { ...currentAppState.stickerSheet, settings: { ...currentAppState.stickerSheet.settings, autoPackEnabled: false } },
          stickers: newStickers.sort((a,b) => a.zIndex - b.zIndex)
        };

      } else {
        // Switching back to Auto Layout
        const stickersToKeep = currentAppState.stickers.length > 0 && currentDesign ? [currentAppState.stickers[0]] : [];
        return {
          ...currentAppState,
          stickerSheet: { ...currentAppState.stickerSheet, settings: { ...currentAppState.stickerSheet.settings, autoPackEnabled: true } },
          stickers: stickersToKeep
        };
      }
    });
  };

  const shapeButtons = [
    { shape: 'Die Cut' as StickerShape, icon: ContourCutIcon, label: 'Die Cut' },
    { shape: 'circle' as StickerShape, icon: CircleShapeIcon, label: 'Circle' },
    { shape: 'square' as StickerShape, icon: SquareShapeIcon, label: 'Square' },
    { shape: 'rounded' as StickerShape, icon: RoundedIcon, label: 'Rounded' },
  ];

  const renderDesignControls = () => {
    if (productType === 'sheet') {
      return (
        <>
            <CustomizationSection id="add-layer-section" title="Add Designs" icon={Layers}>
              <Tabs defaultValue="generate" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-slate-800 text-slate-400">
                  <TabsTrigger value="generate"><Wand2 className="mr-2 h-4 w-4"/>Generate</TabsTrigger>
                  <TabsTrigger value="upload"><Upload className="mr-2 h-4 w-4"/>Upload</TabsTrigger>
                  <TabsTrigger value="text"><Type className="mr-2 h-4 w-4"/>Text</TabsTrigger>
                </TabsList>
                <TabsContent value="generate" className="mt-4">
                  <div className="space-y-4">
                      <Textarea
                          placeholder="e.g., A cute baby panda developer writing code"
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          rows={3}
                          className="bg-slate-800 border-slate-700 text-slate-200 focus:ring-indigo-500"
                      />
                      <Button onClick={handleGenerateSticker} disabled={isGenerating} className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold hover:from-indigo-600 hover:to-purple-600">
                          {isGenerating ? (
                              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
                          ) : (
                              <><Sparkles className="mr-2 h-4 w-4" />Generate & Add</>
                          )}
                      </Button>
                  </div>
                </TabsContent>
                <TabsContent value="upload" className="mt-4">
                  <div className="space-y-2">
                      <Label
                          htmlFor="picture"
                          className={cn(
                              "relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-slate-900/50 hover:bg-slate-800/50 transition-colors border-slate-700",
                              "hover:border-indigo-500 hover:bg-indigo-900/20",
                              uploadedFileName && "border-emerald-500 bg-emerald-900/20"
                          )}
                      >
                          <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                              {uploadedFileName ? (
                                  <>
                                      <FileCheck2 className="w-8 h-8 mb-2 text-emerald-500" />
                                      <p className="font-semibold text-emerald-500">File Uploaded!</p>
                                      <p className="text-xs text-slate-400 truncate max-w-xs">{uploadedFileName}</p>
                                  </>
                              ) : (
                                  <>
                                      <ImagePlus className="w-8 h-8 mb-2 text-slate-500" />
                                      <p className="mb-1 text-sm text-slate-400"><span className="font-semibold text-indigo-400">Click to upload</span> or drag and drop</p>
                                      <p className="text-xs text-slate-500">PNG, JPG, or WEBP</p>
                                  </>
                              )}
                          </div>
                          <Input id="picture" type="file" accept="image/png, image/jpeg, image/webp" className="sr-only" onChange={handleImageUpload} />
                      </Label>
                  </div>
                </TabsContent>
                <TabsContent value="text" className="mt-4">
                    <div className="space-y-4">
                      <Textarea
                        placeholder="Your Text Here"
                        value={decalText}
                        onChange={(e) => setDecalText(e.target.value)}
                        rows={3}
                        className="bg-slate-800 border-slate-700 text-slate-200 focus:ring-indigo-500 text-lg"
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="font-select" className="text-slate-400 mb-2 block"><CaseSensitive className="inline-block mr-2 h-4 w-4"/>Font</Label>
                          <Select value={decalFont} onValueChange={setDecalFont}>
                            <SelectTrigger id="font-select" className="bg-slate-800 border-slate-700 text-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                              <SelectItem value="serif">Serif</SelectItem>
                              <SelectItem value="sans-serif">Sans-Serif</SelectItem>
                              <SelectItem value="monospace">Monospace</SelectItem>
                              <SelectItem value="cursive">Cursive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                           <Label htmlFor="color-picker" className="text-slate-400 mb-2 block"><Palette className="inline-block mr-2 h-4 w-4"/>Color</Label>
                           <Input 
                              id="color-picker"
                              type="color" 
                              value={decalColor}
                              onChange={(e) => setDecalColor(e.target.value)}
                              className="w-full h-10 p-1 bg-slate-800 border-slate-700"
                            />
                        </div>
                      </div>
                      <Button onClick={handleAddTextDecal} className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold hover:from-blue-600 hover:to-cyan-600">
                        <Type className="mr-2 h-4 w-4" /> Add Text Layer
                      </Button>
                    </div>
                </TabsContent>
              </Tabs>
            </CustomizationSection>
            
            <CustomizationSection id="sheet-config-section" title="Sheet Configuration" icon={LayoutGrid}>
                <div className="flex items-center space-x-4 rounded-lg bg-slate-800/50 p-3 border border-slate-700">
                    <div className="flex-1">
                      <Label htmlFor="custom-layout" className="text-slate-200 font-semibold">Custom Layout</Label>
                      <p className="text-xs text-slate-400">Manually arrange and resize stickers.</p>
                    </div>
                    <Switch
                      id="custom-layout"
                      checked={!appState.stickerSheet.settings.autoPackEnabled}
                      onCheckedChange={handleToggleCustomLayout}
                    />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/80 hover:text-white">
                      <span>Sheet Layout: {sheetLayout.rows} x {sheetLayout.cols}</span>
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-slate-900 border-slate-700 text-white">
                      <div className="p-2">
                        <div 
                          className="grid grid-cols-5 gap-1"
                          onMouseLeave={() => setHoveredLayout({rows: 0, cols: 0})}
                        >
                          {Array.from({length: 25}).map((_, i) => {
                            const row = Math.floor(i / 5) + 1;
                            const col = (i % 5) + 1;
                            const isHovered = row <= hoveredLayout.rows && col <= hoveredLayout.cols;
                            const isSelected = row === sheetLayout.rows && col === sheetLayout.cols;
                            return (
                              <div
                                key={i}
                                className={cn(
                                  "w-8 h-8 border border-slate-700 rounded-sm transition-colors",
                                  (isHovered || isSelected) ? "bg-indigo-500" : "bg-slate-800"
                                )}
                                onMouseEnter={() => setHoveredLayout({rows: row, cols: col})}
                                onClick={() => setSheetLayout({rows: row, cols: col})}
                              />
                            )
                          })}
                        </div>
                      </div>
                  </DropdownMenuContent>
                </DropdownMenu>
            </CustomizationSection>
            
            <CustomizationSection id="library-section" title="Design Library" icon={Library}>
              <div className="space-y-4">
                  <div className="min-h-[120px] bg-slate-800/50 border border-slate-700 rounded-lg p-2 flex gap-2 overflow-x-auto">
                    {appState.designLibrary.length === 0 ? (
                       <div className="w-full text-center text-slate-400 flex flex-col justify-center items-center p-4">
                          <Library className="h-8 w-8 mb-2" />
                          <p className="text-sm">Your design library is empty.</p>
                          <p className="text-xs">Add a design to start.</p>
                        </div>
                    ) : (
                      appState.designLibrary.map(design => (
                        <div 
                          key={design.designId}
                          className="relative w-24 h-24 flex-shrink-0 cursor-grab active:cursor-grabbing"
                          draggable
                          onDragStart={(e) => handleDragStartFromLibrary(e, design.designId)}
                        >
                           {design.sourceType === 'text' && design.textData ? (
                             <div 
                                className="w-full h-full flex items-center justify-center bg-slate-700 rounded-md p-1 overflow-hidden"
                                style={{
                                    color: design.textData.color,
                                    fontFamily: design.textData.font,
                                }}
                             >
                                <span className="text-sm font-bold break-words text-center leading-tight">
                                    {design.textData.content}
                                </span>
                             </div>
                           ) : design.sourceUrl ? (
                              <NextImage 
                                src={design.sourceUrl}
                                alt={design.fileName || design.aiPrompt || 'sticker design'}
                                fill
                                sizes="96px"
                                className="object-contain bg-slate-700/50 rounded-md"
                              />
                           ) : null}
                           <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                              <GripVertical className="text-white"/>
                           </div>
                        </div>
                      ))
                    )}
                  </div>
              </div>
            </CustomizationSection>
        </>
      );
    }
    
    const showTextTab = productType !== 'die-cut';

    return (
      <CustomizationSection id="layer-section" title="Add a Layer" icon={Layers}>
        <Tabs defaultValue="generate" className="w-full">
          <TabsList className={cn(
            "grid w-full bg-slate-800 text-slate-400",
            showTextTab ? "grid-cols-3" : "grid-cols-2"
          )}>
            <TabsTrigger value="generate"><Wand2 className="mr-2 h-4 w-4"/>Generate</TabsTrigger>
            <TabsTrigger value="upload"><Upload className="mr-2 h-4 w-4"/>Upload</TabsTrigger>
            {showTextTab && <TabsTrigger value="text"><Type className="mr-2 h-4 w-4"/>Text</TabsTrigger>}
          </TabsList>
          <TabsContent value="generate" className="mt-4">
            <div className="space-y-4">
                <Textarea
                    placeholder="e.g., A cute baby panda developer writing code"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={3}
                    className="bg-slate-800 border-slate-700 text-slate-200 focus:ring-indigo-500"
                />
                <Button onClick={handleGenerateSticker} disabled={isGenerating} className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold hover:from-indigo-600 hover:to-purple-600">
                    {isGenerating ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
                    ) : (
                        <><Sparkles className="mr-2 h-4 w-4" />Generate & Add</>
                    )}
                </Button>
            </div>
          </TabsContent>
          <TabsContent value="upload" className="mt-4">
            <div className="space-y-2">
                <Label
                    htmlFor="picture"
                    className={cn(
                        "relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-slate-900/50 hover:bg-slate-800/50 transition-colors border-slate-700",
                        "hover:border-indigo-500 hover:bg-indigo-900/20",
                        uploadedFileName && "border-emerald-500 bg-emerald-900/20"
                    )}
                >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                        {uploadedFileName ? (
                            <>
                                <FileCheck2 className="w-8 h-8 mb-2 text-emerald-500" />
                                <p className="font-semibold text-emerald-500">File Uploaded!</p>
                                <p className="text-xs text-slate-400 truncate max-w-xs">{uploadedFileName}</p>
                            </>
                        ) : (
                            <>
                                <ImagePlus className="w-8 h-8 mb-2 text-slate-500" />
                                <p className="mb-1 text-sm text-slate-400"><span className="font-semibold text-indigo-400">Click to upload</span> or drag and drop</p>
                                <p className="text-xs text-slate-500">PNG, JPG, or WEBP</p>
                            </>
                        )}
                    </div>
                    <Input id="picture" type="file" accept="image/png, image/jpeg, image/webp" className="sr-only" onChange={handleImageUpload} />
                </Label>
            </div>
          </TabsContent>
           {showTextTab && <TabsContent value="text" className="mt-4">
            <div className="space-y-4">
              <Textarea
                placeholder="Your Text Here"
                value={decalText}
                onChange={(e) => setDecalText(e.target.value)}
                rows={3}
                className="bg-slate-800 border-slate-700 text-slate-200 focus:ring-indigo-500 text-lg"
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="font-select" className="text-slate-400 mb-2 block"><CaseSensitive className="inline-block mr-2 h-4 w-4"/>Font</Label>
                  <Select value={decalFont} onValueChange={setDecalFont}>
                    <SelectTrigger id="font-select" className="bg-slate-800 border-slate-700 text-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                      <SelectItem value="serif">Serif</SelectItem>
                      <SelectItem value="sans-serif">Sans-Serif</SelectItem>
                      <SelectItem value="monospace">Monospace</SelectItem>
                      <SelectItem value="cursive">Cursive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                   <Label htmlFor="color-picker" className="text-slate-400 mb-2 block"><Palette className="inline-block mr-2 h-4 w-4"/>Color</Label>
                   <Input 
                      id="color-picker"
                      type="color" 
                      value={decalColor}
                      onChange={(e) => setDecalColor(e.target.value)}
                      className="w-full h-10 p-1 bg-slate-800 border-slate-700"
                    />
                </div>
              </div>
              <Button onClick={handleAddTextDecal} className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold hover:from-blue-600 hover:to-cyan-600">
                <Type className="mr-2 h-4 w-4" /> Add Text Layer
              </Button>
            </div>
          </TabsContent>}
        </Tabs>
      </CustomizationSection>
    );
  }
  
  const renderStickerInstance = (sticker: StickerInstance) => {
    const design = appState.designLibrary.find(d => d.designId === sticker.designId);
    if (!design) return null;

    const isDraggable = productType !== 'sheet' || !appState.stickerSheet.settings.autoPackEnabled;
    const isSelected = activeStickerId === sticker.stickerId;
    
    const showControls = isSelected && isDraggable;

    if (design.sourceType === 'text' && design.textData) {
        const fontSize = sticker.size.width / 10;
        return (
            <div
                id={`sticker-${sticker.stickerId}`}
                key={sticker.stickerId}
                onPointerDown={(e) => { if(isDraggable) handlePointerDown(e, 'move', sticker.stickerId) }}
                onClick={() => setActiveStickerId(sticker.stickerId)}
                onContextMenu={(e) => handleContextMenu(e, sticker.stickerId)}
                className={cn(
                    "absolute flex items-center justify-center p-2 break-words text-center select-none",
                    isDraggable && "cursor-grab active:cursor-grabbing",
                    isSelected && "outline-dashed outline-2 outline-indigo-400 rounded-md",
                )}
                style={{
                    left: `${sticker.position.x}px`,
                    top: `${sticker.position.y}px`,
                    width: `${sticker.size.width}px`,
                    height: `${sticker.size.height}px`,
                    transform: `rotate(${sticker.rotation}deg)`,
                    zIndex: sticker.zIndex,
                }}
            >
                <span
                    id={`sticker-text-${sticker.stickerId}`}
                    className="font-bold pointer-events-none"
                    style={{
                        color: design.textData.color,
                        fontFamily: design.textData.font,
                        fontSize: `${fontSize}px`,
                        lineHeight: 1,
                    }}
                >
                    {design.textData.content}
                </span>
                {showControls && (
                    <>
                        <div
                            className="absolute -bottom-2 -right-2 w-4 h-4 bg-indigo-400 rounded-full cursor-se-resize"
                            onPointerDown={(e) => handlePointerDown(e, 'resize-br', sticker.stickerId)}
                        />
                        <div
                            className="absolute -top-2 -right-2 w-4 h-4 bg-indigo-400 rounded-full cursor-grab"
                            onPointerDown={(e) => handlePointerDown(e, 'rotate', sticker.stickerId)}
                        >
                          <RotateCw className="w-full h-full p-0.5 text-slate-900" />
                        </div>
                    </>
                )}
            </div>
        )
    }

    if (design.sourceUrl) {
        return (
            <div
                id={`sticker-${sticker.stickerId}`}
                key={sticker.stickerId}
                onPointerDown={(e) => { if(isDraggable) handlePointerDown(e, 'move', sticker.stickerId) }}
                onClick={() => setActiveStickerId(sticker.stickerId)}
                onContextMenu={(e) => handleContextMenu(e, sticker.stickerId)}
                className={cn(
                    "absolute select-none",
                    isDraggable && "cursor-grab active:cursor-grabbing",
                    isSelected && "outline-dashed outline-2 outline-indigo-400 rounded-md",
                )}
                style={{
                    left: `${sticker.position.x}px`,
                    top: `${sticker.position.y}px`,
                    width: `${sticker.size.width}px`,
                    height: `${sticker.size.height}px`,
                    transform: `rotate(${sticker.rotation}deg)`,
                    zIndex: sticker.zIndex,
                }}
            >
                <NextImage
                    src={design.sourceUrl}
                    alt="sticker instance"
                    fill
                    sizes="(max-width: 768px) 10vw, 100px"
                    className="object-contain pointer-events-none"
                    priority={sticker.stickerId === activeStickerId}
                />
                 {showControls && (
                    <>
                        <div
                            className="absolute -bottom-2 -right-2 w-4 h-4 bg-indigo-400 rounded-full cursor-se-resize"
                            onPointerDown={(e) => handlePointerDown(e, 'resize-br', sticker.stickerId)}
                        />
                        <div
                            className="absolute -top-2 -right-2 w-4 h-4 bg-indigo-400 rounded-full cursor-grab"
                            onPointerDown={(e) => handlePointerDown(e, 'rotate', sticker.stickerId)}
                        >
                          <RotateCw className="w-full h-full p-0.5 text-slate-900" />
                        </div>
                    </>
                )}
            </div>
        );
    }

    return null;
  }
  
  const getShapeStyle = (shape: StickerShape) => {
    let borderRadius = '1rem'; // Default for contour
    switch (shape) {
        case 'circle':
            borderRadius = '50%';
            break;
        case 'square':
            borderRadius = '0';
            break;
        case 'rounded':
            borderRadius = '2rem';
            break;
    }
    return { borderRadius };
  };
  
  const renderCanvasContent = () => {
    const showGrid = productType === 'sheet' && appState.stickerSheet.settings.autoPackEnabled;
      
      if (showGrid) {
          const itemShapeStyle = getShapeStyle(stickerShape);
          return (
             <div 
              className="grid w-full h-full gap-2 p-2"
              style={{
                gridTemplateRows: `repeat(${sheetLayout.rows}, 1fr)`,
                gridTemplateColumns: `repeat(${sheetLayout.cols}, 1fr)`,
              }}
            >
              {Array.from({ length: sheetLayout.rows * sheetLayout.cols }).map((_, i) => (
                <div key={i} className="relative w-full h-full bg-slate-800/50 flex items-center justify-center transition-all duration-300" style={itemShapeStyle}>
                  {imageToDisplay ? (
                    <NextImage
                      src={imageToDisplay}
                      alt={`Sticker preview ${i + 1}`}
                      fill
                      sizes="(max-width: 768px) 10vw, 5vw"
                      className="object-contain p-1"
                    />
                  ) : (
                    <ImagePlus className="h-6 w-6 text-slate-500"/>
                  )}
                </div>
              ))}
            </div>
          )
      }
    
    // For other product types (die-cut, kiss-cut, decal) or sheet with autopack off
    if (appState.stickers.length > 0) {
      return appState.stickers.map(renderStickerInstance);
    }

    return (
      <div className="text-center text-slate-500">
        <p className="text-lg font-semibold">Sticker Canvas</p>
        <p className="text-sm">Select a product and add a design to start.</p>
      </div>
    );
  }

  if (!mounted) {
    return (
        <div className="container mx-auto px-0 py-0 md:py-4">
            <div className="text-white text-center p-8 bg-slate-800 rounded-lg">
                <Loader2 className="mx-auto h-12 w-12 animate-spin" />
                <h1 className="text-3xl font-bold mt-4">Loading Customizer...</h1>
            </div>
        </div>
    );
  }
  
  const canvasShapeStyle = productType === 'sheet' && !appState.stickerSheet.settings.autoPackEnabled
    ? getShapeStyle(stickerShape)
    : getShapeStyle('Die Cut'); // Default shape unless custom sheet layout

  return (
    <div className="container mx-auto px-0 py-0 md:py-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8">
        <div className="lg:sticky lg:top-8 h-max flex flex-col items-center gap-4 group">
            <div className="w-full max-w-lg aspect-square">
              <div 
                id="canvas-container"
                ref={canvasRef}
                className={cn(
                  "relative bg-slate-800/50 w-full h-full p-0 transition-all duration-300",
                )}
                style={canvasShapeStyle}
                onDrop={handleDropOnCanvas}
                onDragOver={(e) => e.preventDefault()}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onClick={closeContextMenu}
              >
              {isLoading && (
                <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center z-20" style={canvasShapeStyle}>
                  <Loader2 className="h-12 w-12 animate-spin text-white" />
                  <p className="text-white mt-4 font-semibold">{loadingText}</p>
                </div>
              )}
                {/* This area will become the sticker sheet canvas */}
                <div className="w-full h-full flex items-center justify-center relative overflow-hidden" style={canvasShapeStyle}>
                  {renderCanvasContent()}
                </div>
              </div>
            </div>
        </div>
        
        <div className="lg:col-span-2">
            <div className="rounded-xl bg-slate-950">
              <div className="flex flex-col space-y-6 p-4">
                <header>
                    <div className="flex items-center justify-between">
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                            Create Your Sticker
                        </h1>
                        <Button 
                            variant="outline" 
                            size="icon" 
                            className="bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/80 hover:text-white"
                            onClick={() => setIsTourActive(prev => !prev)}
                            aria-label="Start AI Tour"
                        >
                            <Bot className="h-5 w-5" />
                        </Button>
                    </div>
                    <div className="mt-2 flex items-center gap-4">
                        <div className="flex items-center gap-1">
                            <div className="flex text-yellow-400">
                                <Star className="w-5 h-5 fill-current" />
                                <Star className="w-5 h-5 fill-current" />
                                <Star className="w-5 h-5 fill-current" />
                                <Star className="w-5 h-5 fill-current" />
                                <Star className="w-5 h-5 fill-current" />
                            </div>
                            <p className="text-sm text-slate-300 font-medium"><span className="text-white font-semibold">5.0</span> (4,882 reviews)</p>
                        </div>
                    </div>
                  </header>
                
                  <CustomizationSection id="product-type-section" title="Product Type" icon={Scissors}>
                    <Select value={productType} onValueChange={(value) => {
                        window.location.href = `/${value}`;
                    }}>
                        <SelectTrigger className="w-full bg-slate-800/50 border-slate-700 text-slate-200 h-12 text-base">
                            <SelectValue placeholder="Select a product type" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                            <SelectItem value="die-cut">
                                <div className="flex items-center gap-3">
                                    <Scissors className="h-5 w-5 text-indigo-400" />
                                    <span className="font-semibold">Die-cut Stickers</span>
                                </div>
                            </SelectItem>
                            <SelectItem value="sheet">
                                <div className="flex items-center gap-3">
                                    <LayoutGrid className="h-5 w-5 text-purple-400" />
                                    <span className="font-semibold">Sticker Sheets</span>
                                </div>
                            </SelectItem>
                            <SelectItem value="kiss-cut">
                               <div className="flex items-center gap-3">
                                    <ContourCutIcon className="h-5 w-5 text-pink-400" />
                                    <span className="font-semibold">Kiss-cut Stickers</span>
                                </div>
                            </SelectItem>
                            <SelectItem value="decal">
                               <div className="flex items-center gap-3">
                                    <Type className="h-5 w-5 text-emerald-400" />
                                    <span className="font-semibold">Text Decals</span>
                                </div>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                  </CustomizationSection>

                  <CustomizationSection id="sticker-shape-section" title="Sticker Shape" icon={ContourCutIcon}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {shapeButtons.map(({ shape, icon: Icon, label }) => (
                            <Button
                                key={shape}
                                variant="outline"
                                onClick={() => setStickerShape(shape)}
                                className={cn(
                                    "h-auto flex-col py-3 px-2 text-center transition-all duration-200",
                                    "border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 hover:text-white",
                                    stickerShape === shape && "ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900 shadow-lg shadow-indigo-500/70"
                                )}
                            >
                                <Icon className="h-7 w-7 mb-2" />
                                <span className="font-semibold text-sm">{label}</span>
                            </Button>
                        ))}
                    </div>
                  </CustomizationSection>

                  {renderDesignControls()}

                
                  <Accordion type="multiple" defaultValue={['material', 'size', 'quantity']} className="w-full space-y-4">
                    <AccordionItem value="material" className="border-none">
                      <div className="rounded-lg bg-slate-900/50" id="material-section">
                        <AccordionTrigger className="p-4 text-white hover:no-underline">
                          <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                                  <Palette className="h-4 w-4" />
                              </div>
                              <h2 className="text-lg font-semibold text-white">Material</h2>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 pt-0">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {materials.map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => setAppState(s => ({...s, stickerSheet: {...s.stickerSheet, material: {id: m.id, name: m.name}}}))}
                                className={cn(
                                  "relative group rounded-lg p-2 text-center transition-all duration-200 border-2 bg-slate-900/50",
                                  appState.stickerSheet.material.id === m.id ? "border-indigo-500" : "border-slate-700 hover:border-slate-600"
                                )}
                              >
                                <NextImage src={m.image} alt={m.name} width={96} height={96} style={{width:'auto', height:'auto'}} className="mx-auto mb-2 rounded-md" data-ai-hint="sticker material" />
                                <p className="font-semibold text-sm text-slate-200">{m.name}</p>
                              </button>
                            ))}
                          </div>
                        </AccordionContent>
                      </div>
                    </AccordionItem>
                     <AccordionItem value="size" className="border-none">
                      <div className="rounded-lg bg-slate-900/50" id="size-section">
                        <AccordionTrigger className="p-4 text-white hover:no-underline">
                          <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                                  <Ruler className="h-4 w-4" />
                              </div>
                              <h2 className="text-lg font-semibold text-white">Size</h2>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 pt-0 space-y-4">
                           <div className="flex items-center justify-between">
                              <Label htmlFor="aspect-ratio-lock" className="flex items-center gap-2 text-slate-300">
                                  {isAspectRatioLocked ? <Lock className="h-4 w-4"/> : <Unlock className="h-4 w-4" />}
                                  <span>Lock Aspect Ratio</span>
                              </Label>
                              <Switch
                                  id="aspect-ratio-lock"
                                  checked={isAspectRatioLocked}
                                  onCheckedChange={setIsAspectRatioLocked}
                              />
                          </div>
                          <SizeSelector size={size} onSizeChange={setSize} />
                        </AccordionContent>
                      </div>
                    </AccordionItem>
                    <AccordionItem value="quantity" className="border-none">
                      <div className="rounded-lg bg-slate-900/50" id="quantity-section">
                        <AccordionTrigger className="p-4 text-white hover:no-underline">
                          <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                                  <Sparkles className="h-4 w-4" />
                              </div>
                              <h2 className="text-lg font-semibold text-white">Quantity</h2>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 pt-0">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {quantityOptions.map((q) => (
                              <Button 
                                key={q.quantity} 
                                variant={quantity === q.quantity ? "default" : "outline"} 
                                onClick={() => handleQuantityButtonClick(q.quantity)} 
                                className={cn(
                                  "h-auto flex-col py-3 px-2 text-center",
                                  quantity === q.quantity 
                                    ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 border-purple-500" 
                                    : "border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 hover:text-white"
                                )}
                              >
                                <span className="font-bold text-lg leading-none">{q.quantity}</span>
                                <span className="text-xs text-slate-400 mt-1">${q.pricePer.toFixed(2)}/sticker</span>
                              </Button>
                            ))}
                          </div>
                          <div className="mt-4">
                              <Input
                                  type="number"
                                  id="custom-quantity-input"
                                  className="w-full h-12 text-center text-lg font-bold bg-slate-800/80 border-slate-700 text-slate-200 placeholder:text-slate-500 focus:ring-indigo-500 focus:border-indigo-500"
                                  placeholder="Custom quantity..."
                                  onChange={handleCustomQuantityChange}
                                  onFocus={() => setQuantity(0)}
                              />
                          </div>
                        </AccordionContent>
                      </div>
                    </AccordionItem>
                  </Accordion>
                
                  <div id="add-to-cart-section" className="p-0.5 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 mt-4 sticky bottom-4 shadow-lg shadow-indigo-500/20">
                      <div className="bg-slate-900 rounded-lg p-4">
                        <div className="flex flex-row items-center justify-between pb-4">
                          <h3 className="text-lg font-semibold text-slate-200">Total Price</h3>
                          <div className="text-right">
                             <span className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 text-transparent bg-clip-text">${totalPrice}</span>
                             {quantity > 0 && <p className="text-sm text-slate-400">{quantity} stickers at ${selectedQuantityOption.pricePer.toFixed(2)} each</p>}
                          </div>
                        </div>
                        <Button size="lg" className="w-full text-lg h-14 font-bold bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-emerald-600 hover:to-green-600" onClick={handleAddToCart} disabled={quantity <= 0 || appState.stickers.length === 0}>
                          Add to Cart
                        </Button>
                      </div>
                  </div>
              </div>
            </div>
        </div>

      </div>
      <StickerContextMenu
          isOpen={contextMenu.isOpen}
          position={contextMenu.position}
          onClose={closeContextMenu}
          onDelete={handleDeleteSticker}
          onDuplicate={handleDuplicateSticker}
          onBringToFront={handleBringToFront}
        />
    </div>
  );
}
