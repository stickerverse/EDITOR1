
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Star, Wand2, Upload, Sparkles, FileCheck2, ImagePlus, Scissors, Type, SheetIcon, Library, Palette, CaseSensitive, LayoutGrid, Trash2, GripVertical, Settings, Lock, Unlock } from 'lucide-react';
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
import { ContourCutIcon } from '@/components/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


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
    settings: { autoPackEnabled: false, showBleedArea: true },
  },
  designLibrary: [],
  stickers: [],
};

type DragDataType = {
    type: 'sticker' | 'design';
    id: string;
    offsetX: number;
    offsetY: number;
}

function CustomizationSection({ title, icon: Icon, children, className }: { title: string; icon: React.ElementType; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
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

const ThemedCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, children, ...props }, ref) => (
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


export function StickerCustomizer() {
  const { toast } = useToast();
  const [appState, setAppState] = useState<AppState>(initialAppState);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [activeStickerId, setActiveStickerId] = useState<string | null>(null);

  const [quantity, setQuantity] = useState(quantityOptions[0].quantity);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Drag states for updating UI smoothly without re-rendering everything
  const [draggedItem, setDraggedItem] = useState<DragDataType | null>(null);
  const [draggedOffset, setDraggedOffset] = useState<{ x: number, y: number } | null>(null);
  
  const [isDraggingOverCanvas, setIsDraggingOverCanvas] = useState(false);
  const [isDraggingOverTrash, setIsDraggingOverTrash] = useState(false);
  
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [stickerType, setStickerType] = useState('die-cut');

  // State for Text Decals
  const [decalText, setDecalText] = useState('Your Text Here');
  const [decalFont, setDecalFont] = useState('serif');
  const [decalColor, setDecalColor] = useState('#FFFFFF');
  
  // State for Sheet Configuration
  const [sheetLayout, setSheetLayout] = useState({ rows: 2, cols: 2 });
  const [hoveredLayout, setHoveredLayout] = useState({ rows: 0, cols: 0 });
  
  // State for sticker properties
  const [isAspectRatioLocked, setIsAspectRatioLocked] = useState(true);

  const selectedQuantityOption = quantityOptions.find(q => q.quantity === quantity) || { quantity: quantity, pricePer: 1.25 };
  const totalPrice = (selectedQuantityOption.pricePer * selectedQuantityOption.quantity).toFixed(2);

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
    } else if (!isNaN(numValue) && numValue > 0) {
        setQuantity(numValue);
    }
  };

  const addDesignToLibrary = (design: Omit<Design, 'designId' | 'originalDimensions'>, dimensions: {width: number, height: number}) => {
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

  const addStickerToSheet = (designId: string, position?: {x: number, y: number}) => {
    const stickerId = `inst_${Math.random().toString(36).substr(2, 9)}`;
    const newSticker: StickerInstance = {
      stickerId,
      designId,
      position: position ? { ...position, unit: 'px' } : { x: 50, y: 50, unit: 'px' },
      size: { width: 100, height: 100, unit: 'px' },
      rotation: 0,
      cutLine: { type: stickerType === 'kiss-cut' ? 'kiss_cut' : 'die_cut', offset: 0.1, shape: 'auto' },
    };

    setAppState(current => {
      const isSingleStickerMode = stickerType === 'die-cut' || stickerType === 'kiss-cut';
      const newStickers = isSingleStickerMode ? [newSticker] : [...current.stickers, newSticker];
      return { ...current, stickers: newStickers };
    });
    setActiveStickerId(stickerId);
  }

  const processFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            
            const img = new window.Image();
            img.onload = () => {
              const newDesign = addDesignToLibrary(
                {
                  sourceType: 'upload',
                  sourceUrl: dataUrl,
                  fileName: file.name,
                },
                { width: img.width, height: img.height }
              );
              addStickerToSheet(newDesign.designId);
              setUploadedFileName(file.name);
              toast({
                  title: "Image Uploaded",
                  description: `${file.name} is added to your library.`,
              });
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
    } else {
        toast({
            variant: "destructive",
            title: "Invalid File Type",
            description: "Please upload a valid image file.",
        });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
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
    setUploadedFileName(null);
    try {
      const result = await generateSticker({ prompt });
      if (result.imageDataUri) {
        const img = new window.Image();
        img.onload = () => {
            const newDesign = addDesignToLibrary(
              {
                sourceType: 'ai_generated',
                sourceUrl: result.imageDataUri,
                aiPrompt: prompt,
              },
              { width: img.width, height: img.height }
            );
            addStickerToSheet(newDesign.designId);
            toast({
              title: "Sticker Generated!",
              description: "Your new design has been added.",
            });
        };
        img.src = result.imageDataUri;
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
    }
  };
  
  const handleDragStart = (e: React.DragEvent, type: 'sticker' | 'design', id: string) => {
    const target = e.target as HTMLElement;
    const rect = target.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    const dragData: DragDataType = { type, id, offsetX, offsetY };
    setDraggedItem(dragData);
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedItem) {
        const canvasRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setDraggedOffset({ 
            x: e.clientX - canvasRect.left - draggedItem.offsetX, 
            y: e.clientY - canvasRect.top - draggedItem.offsetY
        });
    }
  };


  const handleDropOnCanvas = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOverCanvas(false);
    
    const canvasRect = e.currentTarget.getBoundingClientRect();
    const dataString = e.dataTransfer.getData('application/json');
    if (!dataString) return;

    const data: DragDataType = JSON.parse(dataString);
    const x = e.clientX - canvasRect.left - data.offsetX;
    const y = e.clientY - canvasRect.top - data.offsetY;

    if (data.type === 'sticker') { // Moving an existing sticker
        setAppState(current => ({
            ...current,
            stickers: current.stickers.map(s => 
                s.stickerId === data.id ? { ...s, position: { ...s.position, x, y } } : s
            )
        }));
    } else if (data.type === 'design') { // Adding a new sticker from the library
        addStickerToSheet(data.id, { x, y });
    }
    setDraggedItem(null);
    setDraggedOffset(null);
  };
  
  const handleDropOnTrash = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOverTrash(false);
    const dataString = e.dataTransfer.getData('application/json');
    if (!dataString) return;

    const data: DragDataType = JSON.parse(dataString);
    if (data.type === 'sticker') {
        setAppState(current => ({
            ...current,
            stickers: current.stickers.filter(s => s.stickerId !== data.id)
        }));
        if (activeStickerId === data.id) {
          setActiveStickerId(null);
        }
        toast({
            title: "Sticker Removed",
            description: "The sticker has been removed from your sheet.",
        });
    }
    setDraggedItem(null);
    setDraggedOffset(null);
  };


  const handleAddTextDecal = () => {
    const newDesign = addDesignToLibrary(
      {
        sourceType: 'text',
        textData: {
          content: decalText,
          font: decalFont,
          color: decalColor,
        },
      },
      { width: 300, height: 100 } // Placeholder dimensions for text
    );
    addStickerToSheet(newDesign.designId);
    toast({
      title: "Text Decal Added",
      description: "Your text has been added to the sheet."
    });
  }


  // Find the active sticker and its design
  const activeSticker = appState.stickers.find(s => s.stickerId === activeStickerId);
  const activeDesign = activeSticker ? appState.designLibrary.find(d => d.designId === activeSticker.designId) : null;
  
  const imageToDisplay = activeDesign?.sourceUrl ?? appState.designLibrary.find(d => d.sourceType !== 'text')?.sourceUrl;

  const handleStickerSizeChange = (dimension: 'width' | 'height', value: string) => {
    const numValue = parseInt(value, 10);
    if (!activeSticker || !activeDesign || isNaN(numValue) || numValue <= 0) return;

    let newWidth = activeSticker.size.width;
    let newHeight = activeSticker.size.height;
    const aspectRatio = activeDesign.originalDimensions.width / activeDesign.originalDimensions.height;

    if (dimension === 'width') {
      newWidth = numValue;
      if (isAspectRatioLocked) {
        newHeight = Math.round(numValue / aspectRatio);
      }
    } else {
      newHeight = numValue;
      if (isAspectRatioLocked) {
        newWidth = Math.round(numValue * aspectRatio);
      }
    }

    setAppState(current => ({
      ...current,
      stickers: current.stickers.map(s => 
        s.stickerId === activeStickerId ? { ...s, size: { ...s.size, width: newWidth, height: newHeight } } : s
      )
    }));
  };

  const renderDesignControls = () => {
    switch (stickerType) {
      case 'die-cut':
      case 'kiss-cut':
        return (
          <CustomizationSection title="Add a Design" icon={ImagePlus}>
            <Tabs defaultValue="generate" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-800 text-slate-400">
                <TabsTrigger value="generate"><Wand2 className="mr-2 h-4 w-4"/>Generate</TabsTrigger>
                <TabsTrigger value="upload"><Upload className="mr-2 h-4 w-4"/>Upload</TabsTrigger>
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
                            <><Sparkles className="mr-2 h-4 w-4" />Generate Design</>
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
                             "border-indigo-500 bg-indigo-900/20",
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
                        <Input id="picture" type="file" accept="image/*" className="sr-only" onChange={handleImageUpload} />
                    </Label>
                </div>
              </TabsContent>
            </Tabs>
          </CustomizationSection>
        );
      case 'sheet':
        return (
          <>
            <CustomizationSection title="Sheet Configuration" icon={LayoutGrid}>
                <div className="flex items-center space-x-4 rounded-lg bg-slate-800/50 p-3 border border-slate-700">
                    <div className="flex-1">
                      <Label htmlFor="auto-pack" className="text-slate-200 font-semibold">Auto-pack stickers</Label>
                      <p className="text-xs text-slate-400">Automatically arrange stickers for best fit.</p>
                    </div>
                    <Switch
                      id="auto-pack"
                      checked={appState.stickerSheet.settings.autoPackEnabled}
                      onCheckedChange={(checked) => setAppState(s => ({...s, stickerSheet: {...s.stickerSheet, settings: {...s.stickerSheet.settings, autoPackEnabled: checked}}}))}
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
            
            <CustomizationSection title="Design Library" icon={Library}>
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
                          onDragStart={(e) => handleDragStart(e, 'design', design.designId)}
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
                              <Image 
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
                  <Tabs defaultValue="generate" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 text-slate-400">
                        <TabsTrigger value="generate"><Wand2 className="mr-2 h-4 w-4"/>Generate</TabsTrigger>
                        <TabsTrigger value="upload"><Upload className="mr-2 h-4 w-4"/>Upload</TabsTrigger>
                        <TabsTrigger value="text"><Type className="mr-2 h-4 w-4"/>Text</TabsTrigger>
                    </TabsList>
                    <TabsContent value="generate" className="mt-4">
                        <div className="space-y-2">
                            <Textarea
                                placeholder="e.g., A cute baby panda developer"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                rows={2}
                                className="bg-slate-800 border-slate-700 text-slate-200"
                            />
                            <Button onClick={handleGenerateSticker} disabled={isGenerating} className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold hover:from-indigo-600 hover:to-purple-600">
                                {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating</> : <><Sparkles className="mr-2 h-4 w-4" />Generate & Add</>}
                            </Button>
                        </div>
                    </TabsContent>
                    <TabsContent value="upload" className="mt-4">
                        <Label
                            htmlFor="picture-library"
                            className={cn(
                                "relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-slate-800/50 hover:bg-slate-700/50 transition-colors border-slate-700",
                                uploadedFileName && "border-emerald-500 bg-emerald-900/20"
                            )}
                            onDragEnter={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-indigo-500', 'bg-indigo-900/20');}}
                            onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-900/20');}}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-900/20');
                                const file = e.dataTransfer.files?.[0];
                                if (file) processFile(file);
                            }}
                            onDragOver={(e) => e.preventDefault()}
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
                            <Input id="picture-library" type="file" accept="image/*" className="sr-only" onChange={handleImageUpload} />
                        </Label>
                    </TabsContent>
                    <TabsContent value="text" className="mt-4">
                        <div className="space-y-2">
                            <Input 
                                placeholder="Your Text Here"
                                value={decalText}
                                onChange={(e) => setDecalText(e.target.value)}
                                className="bg-slate-800 border-slate-700 text-slate-200"
                            />
                            <Button onClick={handleAddTextDecal} className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold hover:from-blue-600 hover:to-cyan-600">
                                <Type className="mr-2 h-4 w-4" /> Add Text to Library
                            </Button>
                        </div>
                    </TabsContent>
                  </Tabs>
              </div>
            </CustomizationSection>
          </>
        );
      case 'decal':
        return (
          <CustomizationSection title="Create Text Decal" icon={Type}>
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
              <Button onClick={handleAddTextDecal} className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold hover:from-indigo-600 hover:to-purple-600">
                <Type className="mr-2 h-4 w-4" /> Add Text to Sheet
              </Button>
            </div>
          </CustomizationSection>
        );
      default:
        return null;
    }
  }
  
  const renderStickerInstance = (sticker: StickerInstance) => {
    const design = appState.designLibrary.find(d => d.designId === sticker.designId);
    if (!design) return null;

    const isDraggable = stickerType === 'sheet' && !appState.stickerSheet.settings.autoPackEnabled;

    if (design.sourceType === 'text' && design.textData) {
        return (
            <div
                key={sticker.stickerId}
                draggable={isDraggable}
                onDragStart={(e) => handleDragStart(e, 'sticker', sticker.stickerId)}
                onClick={() => setActiveStickerId(sticker.stickerId)}
                className={cn(
                    "absolute flex items-center justify-center p-2 break-words text-center select-none",
                    isDraggable && "cursor-grab active:cursor-grabbing",
                    activeStickerId === sticker.stickerId && "outline-dashed outline-2 outline-indigo-400",
                    draggedItem?.id === sticker.stickerId && "opacity-50"
                )}
                style={{
                    left: `${sticker.position.x}px`,
                    top: `${sticker.position.y}px`,
                    width: `${sticker.size.width}px`,
                    height: `${sticker.size.height}px`,
                    transform: `rotate(${sticker.rotation}deg)`,
                    color: design.textData.color,
                    fontFamily: design.textData.font,
                }}
            >
                <span className="text-4xl lg:text-6xl font-bold p-4 break-words text-center">
                    {design.textData.content}
                </span>
            </div>
        )
    }

    if (design.sourceUrl) {
        return (
            <div
                key={sticker.stickerId}
                draggable={isDraggable}
                onDragStart={(e) => handleDragStart(e, 'sticker', sticker.stickerId)}
                onClick={() => setActiveStickerId(sticker.stickerId)}
                className={cn(
                    "absolute select-none",
                    isDraggable && "cursor-grab active:cursor-grabbing",
                    activeStickerId === sticker.stickerId && "outline-dashed outline-2 outline-indigo-400 rounded-md",
                )}
                style={{
                    left: `${draggedItem?.id === sticker.stickerId && draggedOffset ? draggedOffset.x : sticker.position.x}px`,
                    top: `${draggedItem?.id === sticker.stickerId && draggedOffset ? draggedOffset.y : sticker.position.y}px`,
                    width: `${sticker.size.width}px`,
                    height: `${sticker.size.height}px`,
                    transform: `rotate(${sticker.rotation}deg)`,
                    opacity: draggedItem?.id === sticker.stickerId ? 0.5 : 1,
                }}
            >
                <Image
                    src={design.sourceUrl}
                    alt="sticker instance"
                    fill
                    sizes="(max-width: 768px) 10vw, 100px"
                    className="object-contain pointer-events-none"
                    priority={sticker.stickerId === activeStickerId}
                />
            </div>
        );
    }

    return null;
  }

  const renderCanvasContent = () => {
    // For sheet product type, render the grid or stickers
    if (stickerType === 'sheet') {
      const showGrid = appState.stickerSheet.settings.autoPackEnabled || appState.stickers.length === 0;
      
      if (showGrid) {
          return (
             <div 
              className="grid w-full h-full gap-2 p-2"
              style={{
                gridTemplateRows: `repeat(${sheetLayout.rows}, 1fr)`,
                gridTemplateColumns: `repeat(${sheetLayout.cols}, 1fr)`,
              }}
            >
              {Array.from({ length: sheetLayout.rows * sheetLayout.cols }).map((_, i) => (
                <div key={i} className="relative w-full h-full bg-slate-800/50 rounded-md flex items-center justify-center">
                  {appState.stickerSheet.settings.autoPackEnabled && imageToDisplay ? (
                    <Image
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
      
      // If auto-pack is off and there are stickers, render them
      return appState.stickers.map(renderStickerInstance);
    }
    
    // For other product types (die-cut, kiss-cut, decal)
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


  return (
    <div className="container mx-auto px-0 py-0 md:py-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
        <div className="lg:sticky lg:top-8 h-max flex flex-col items-center gap-4 group">
            <ThemedCard className="w-full max-w-lg aspect-square">
              <div 
                className={cn(
                  "relative bg-transparent rounded-lg w-full h-full p-0 transition-all duration-200",
                  "border-2 border-dashed border-slate-700",
                  isDraggingOverCanvas && "outline-dashed outline-2 outline-offset-4 outline-indigo-500"
                )}
                onDrop={handleDropOnCanvas}
                onDragOver={handleDragOver}
                onDragEnter={() => setIsDraggingOverCanvas(true)}
                onDragLeave={() => setIsDraggingOverCanvas(false)}
              >
              {isLoading && (
                <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center z-20 rounded-lg">
                  <Loader2 className="h-12 w-12 animate-spin text-white" />
                  <p className="text-white mt-4 font-semibold">{loadingText}</p>
                </div>
              )}
                {/* This area will become the sticker sheet canvas */}
                <div className="w-full h-full flex items-center justify-center relative overflow-hidden rounded-lg">
                  {renderCanvasContent()}
                </div>
              </div>
            </ThemedCard>
           {stickerType === 'sheet' && (
             <div 
                onDrop={handleDropOnTrash}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setIsDraggingOverTrash(true); }}
                onDragLeave={() => setIsDraggingOverTrash(false)}
                className={cn(
                    "flex items-center justify-center gap-2 rounded-lg p-3 w-48 transition-colors",
                    isDraggingOverTrash ? "bg-red-500/20 text-red-400" : "bg-slate-800 text-slate-500"
                )}
            >
                <Trash2 className="h-5 w-5" />
                <span>Drag here to remove</span>
            </div>
           )}
        </div>
        
        <ThemedCard>
          <div className="flex flex-col space-y-6">
            <header>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                    Create Your Sticker
                </h1>
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
            
              <CustomizationSection title="Product Type" icon={Scissors}>
                <Select value={stickerType} onValueChange={setStickerType}>
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
                                <SheetIcon className="h-5 w-5 text-purple-400" />
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

              {renderDesignControls()}

              {activeSticker && activeDesign && (
                 <CustomizationSection title="Sticker Properties" icon={Settings}>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 items-center">
                        <div>
                            <Label htmlFor="width" className="text-xs font-medium text-slate-400">Width (px)</Label>
                            <Input
                                id="width"
                                type="number"
                                value={Math.round(activeSticker.size.width)}
                                onChange={(e) => handleStickerSizeChange('width', e.target.value)}
                                className="bg-slate-800 border-slate-700 text-slate-200"
                            />
                        </div>
                        <div className="self-end pb-2.5">
                            <Button variant="ghost" size="icon" onClick={() => setIsAspectRatioLocked(!isAspectRatioLocked)} className="h-8 w-8 text-slate-400 hover:bg-slate-700 hover:text-white">
                                {isAspectRatioLocked ? <Lock className="h-4 w-4"/> : <Unlock className="h-4 w-4" />}
                            </Button>
                        </div>
                        <div>
                            <Label htmlFor="height" className="text-xs font-medium text-slate-400">Height (px)</Label>
                            <Input
                                id="height"
                                type="number"
                                value={Math.round(activeSticker.size.height)}
                                onChange={(e) => handleStickerSizeChange('height', e.target.value)}
                                className="bg-slate-800 border-slate-700 text-slate-200"
                            />
                        </div>
                    </div>
                  </div>
                </CustomizationSection>
              )}
            
              <Accordion type="multiple" defaultValue={['material', 'quantity']} className="w-full space-y-6">
                <CustomizationSection title="Material" icon={Palette}>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {materials.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => !m.outOfStock && setAppState(s => ({...s, stickerSheet: {...s.stickerSheet, material: {id: m.id, name: m.name}}}))}
                        disabled={m.outOfStock}
                        className={cn(
                          "relative group rounded-lg p-2 text-center transition-all duration-200 border-2 bg-slate-900/50",
                          appState.stickerSheet.material.id === m.id ? "border-indigo-500" : "border-slate-700 hover:border-slate-600",
                          m.outOfStock && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {m.outOfStock && (
                          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            Sold Out
                          </div>
                        )}
                        <Image src={m.image} alt={m.name} width={96} height={96} className="mx-auto mb-2 rounded-md" />
                        <p className="font-semibold text-sm text-slate-200 group-disabled:text-slate-500">{m.name}</p>
                      </button>
                    ))}
                  </div>
                </CustomizationSection>
                <CustomizationSection title="Quantity" icon={Sparkles}>
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
                </CustomizationSection>
              </Accordion>
            
              <div className="p-0.5 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 mt-4 sticky bottom-4 shadow-lg shadow-indigo-500/20">
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
        </ThemedCard>
      </div>
    </div>
  );
}
