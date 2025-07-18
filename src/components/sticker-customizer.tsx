"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import NextImage from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Star, Upload, Sparkles, FileCheck2, ImagePlus, Type, Library, Palette, CaseSensitive, LayoutGrid, GripVertical, Settings, RotateCw, Copy, ChevronsUp, Trash2, Layers, Lock, Unlock, Eye, Code, Ruler } from 'lucide-react';
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
import { ContourCutIcon, RoundedRectangleIcon as RoundedIcon, SquareIcon as SquareShapeIcon, CircleIcon as CircleShapeIcon } from '@/components/icons';
import { StickerContextMenu } from '@/components/sticker-context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SizeSelector } from '@/components/size-selector';
import type { Size } from '@/components/size-selector';
import { removeBackgroundAction } from '@/app/actions';
import { addBorder } from '@/ai/flows/add-border-flow';
import { Card } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { StickerPreview } from '@/components/3d-sticker-preview';
import { AnimatedIconContainer } from '@/components/animated-icon';
import { FabricToolbar } from '@/components/fabric-toolbar';
import type { BorderStyle } from '@/components/fabric-toolbar';

// Constants
const PIXELS_PER_INCH = 96;
const MAX_QUANTITY = 10000;
const MIN_STICKER_SIZE = 20; // minimum size in pixels
const DEFAULT_STICKER_SIZE = 100; // default size for new stickers

// Helper function to safely calculate aspect ratios
const calculateAspectRatio = (design: Design): number => {
  if (!design.originalDimensions || design.originalDimensions.height === 0) {
    console.warn('Design height is zero or missing, defaulting to square aspect ratio');
    return 1;
  }
  return design.originalDimensions.width / design.originalDimensions.height;
};

const materials = [
    { id: 'vinyl', name: 'Vinyl', image: 'https://d6ce0no7ktiq.cloudfront.net/images/attachment/2023/06/08/4d0ae46e9e164daa9171d70e51cd46c7acaa2419.png' },
    { id: 'holographic', name: 'Holographic', image: 'https://d6ce0no7ktiq.cloudfront.net/images/attachment/2023/03/09/48e2c5c8c6ab57d013675b3b245daa2136e0c7cf.png' },
    { id: 'transparent', name: 'Transparent', image: 'https://d6ce0no7ktiq.cloudfront.net/images/attachment/2023/03/09/2d46e2873ec899b83a152c2f2ad52c1368398333.png' },
    { id: 'matte', name: 'Matte', image: 'https://i.postimg.cc/D0HPYtFy/matte.png' },
];

const quantityOptions = [
  { quantity: 25, pricePer: 1.29 },
  { quantity: 50, pricePer: 0.89 },
  { quantity: 75, pricePer: 0.79 },
  { quantity: 100, pricePer: 0.69 },
  { quantity: 150, pricePer: 0.62 },
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
  sourceType: 'upload' | 'ai_generated' | 'library' | 'text' | 'clipart';
  sourceUrl?: string; // Optional for text
  originalDimensions: { width: number; height: number; };
  fileName?: string;
  aiPrompt?: string;
  clipartId?: string;
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
    sheetId: `sheet_${Math.random().toString(36).substring(2, 11)}`,
    userId: `user_${Math.random().toString(36).substring(2, 11)}`,
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

function CustomizationSection({ id, title, icon: Icon, children, className }: { 
  id?: string; 
  title: string; 
  icon: React.ElementType; 
  children: React.ReactNode; 
  className?: string 
}) {
  return (
    <div id={id} className={cn("space-y-4", className)}>
        <div className="flex items-center gap-3">
            <AnimatedIconContainer>
                <Icon className="h-4 w-4 text-white/80" />
            </AnimatedIconContainer>
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        </div>
        <Card className="p-4 shadow-sm">
            {children}
        </Card>
    </div>
  );
}

interface StickerCustomizerProps {
    productType: string;
}

export function StickerCustomizer({ productType }: StickerCustomizerProps) {
  const { toast } = useToast();
  const [appState, setAppState] = useState<AppState>(initialAppState);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [activeStickerId, setActiveStickerId] = useState<string | null>(null);

  const [quantity, setQuantity] = useState(quantityOptions[1].quantity);
  const [quantitySelectionType, setQuantitySelectionType] = useState<'preset' | 'custom'>('preset');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [dragAction, setDragAction] = useState<DragAction>(null);
  
  const [stickerShape, setStickerShape] = useState<StickerShape>('Die Cut');

  // State for Text Decals
  const [decalText, setDecalText] = useState('Your Text Here');
  const [decalFont, setDecalFont] = useState('serif');
  const [decalColor, setDecalColor] = useState('#000000');
  
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
    activePresetId: '2in'
  });

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    position: { x: 0, y: 0 },
    stickerId: null,
  });

  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'design' | 'preview'>('design');
  const [borderPreview, setBorderPreview] = useState<BorderStyle | null>(null);

  const selectedQuantityOption = quantityOptions.find(q => q.quantity === quantity) || { quantity: quantity, pricePer: 1.25 };
  const totalPrice = (selectedQuantityOption.pricePer * selectedQuantityOption.quantity).toFixed(2);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Find the active sticker and its design
  const activeSticker = appState.stickers.find(s => s.stickerId === activeStickerId);
  const activeDesign = activeSticker ? appState.designLibrary.find(d => d.designId === activeSticker.designId) : null;
  
  // Find the best image to display for preview - prioritize active design, then any image design, then any design with sourceUrl
  const imageToDisplay = activeDesign?.sourceUrl ?? 
    appState.designLibrary.find(d => d.sourceType !== 'text' && d.sourceUrl)?.sourceUrl ??
    appState.designLibrary.find(d => d.sourceUrl)?.sourceUrl;

  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);

    // Add keyboard shortcuts for canvas tools
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't trigger shortcuts when typing in input fields
      }

      switch (e.key.toLowerCase()) {
        case 'delete':
        case 'backspace':
          if (activeStickerId) {
            e.preventDefault();
            setAppState(current => ({
              ...current,
              stickers: current.stickers.filter(s => s.stickerId !== activeStickerId)
            }));
            setActiveStickerId(null);
          }
          break;
        case 'd':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (activeStickerId) {
              const originalSticker = appState.stickers.find(s => s.stickerId === activeStickerId);
              if (originalSticker) {
                addStickerToSheet(originalSticker.designId, undefined, {
                  position: { x: originalSticker.position.x + 20, y: originalSticker.position.y + 20 },
                  rotation: originalSticker.rotation
                });
              }
            }
          }
          break;
        case 'escape':
          setActiveStickerId(null);
          closeContextMenu();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeStickerId, appState.stickers]);

  // Auto-switch back to design mode if no image is available for preview
  useEffect(() => {
    if (viewMode === 'preview' && !imageToDisplay) {
      setViewMode('design');
    }
  }, [imageToDisplay, viewMode]);

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
    if (quantity <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Quantity",
        description: "Please select a valid quantity.",
      });
      return;
    }

    if (appState.stickers.length === 0) {
      toast({
        variant: "destructive",
        title: "No Designs",
        description: "Please add at least one design to your sticker.",
      });
      return;
    }

    toast({
      title: "Added to Cart!",
      description: `${quantity} custom stickers have been added to your cart.`,
    });
  };

  const handlePresetQuantityClick = (qty: number) => {
    setQuantity(qty);
    setQuantitySelectionType('preset');
  };

  const handleCustomQuantityClick = () => {
    setQuantitySelectionType('custom');
    setQuantity(0);
  };

  const handleCustomQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numValue = parseInt(value, 10);
    
    setQuantitySelectionType('custom');

    if (value === "") {
        setQuantity(0);
    } else if (!isNaN(numValue) && numValue > 0 && numValue <= MAX_QUANTITY) {
        setQuantity(numValue);
    } else if (numValue > MAX_QUANTITY) {
        setQuantity(MAX_QUANTITY);
        toast({
            variant: "destructive",
            title: "Quantity too large",
            description: `Maximum quantity is ${MAX_QUANTITY.toLocaleString()} stickers.`,
        });
    }
  };

  const addDesignToLibrary = (design: Omit<Design, 'designId' | 'originalDimensions'>, dimensions: {width: number, height: number}) => {
    const designId = `design_${Math.random().toString(36).substring(2, 11)}`;
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
  };

  const addStickerToSheet = (designId: string, designData?: Design, options?: { position?: {x: number, y: number}, zIndex?: number, rotation?: number }) => {
    const design = designData || appState.designLibrary.find(d => d.designId === designId);
    if (!design) {
      console.error(`Design not found: ${designId}`);
      return;
    }

    const stickerId = `inst_${Math.random().toString(36).substring(2, 11)}`;
    
    const maxZIndex = appState.stickers.reduce((max, s) => Math.max(max, s.zIndex), 0);

    const initialWidthPx = size.width * PIXELS_PER_INCH;
    const initialHeightPx = size.height * PIXELS_PER_INCH;
    
    // Get canvas dimensions for centering if no position provided
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    const defaultPosition = {
      x: canvasRect ? canvasRect.width / 2 - initialWidthPx / 2 : 50,
      y: canvasRect ? canvasRect.height / 2 - initialHeightPx / 2 : 50
    };
    
    const newSticker: StickerInstance = {
      stickerId,
      designId,
      position: options?.position ? { ...options.position, unit: 'px' } : { ...defaultPosition, unit: 'px' },
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
  };

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Invalid File Type",
        description: "Please upload an image file (PNG, JPG, or WEBP).",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setIsLoading(true);
        setLoadingText("Uploading image...");

        const img = new Image();
        
        img.onload = () => {
            try {
                const newDesign = addDesignToLibrary(
                    {
                        sourceType: 'upload',
                        sourceUrl: dataUrl,
                        fileName: file.name,
                    },
                    { width: img.width, height: img.height }
                );
                
                // Add the sticker to the center of the canvas
                const canvasRect = canvasRef.current?.getBoundingClientRect();
                const centerX = canvasRect ? canvasRect.width / 2 - DEFAULT_STICKER_SIZE / 2 : 200;
                const centerY = canvasRect ? canvasRect.height / 2 - DEFAULT_STICKER_SIZE / 2 : 200;
                
                addStickerToSheet(newDesign.designId, newDesign, {
                    position: { x: centerX, y: centerY }
                });
                
                setUploadedFileName(file.name);
                toast({
                    title: "Image Uploaded!",
                    description: `${file.name} has been added to your canvas.`,
                });
            } catch (error) {
                console.error('Error processing uploaded image:', error);
                toast({
                    variant: "destructive",
                    title: "Processing Failed",
                    description: "Could not process the uploaded image.",
                });
            } finally {
                setIsLoading(false);
                setLoadingText("");
            }
        };
        
        img.onerror = () => {
            console.error('Failed to load uploaded image');
            toast({
                variant: "destructive",
                title: "Image Load Failed",
                description: "Could not load the uploaded image.",
            });
            setIsLoading(false);
            setLoadingText("");
        };
        
        img.src = dataUrl;
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
    if (!prompt.trim()) {
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
        
        const { imageDataUri: noBgDataUri } = await removeBackgroundAction({ imageDataUri: result.imageDataUri });
        
        setLoadingText("Adding die-cut border...");
        const { imageDataUri: finalDataUri } = await addBorder({
            imageDataUri: noBgDataUri,
            borderColor: 'white',
            borderWidth: 'thick'
        });

        const img = new Image();
        
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
            setIsLoading(false);
            setLoadingText("");
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
      setIsGenerating(false);
      setIsLoading(false);
      setLoadingText("");
    } finally {
      setIsGenerating(false);
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

    try {
        const dataString = e.dataTransfer.getData('application/json');
        if (dataString) {
            const data: {type: 'design' | 'canvas-sticker', id: string} = JSON.parse(dataString);
            const x = e.clientX - canvasRect.left;
            const y = e.clientY - canvasRect.top;

            if (data.type === 'design') {
                addStickerToSheet(data.id, undefined, { position: { x: x - 50, y: y - 50 }});
            }
        }
    } catch (err) {
        console.error("Failed to parse dropped data", err);
        toast({
            variant: "destructive",
            title: "Drop Failed",
            description: "Could not process the dropped item.",
        });
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
    closeContextMenu();
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
    closeContextMenu();
  };

  const handleBringToFront = () => {
    if (!contextMenu.stickerId) return;
    const maxZIndex = appState.stickers.reduce((max, s) => Math.max(max, s.zIndex), 0);
    setAppState(current => ({
      ...current,
      stickers: current.stickers.map(s => 
        s.stickerId === contextMenu.stickerId ? { ...s, zIndex: maxZIndex + 1 } : s
      ).sort((a, b) => a.zIndex - b.zIndex)
    }));
    toast({ title: "Brought to Front" });
    closeContextMenu();
  };

  const handleAddTextDecal = () => {
    if (!decalText.trim()) {
      toast({
        variant: "destructive",
        title: "No Text",
        description: "Please enter some text for your decal.",
      });
      return;
    }

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
  };

  // Fabric toolbar handlers
  const handleRemoveBackground = async () => {
    if (!activeStickerId || !activeDesign?.sourceUrl) {
      toast({
        variant: "destructive",
        title: "No Image Selected",
        description: "Please select an image on the canvas to remove its background.",
      });
      return;
    }

    setIsLoading(true);
    setLoadingText("Removing background...");

    try {
      const { imageDataUri } = await removeBackgroundAction({
        imageDataUri: activeDesign.sourceUrl,
      });

      // Update the active design with the background-removed image
      setAppState(current => ({
        ...current,
        designLibrary: current.designLibrary.map(d =>
          d.designId === activeDesign.designId
            ? { ...d, sourceUrl: imageDataUri }
            : d
        )
      }));

      toast({
        title: "Background Removed!",
        description: "The background has been successfully removed.",
      });
    } catch (error) {
      console.error("Background removal failed:", error);
      toast({
        variant: "destructive",
        title: "Background Removal Failed",
        description: "Could not remove the background. Please try again.",
      });
    } finally {
      setIsLoading(false);
      setLoadingText("");
    }
  };

  const handleAddBorder = async (borderStyle: BorderStyle) => {
    if (!activeDesign?.sourceUrl) {
      toast({
        variant: "destructive",
        title: "No Image Selected",
        description: "Please select an image to add a border.",
      });
      return;
    }

    setIsLoading(true);
    setLoadingText("Adding border...");

    try {
      const { imageDataUri: borderedDataUri } = await addBorder({
        imageDataUri: activeDesign.sourceUrl,
        borderColor: borderStyle.color,
        borderWidth: borderStyle.width > 10 ? 'thick' : borderStyle.width > 5 ? 'medium' : 'thin'
      });

      // Update the active design with the bordered image
      setAppState(current => ({
        ...current,
        designLibrary: current.designLibrary.map(d => 
          d.designId === activeDesign.designId 
            ? { ...d, sourceUrl: borderedDataUri }
            : d
        )
      }));

      toast({
        title: "Border Added!",
        description: "The border has been successfully added.",
      });
    } catch (error) {
      console.error("Border addition failed:", error);
      toast({
        variant: "destructive",
        title: "Border Addition Failed",
        description: "Could not add the border. Please try again.",
      });
    } finally {
      setIsLoading(false);
      setLoadingText("");
      setBorderPreview(null);
    }
  };

  const handleAddClipart = (clipartId: string) => {
    // For now, we'll create a simple colored shape based on the clipart ID
    // In a real implementation, you'd have actual clipart images
    const clipartDesign = {
      sourceType: 'clipart' as const,
      clipartId: clipartId,
      // This would be replaced with actual clipart image URLs
      sourceUrl: `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="60">${clipartId === 'heart' ? '❤️' : clipartId === 'star' ? '⭐' : '🔸'}</text></svg>`,
    };
    
    const newDesign = addDesignToLibrary(clipartDesign, { width: 100, height: 100 });
    addStickerToSheet(newDesign.designId, newDesign);
    
    toast({
      title: "Clipart Added!",
      description: "The clipart has been added to your canvas.",
    });
  };

  // Live preview handlers
  const handleBorderPreview = (borderStyle: BorderStyle) => {
    setBorderPreview(borderStyle);
  };

  const handleClearBorderPreview = () => {
    setBorderPreview(null);
  };

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
    
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch (error) {
      console.warn('Could not capture pointer:', error);
    }
    
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
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (!canvasRect) return;
        
        let newX = dragAction.originalSticker.position.x + dx;
        let newY = dragAction.originalSticker.position.y + dy;
        
        // Constrain within canvas bounds
        newX = Math.max(0, Math.min(newX, canvasRect.width - dragAction.originalSticker.size.width));
        newY = Math.max(0, Math.min(newY, canvasRect.height - dragAction.originalSticker.size.height));
        
        setAppState(current => ({
            ...current,
            stickers: current.stickers.map(s => 
                s.stickerId === dragAction.stickerId 
                    ? { ...s, position: { ...s.position, x: newX, y: newY } } 
                    : s
            )
        }));
    } else if (dragAction.type === 'resize-br') {
        const { originalSticker } = dragAction;
        const design = appState.designLibrary.find(d => d.designId === originalSticker.designId);
        if (!design) return;

        let newWidth = Math.max(MIN_STICKER_SIZE, originalSticker.size.width + dx);
        let newHeight = Math.max(MIN_STICKER_SIZE, originalSticker.size.height + dy);
        
        if(isAspectRatioLocked) {
            const aspectRatio = design.sourceType === 'text' 
                ? (originalSticker.size.height === 0 ? 1 : originalSticker.size.width / originalSticker.size.height)
                : calculateAspectRatio(design);
            newHeight = newWidth / aspectRatio;
        }

        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (canvasRect) {
            // Constrain size within canvas bounds
            const maxWidth = canvasRect.width - originalSticker.position.x;
            const maxHeight = canvasRect.height - originalSticker.position.y;
            newWidth = Math.min(newWidth, maxWidth);
            newHeight = Math.min(newHeight, maxHeight);
        }

        if (newWidth > MIN_STICKER_SIZE && newHeight > MIN_STICKER_SIZE) {
            setAppState(current => ({
                ...current,
                stickers: current.stickers.map(s => 
                    s.stickerId === dragAction.stickerId 
                        ? { ...s, size: { ...s.size, width: newWidth, height: newHeight } } 
                        : s
                )
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
        
        let newRotation = originalSticker.rotation + (angle - startAngle);
        
        // Normalize rotation to 0-360 degrees for better UX
        newRotation = ((newRotation % 360) + 360) % 360;
        
        setAppState(current => ({
            ...current,
            stickers: current.stickers.map(s => 
                s.stickerId === dragAction.stickerId 
                    ? { ...s, rotation: newRotation } 
                    : s
            )
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

        try {
          (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        } catch (error) {
          console.warn('Could not release pointer capture:', error);
        }
        setDragAction(null);
    }
  };

  const handleToggleCustomLayout = (checked: boolean) => {
    setAppState(currentAppState => {
      const designLibrary = currentAppState.designLibrary;
      const currentDesign = designLibrary.find(d => d.sourceType !== 'text' && d.sourceUrl) ?? (designLibrary.find(d => d.sourceUrl));

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
        const cellHeight = availableHeight / rows;
        
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
            const stickerId = `inst_grid_${i}_${j}_${Math.random().toString(36).substring(2, 7)}`;
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
          stickers: newStickers.sort((a, b) => a.zIndex - b.zIndex)
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
    { shape: 'square' as StickerShape, icon: SquareShapeIcon, label: 'Square' },
    { shape: 'circle' as StickerShape, icon: CircleShapeIcon, label: 'Circle' },
    { shape: 'rounded' as StickerShape, icon: RoundedIcon, label: 'Rounded Corners' },
  ];

  const renderDesignControls = () => {
    if (productType === 'sheet') {
      return (
        <>
            <CustomizationSection id="add-layer-section" title="Add Designs" icon={Layers}>
              <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload"><Upload className="mr-2 h-4 w-4"/>Upload</TabsTrigger>
                  <TabsTrigger value="text"><Type className="mr-2 h-4 w-4"/>Text</TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="mt-4">
                  <div className="space-y-2">
                      <Label
                          htmlFor="picture"
                          className={cn(
                              "relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted/50 transition-colors",
                              "hover:border-primary",
                              uploadedFileName && "border-accent"
                          )}
                      >
                          <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                              {uploadedFileName ? (
                                  <>
                                      <FileCheck2 className="w-8 h-8 mb-2 text-accent" />
                                      <p className="font-semibold text-accent">File Uploaded!</p>
                                      <p className="text-xs text-muted-foreground truncate max-w-xs">{uploadedFileName}</p>
                                  </>
                              ) : (
                                  <>
                                      <ImagePlus className="w-8 h-8 mb-2 text-muted-foreground" />
                                      <p className="mb-1 text-sm text-muted-foreground"><span className="font-semibold text-primary">Click to upload</span> or drag and drop</p>
                                      <p className="text-xs text-muted-foreground">PNG, JPG, or WEBP</p>
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
                        className="text-lg"
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="font-select" className="mb-2 block"><CaseSensitive className="inline-block mr-2 h-4 w-4"/>Font</Label>
                          <Select value={decalFont} onValueChange={setDecalFont}>
                            <SelectTrigger id="font-select">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="serif">Serif</SelectItem>
                              <SelectItem value="sans-serif">Sans-Serif</SelectItem>
                              <SelectItem value="monospace">Monospace</SelectItem>
                              <SelectItem value="cursive">Cursive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                           <Label htmlFor="color-picker" className="mb-2 block"><Palette className="inline-block mr-2 h-4 w-4"/>Color</Label>
                           <Input 
                              id="color-picker"
                              type="color" 
                              value={decalColor}
                              onChange={(e) => setDecalColor(e.target.value)}
                              className="w-full h-10 p-1"
                            />
                        </div>
                      </div>
                      <Button onClick={handleAddTextDecal} className="w-full">
                        <Type className="mr-2 h-4 w-4" /> Add Text Layer
                      </Button>
                    </div>
                </TabsContent>
              </Tabs>
            </CustomizationSection>
            
            <CustomizationSection id="sheet-config-section" title="Sheet Configuration" icon={LayoutGrid}>
                <div className="flex items-center space-x-4 rounded-lg bg-secondary p-3">
                    <div className="flex-1">
                      <Label htmlFor="custom-layout" className="font-semibold">Custom Layout</Label>
                      <p className="text-xs text-muted-foreground">Manually arrange and resize stickers.</p>
                    </div>
                    <Switch
                      id="custom-layout"
                      checked={!appState.stickerSheet.settings.autoPackEnabled}
                      onCheckedChange={handleToggleCustomLayout}
                    />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span>Sheet Layout: {sheetLayout.rows} x {sheetLayout.cols}</span>
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
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
                                  "w-8 h-8 border rounded-sm transition-colors cursor-pointer",
                                  (isHovered || isSelected) ? "bg-primary" : "bg-muted"
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
                  <div className="min-h-[120px] bg-secondary border rounded-lg p-2 flex gap-2 overflow-x-auto">
                    {appState.designLibrary.length === 0 ? (
                       <div className="w-full text-center text-muted-foreground flex flex-col justify-center items-center p-4">
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
                                className="w-full h-full flex items-center justify-center bg-card rounded-md p-1 overflow-hidden"
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
                                className="object-contain bg-card/50 rounded-md"
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
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className={cn(
            "grid w-full",
            showTextTab ? "grid-cols-2" : "grid-cols-1"
          )}>
            <TabsTrigger value="upload"><Upload className="mr-2 h-4 w-4"/>Upload</TabsTrigger>
            {showTextTab && <TabsTrigger value="text"><Type className="mr-2 h-4 w-4"/>Text</TabsTrigger>}
          </TabsList>
          <TabsContent value="upload" className="mt-4">
            <div className="space-y-2">
                <Label
                    htmlFor="picture"
                    className={cn(
                        "relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted/50 transition-colors",
                        "hover:border-primary",
                         uploadedFileName && "border-accent"
                    )}
                >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                        {uploadedFileName ? (
                            <>
                                <FileCheck2 className="w-8 h-8 mb-2 text-accent" />
                                <p className="font-semibold text-accent">File Uploaded!</p>
                                <p className="text-xs text-muted-foreground truncate max-w-xs">{uploadedFileName}</p>
                            </>
                        ) : (
                            <>
                                <ImagePlus className="w-8 h-8 mb-2 text-muted-foreground" />
                                <p className="mb-1 text-sm text-muted-foreground"><span className="font-semibold text-primary">Click to upload</span> or drag and drop</p>
                                <p className="text-xs text-muted-foreground">PNG, JPG, or WEBP</p>
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
                className="text-lg"
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="font-select" className="mb-2 block"><CaseSensitive className="inline-block mr-2 h-4 w-4"/>Font</Label>
                  <Select value={decalFont} onValueChange={setDecalFont}>
                    <SelectTrigger id="font-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="serif">Serif</SelectItem>
                      <SelectItem value="sans-serif">Sans-Serif</SelectItem>
                      <SelectItem value="monospace">Monospace</SelectItem>
                      <SelectItem value="cursive">Cursive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                   <Label htmlFor="color-picker" className="mb-2 block"><Palette className="inline-block mr-2 h-4 w-4"/>Color</Label>
                   <Input 
                      id="color-picker"
                      type="color" 
                      value={decalColor}
                      onChange={(e) => setDecalColor(e.target.value)}
                      className="w-full h-10 p-1"
                    />
                </div>
              </div>
              <Button onClick={handleAddTextDecal} className="w-full">
                <Type className="mr-2 h-4 w-4" /> Add Text Layer
              </Button>
            </div>
          </TabsContent>}
        </Tabs>
      </CustomizationSection>
    );
  };
  
  const renderStickerInstance = (sticker: StickerInstance) => {
    const design = appState.designLibrary.find(d => d.designId === sticker.designId);
    if (!design) return null;

    const isDraggable = productType !== 'sheet' || !appState.stickerSheet.settings.autoPackEnabled;
    const isSelected = activeStickerId === sticker.stickerId;
    
    const showControls = isSelected && isDraggable;

    // Apply border preview if this is the active sticker and preview is active
    const shouldShowBorderPreview = isSelected && borderPreview;
    const previewBorderStyle = shouldShowBorderPreview ? {
      border: `${borderPreview.width}px ${borderPreview.style} ${borderPreview.color}`,
      borderRadius: '4px'
    } : {};

    if (design.sourceType === 'text' && design.textData) {
        const fontSize = Math.max(12, sticker.size.width / 10);
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
                    isSelected && !shouldShowBorderPreview && "outline-dashed outline-2 outline-primary rounded-md",
                )}
                style={{
                    left: `${sticker.position.x}px`,
                    top: `${sticker.position.y}px`,
                    width: `${sticker.size.width}px`,
                    height: `${sticker.size.height}px`,
                    transform: `rotate(${sticker.rotation}deg)`,
                    zIndex: sticker.zIndex,
                    ...previewBorderStyle
                }}
            >
                <span 
                    id={`sticker-text-${sticker.stickerId}`}
                    style={{
                        color: design.textData.color,
                        fontFamily: design.textData.font,
                        fontSize: `${fontSize}px`,
                        lineHeight: 1.2,
                    }}
                >
                    {design.textData.content}
                </span>
                
                {showControls && (
                    <>
                        <div
                            className="absolute -bottom-2 -right-2 w-4 h-4 bg-primary rounded-full cursor-nwse-resize touch-none"
                            onPointerDown={(e) => {e.stopPropagation(); handlePointerDown(e, 'resize-br', sticker.stickerId);}}
                        />
                        <div
                            className="absolute -top-2 -right-2 w-4 h-4 bg-primary rounded-full cursor-grab active:cursor-grabbing touch-none"
                            onPointerDown={(e) => {e.stopPropagation(); handlePointerDown(e, 'rotate', sticker.stickerId);}}
                        >
                            <RotateCw className="w-3 h-3 text-primary-foreground" style={{margin: '0.125rem'}} />
                        </div>
                    </>
                )}
            </div>
        );
    }

    // For image-based stickers
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
                isSelected && !shouldShowBorderPreview && "outline-dashed outline-2 outline-primary rounded-md"
            )}
            style={{
                left: `${sticker.position.x}px`,
                top: `${sticker.position.y}px`,
                width: `${sticker.size.width}px`,
                height: `${sticker.size.height}px`,
                transform: `rotate(${sticker.rotation}deg)`,
                zIndex: sticker.zIndex,
                ...previewBorderStyle
            }}
        >
            {design.sourceUrl && (
                <NextImage
                    src={design.sourceUrl}
                    alt={design.fileName || design.aiPrompt || 'sticker'}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-contain pointer-events-none"
                    draggable={false}
                />
            )}
            
            {showControls && (
                <>
                    <div
                        className="absolute -bottom-2 -right-2 w-4 h-4 bg-primary rounded-full cursor-nwse-resize touch-none"
                        onPointerDown={(e) => {e.stopPropagation(); handlePointerDown(e, 'resize-br', sticker.stickerId);}}
                    />
                    <div
                        className="absolute -top-2 -right-2 w-4 h-4 bg-primary rounded-full cursor-grab active:cursor-grabbing touch-none"
                        onPointerDown={(e) => {e.stopPropagation(); handlePointerDown(e, 'rotate', sticker.stickerId);}}
                    >
                        <RotateCw className="w-3 h-3 text-primary-foreground" style={{margin: '0.125rem'}} />
                    </div>
                </>
            )}
        </div>
    );
};

  // Main component render
  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-8">
        {/* Canvas Area */}
        <div className="space-y-6">
          {/* Canvas Toolbar */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Label className="text-sm font-medium">View Mode:</Label>
                <ToggleGroup value={viewMode} onValueChange={(value) => value && setViewMode(value as 'design' | 'preview')}>
                  <ToggleGroupItem value="design" aria-label="Design View">
                    <Code className="h-4 w-4 mr-2" />
                    Design
                  </ToggleGroupItem>
                  <ToggleGroupItem value="preview" aria-label="Preview" disabled={!imageToDisplay}>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              
              {activeSticker && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (activeStickerId) {
                        const sticker = appState.stickers.find(s => s.stickerId === activeStickerId);
                        if (sticker) {
                          addStickerToSheet(sticker.designId, undefined, {
                            position: { x: sticker.position.x + 20, y: sticker.position.y + 20 },
                            rotation: sticker.rotation
                          });
                        }
                      }
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (activeStickerId) {
                        setAppState(current => ({
                          ...current,
                          stickers: current.stickers.filter(s => s.stickerId !== activeStickerId)
                        }));
                        setActiveStickerId(null);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Main Canvas */}
          {viewMode === 'design' ? (
            <Card className="relative bg-card overflow-hidden">
              <div
                ref={canvasRef}
                className="relative w-full h-[600px] bg-white rounded-lg overflow-hidden"
                onDrop={handleDropOnCanvas}
                onDragOver={(e) => e.preventDefault()}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setActiveStickerId(null);
                    closeContextMenu();
                  }
                }}
              >
                {appState.stickers.map(renderStickerInstance)}
                
                {appState.stickers.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">Canvas is empty</p>
                      <p className="text-sm">Upload an image or add text to get started</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="p-8">
              <StickerPreview 
                imageUrl={imageToDisplay || ''}
                material={appState.stickerSheet.material.id}
                size={size}
                shape={stickerShape}
              />
            </Card>
          )}

          {/* Fabric Toolbar */}
          {viewMode === 'design' && (
            <FabricToolbar
              onRemoveBackground={handleRemoveBackground}
              onAddBorder={handleAddBorder}
              onBorderPreview={handleBorderPreview}
              onClearBorderPreview={handleClearBorderPreview}
              onAddClipart={handleAddClipart}
              isLoading={isLoading}
              hasActiveImage={!!activeDesign?.sourceUrl}
            />
          )}
        </div>

        {/* Right Panel - Controls */}
        <div className="space-y-6">
          {/* Product Controls */}
          <Accordion type="multiple" defaultValue={["layer", "shape", "size", "quantity"]} className="w-full">
            <AccordionItem value="layer">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Design
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {renderDesignControls()}
              </AccordionContent>
            </AccordionItem>

            {productType !== 'sheet' && (
              <>
                <AccordionItem value="shape">
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center gap-2">
                      <SquareShapeIcon className="h-5 w-5" />
                      Shape
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <CustomizationSection title="Sticker Shape" icon={SquareShapeIcon}>
                      <div className="grid grid-cols-2 gap-3">
                        {shapeButtons.map(({ shape, icon: Icon, label }) => (
                          <Button
                            key={shape}
                            variant={stickerShape === shape ? "default" : "outline"}
                            onClick={() => setStickerShape(shape)}
                            className="h-20 flex flex-col gap-2"
                          >
                            <Icon className="h-8 w-8" />
                            <span className="text-xs">{label}</span>
                          </Button>
                        ))}
                      </div>
                    </CustomizationSection>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="size">
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center gap-2">
                      <Ruler className="h-5 w-5" />
                      Size
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <CustomizationSection title="Sticker Size" icon={Ruler}>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label>Lock Aspect Ratio</Label>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={isAspectRatioLocked}
                              onCheckedChange={setIsAspectRatioLocked}
                            />
                            {isAspectRatioLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                          </div>
                        </div>
                        <SizeSelector size={size} onSizeChange={setSize} />
                      </div>
                    </CustomizationSection>
                  </AccordionContent>
                </AccordionItem>
              </>
            )}

            <AccordionItem value="quantity">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <ChevronsUp className="h-5 w-5" />
                  Quantity & Cart
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <CustomizationSection title="Quantity" icon={ChevronsUp}>
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-2">
                      {quantityOptions.map((option) => (
                        <Button
                          key={option.quantity}
                          variant={quantitySelectionType === 'preset' && quantity === option.quantity ? "default" : "outline"}
                          onClick={() => handlePresetQuantityClick(option.quantity)}
                          className="h-16 flex flex-col"
                        >
                          <span className="font-bold">{option.quantity}</span>
                          <span className="text-xs opacity-70">${option.pricePer}/ea</span>
                        </Button>
                      ))}
                    </div>
                    <div>
                      <Label>Custom Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        max={MAX_QUANTITY}
                        value={quantitySelectionType === 'custom' ? quantity : ''}
                        onChange={handleCustomQuantityChange}
                        onClick={handleCustomQuantityClick}
                        placeholder="Enter custom quantity"
                      />
                    </div>
                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-lg font-semibold">Total Price:</span>
                        <span className="text-2xl font-bold text-primary">${totalPrice}</span>
                      </div>
                      <Button 
                        onClick={handleAddToCart} 
                        className="w-full"
                        size="lg"
                        disabled={appState.stickers.length === 0 || quantity === 0}
                      >
                        <Star className="mr-2 h-5 w-5" />
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                </CustomizationSection>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu.isOpen && contextMenu.stickerId && (
        <StickerContextMenu
          position={contextMenu.position}
          onClose={closeContextMenu}
          onDelete={handleDeleteSticker}
          onDuplicate={handleDuplicateSticker}
          onBringToFront={handleBringToFront}
        />
      )}

      {/* Loading Overlay */}
      {(isLoading || isGenerating) && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg shadow-lg text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-lg font-medium">{loadingText || "Processing..."}</p>
          </div>
        </div>
      )}
    </div>
  );
}