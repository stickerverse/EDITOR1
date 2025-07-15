
"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Star, Wand2, Upload, Sparkles, FileCheck2, ImagePlus, Scissors, Type, SheetIcon, Library, Palette, CaseSensitive, LayoutGrid } from 'lucide-react';
import { generateSticker } from '@/ai/flows/generate-sticker-flow';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
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
  { id: 'glitter', name: 'Glitter', image: 'https://d6ce0no7ktiq.cloudfront.net/images/attachment/2023/03/09/8d48777356c014861f8e174949f2a382778c0a7e.png' },
  { id: 'mirror', name: 'Mirror', image: 'https://d6ce0no7ktiq.cloudfront.net/images/attachment/2023/03/09/c5e0f009dbf3aec33b2e8d0caac5ebcd1a10348f.png' },
  { id: 'pixie_dust', name: 'Pixie Dust', image: 'https://d6ce0no7ktiq.cloudfront.net/images/attachment/2023/08/23/46dac2bd418951b1412d4225cbdaad579aed03e4.png' },
  { id: 'prismatic', name: 'Prismatic', image: 'https://d6ce0no7ktiq.cloudfront.net/images/attachment/2023/03/09/0912457c4dccf212c92e0802fd36545d90f2bfd6.png' },
  { id: 'brushed_aluminum', name: 'Brushed Aluminum', image: 'https://d6ce0no7ktiq.cloudfront.net/images/attachment/2023/03/09/573a155499c9496b21c3f404bffb6499ae99462e.png' },
  { id: 'kraft_paper', name: 'Kraft Paper', image: 'https://d6ce0no7ktiq.cloudfront.net/images/attachment/2023/03/09/e4ae8c4973e6e530cedcce836d8366638ca4c6d3.png' },
  { id: 'hi_tack_vinyl', name: 'Hi-Tack Vinyl', image: 'https://d6ce0no7ktiq.cloudfront.net/images/attachment/2023/06/08/4d0ae46e9e164daa9171d70e51cd46c7acaa2419.png' },
  { id: 'reflective', name: 'Reflective', image: 'https://d6ce0no7ktiq.cloudfront.net/images/attachment/2024/10/16/3980001d8c15a7ed2b727613c425f8290de317cd.png' },
  { id: 'glow_in_the_dark', name: 'Glow In The Dark', image: 'https://d6ce0no7ktiq.cloudfront.net/images/attachment/2023/03/09/c23d3c3023560c21da44135bd142dc04affa380e.png' },
  { id: 'low_tack_vinyl', name: 'Low-Tack Vinyl', image: 'https://d6ce0no7ktiq.cloudfront.net/images/attachment/2023/06/08/4d0ae46e9e164daa9171d70e51cd46c7acaa2419.png', outOfStock: true },
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
  originalDimensions?: { width: number; height: number; unit: string; };
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


function CustomizationSection({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      <h2 className="text-xl font-semibold font-headline text-gray-100">{title}</h2>
      {children}
    </div>
  );
}

const ThemedCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "p-0.5 rounded-2xl bg-gradient-to-tr from-green-400 to-blue-600 transition-all duration-300 hover:shadow-[0_0_30px_1px_rgba(0,255,117,0.30)]",
      className
    )}
    {...props}
  >
    <div className="bg-[#1a1a1a] rounded-[18px] p-6 transition-all duration-200 group-hover:scale-[0.98]">
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
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [stickerType, setStickerType] = useState('die-cut');

  // State for Text Decals
  const [decalText, setDecalText] = useState('Your Text Here');
  const [decalFont, setDecalFont] = useState('serif');
  const [decalColor, setDecalColor] = useState('#FFFFFF');
  
  // State for Sheet Configuration
  const [sheetLayout, setSheetLayout] = useState({ rows: 2, cols: 2 });
  const [hoveredLayout, setHoveredLayout] = useState({ rows: 0, cols: 0 });

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

  const addDesignToLibrary = (design: Omit<Design, 'designId'>) => {
    const designId = `design_${Math.random().toString(36).substr(2, 9)}`;
    const newDesign: Design = { ...design, designId };
    
    setAppState(current => ({
      ...current,
      designLibrary: [...current.designLibrary, newDesign],
    }));
    return newDesign;
  }

  const addStickerToSheet = (designId: string) => {
    const stickerId = `inst_${Math.random().toString(36).substr(2, 9)}`;
    const newSticker: StickerInstance = {
      stickerId,
      designId,
      position: { x: 1, y: 1, unit: 'inches' },
      size: { width: 3, height: 3, unit: 'inches' },
      rotation: 0,
      cutLine: { type: stickerType === 'kiss-cut' ? 'kiss_cut' : 'die_cut', offset: 0.1, shape: 'auto' },
    };

    setAppState(current => ({
      ...current,
      stickers: [newSticker], // For single stickers, replace the existing one. For sheets, append.
    }));
    setActiveStickerId(stickerId);
  }

  const processFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            
            const newDesign = addDesignToLibrary({
              sourceType: 'upload',
              sourceUrl: dataUrl,
              fileName: file.name,
              originalDimensions: { width: 0, height: 0, unit: 'px' } // Placeholder
            });

            addStickerToSheet(newDesign.designId);
            
            setUploadedFileName(file.name);
            toast({
                title: "Image Uploaded",
                description: `${file.name} is added to your sheet.`,
            });
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

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
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
        const newDesign = addDesignToLibrary({
          sourceType: 'ai_generated',
          sourceUrl: result.imageDataUri,
          aiPrompt: prompt,
          originalDimensions: { width: 0, height: 0, unit: 'px' } // Placeholder
        });
        addStickerToSheet(newDesign.designId);
        toast({
          title: "Sticker Generated!",
          description: "Your new design has been added to the sheet.",
        });
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

  const handleAddTextDecal = () => {
    const newDesign = addDesignToLibrary({
      sourceType: 'text',
      textData: {
        content: decalText,
        font: decalFont,
        color: decalColor,
      }
    });
    addStickerToSheet(newDesign.designId);
    toast({
      title: "Text Decal Added",
      description: "Your text has been added to the sheet."
    });
  }


  // Find the active sticker and its design
  const activeSticker = appState.stickers.find(s => s.stickerId === activeStickerId);
  const activeDesign = activeSticker ? appState.designLibrary.find(d => d.designId === activeSticker.designId) : null;
  
  const imageToDisplay = activeDesign?.sourceUrl;


  const renderDesignControls = () => {
    switch (stickerType) {
      case 'die-cut':
      case 'kiss-cut':
        return (
          <CustomizationSection title="Add a Design">
            <Tabs defaultValue="generate" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-800 text-gray-400">
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
                        className="bg-gray-800 border-gray-600 text-gray-200 focus:ring-green-400"
                    />
                    <Button onClick={handleGenerateSticker} disabled={isGenerating} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold">
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
                            "relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-[#1f1f1f] hover:bg-gray-800 transition-colors border-gray-600",
                            isDragging && "border-green-400 bg-green-900/20",
                            uploadedFileName && "border-green-500 bg-green-900/20"
                        )}
                        onDrop={handleDrop} onDragOver={handleDragOver} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave}
                    >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                            {uploadedFileName ? (
                                <>
                                    <FileCheck2 className="w-8 h-8 mb-2 text-green-500" />
                                    <p className="font-semibold text-green-500">File Uploaded!</p>
                                    <p className="text-xs text-gray-400 truncate max-w-xs">{uploadedFileName}</p>
                                </>
                            ) : (
                                <>
                                    <ImagePlus className="w-8 h-8 mb-2 text-gray-500" />
                                    <p className="mb-1 text-sm text-gray-400"><span className="font-semibold text-green-400">Click to upload</span> or drag and drop</p>
                                    <p className="text-xs text-gray-500">PNG, JPG, or WEBP</p>
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
            <CustomizationSection title="Sheet Configuration">
              <DropdownMenu onOpenChange={() => setHoveredLayout({rows: 0, cols: 0})}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between bg-gray-800 border-gray-600 text-gray-200 h-12 text-base">
                    <span>{sheetLayout.rows} &times; {sheetLayout.cols} Layout</span>
                    <LayoutGrid className="h-5 w-5 text-gray-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[200px] bg-gray-800 border-gray-600 p-2">
                  <div 
                    className="grid grid-cols-5 gap-1"
                    onMouseLeave={() => setHoveredLayout({rows: 0, cols: 0})}
                  >
                    {Array.from({ length: 25 }).map((_, i) => {
                      const row = Math.floor(i / 5) + 1;
                      const col = (i % 5) + 1;
                      const isHovered = row <= hoveredLayout.rows && col <= hoveredLayout.cols;
                      const isSelected = row === sheetLayout.rows && col === sheetLayout.cols;

                      return (
                        <div
                          key={i}
                          onMouseEnter={() => setHoveredLayout({ rows: row, cols: col })}
                          onClick={() => setSheetLayout({ rows: row, cols: col })}
                          className={cn(
                            "w-8 h-8 rounded-sm cursor-pointer transition-colors duration-150",
                            "border border-gray-600",
                            isHovered ? "bg-green-500/50 border-green-400" : "bg-gray-700",
                            isSelected && "bg-green-500 !border-green-300 ring-2 ring-white"
                          )}
                        />
                      );
                    })}
                  </div>
                   <div className="text-center text-gray-400 text-sm mt-2 h-4">
                     {hoveredLayout.rows > 0 && `${hoveredLayout.rows} \u00D7 ${hoveredLayout.cols}`}
                   </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </CustomizationSection>
            <CustomizationSection title="Design Library">
              <div className="space-y-4">
                  <div className="min-h-[120px] bg-gray-800 border-gray-600 rounded-lg p-4 text-center text-gray-400 flex flex-col justify-center items-center">
                    <Library className="h-8 w-8 mb-2" />
                    <p>Your design library is empty.</p>
                    <p className="text-xs">Add designs using the controls below.</p>
                  </div>
                   <Button className="w-full bg-green-500 hover:bg-green-600 text-white font-bold"><ImagePlus className="mr-2 h-4 w-4"/>Add New Design</Button>
              </div>
            </CustomizationSection>
          </>
        );
      case 'decal':
        return (
          <CustomizationSection title="Create Text Decal">
            <div className="space-y-4">
              <Textarea
                placeholder="Your Text Here"
                value={decalText}
                onChange={(e) => setDecalText(e.target.value)}
                rows={3}
                className="bg-gray-800 border-gray-600 text-gray-200 focus:ring-green-400 text-lg"
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="font-select" className="text-gray-400 mb-2 block"><CaseSensitive className="inline-block mr-2 h-4 w-4"/>Font</Label>
                  <Select value={decalFont} onValueChange={setDecalFont}>
                    <SelectTrigger id="font-select" className="bg-gray-800 border-gray-600 text-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600 text-gray-200">
                      <SelectItem value="serif">Serif</SelectItem>
                      <SelectItem value="sans-serif">Sans-Serif</SelectItem>
                      <SelectItem value="monospace">Monospace</SelectItem>
                      <SelectItem value="cursive">Cursive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                   <Label htmlFor="color-picker" className="text-gray-400 mb-2 block"><Palette className="inline-block mr-2 h-4 w-4"/>Color</Label>
                   <Input 
                      id="color-picker"
                      type="color" 
                      value={decalColor}
                      onChange={(e) => setDecalColor(e.target.value)}
                      className="w-full h-10 p-1 bg-gray-800 border-gray-600"
                    />
                </div>
              </div>
              <Button onClick={handleAddTextDecal} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold">
                <Type className="mr-2 h-4 w-4" /> Add Text to Sheet
              </Button>
            </div>
          </CustomizationSection>
        );
      default:
        return null;
    }
  }


  return (
    <div className="container mx-auto px-0 py-0 md:py-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
        <div className="lg:sticky lg:top-8 h-max flex flex-col items-center gap-4 group">
            <div className="w-full max-w-lg aspect-square overflow-hidden p-0.5 rounded-2xl bg-gradient-to-tr from-green-400 to-blue-600 transition-all duration-300 hover:shadow-[0_0_30px_1px_rgba(0,255,117,0.30)]">
              <div className="relative bg-gray-800 rounded-[18px] w-full h-full flex items-center justify-center p-4 transition-all duration-200 group-hover:scale-[0.98]">
              {isLoading && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-10 rounded-[18px]">
                  <Loader2 className="h-12 w-12 animate-spin text-white" />
                  <p className="text-white mt-4 font-semibold">{loadingText}</p>
                </div>
              )}
                {/* This area will become the sticker sheet canvas */}
                <div className="w-full h-full border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center text-gray-500">
                    {activeDesign && activeDesign.sourceType === 'text' && activeDesign.textData ? (
                        <div 
                          style={{
                            color: activeDesign.textData.color,
                            fontFamily: activeDesign.textData.font,
                          }}
                          className="text-4xl lg:text-6xl font-bold p-4 break-words text-center"
                        >
                            {activeDesign.textData.content}
                        </div>
                    ) : imageToDisplay ? (
                         <Image
                            src={imageToDisplay}
                            alt="Active Sticker Preview"
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className="object-contain"
                            priority
                        />
                    ) : (
                        <div className="text-center">
                            <p className="text-lg font-semibold">Sticker Sheet</p>
                            <p className="text-sm">Select a product and add a design to start.</p>
                        </div>
                    )}
                </div>
              </div>
            </div>
           {activeStickerId && (
            <ThemedCard className="w-full max-w-lg">
                <div className="flex flex-col gap-4">
                    {/* Controls for the selected sticker will go here */}
                    <p className="text-gray-300 text-center">Controls for active sticker (ID: {activeStickerId}) will appear here.</p>
                </div>
            </ThemedCard>
           )}
        </div>
        
        <ThemedCard className="group">
          <div className="flex flex-col space-y-6">
            <header>
                <h1 className="text-3xl md:text-4xl font-bold font-headline tracking-tight text-gray-100">
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
                        <p className="text-sm text-gray-300 font-medium"><span className="text-gray-100 font-semibold">5.0</span> (4,882 reviews)</p>
                    </div>
                </div>
              </header>
            
              <CustomizationSection title="Product Type">
                <Select value={stickerType} onValueChange={setStickerType}>
                    <SelectTrigger className="w-full bg-gray-800 border-gray-600 text-gray-200 h-12 text-base">
                        <SelectValue placeholder="Select a product type" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600 text-gray-200">
                        <SelectItem value="die-cut">
                            <div className="flex items-center gap-3">
                                <Scissors className="h-5 w-5 text-green-400" />
                                <span className="font-semibold">Die-cut Stickers</span>
                            </div>
                        </SelectItem>
                        <SelectItem value="sheet">
                            <div className="flex items-center gap-3">
                                <SheetIcon className="h-5 w-5 text-blue-400" />
                                <span className="font-semibold">Sticker Sheets</span>
                            </div>
                        </SelectItem>
                        <SelectItem value="kiss-cut">
                           <div className="flex items-center gap-3">
                                <ContourCutIcon className="h-5 w-5 text-purple-400" />
                                <span className="font-semibold">Kiss-cut Stickers</span>
                            </div>
                        </SelectItem>
                        <SelectItem value="decal">
                           <div className="flex items-center gap-3">
                                <Type className="h-5 w-5 text-red-400" />
                                <span className="font-semibold">Text Decals</span>
                            </div>
                        </SelectItem>
                    </SelectContent>
                </Select>
              </CustomizationSection>

              {renderDesignControls()}
            
              <Accordion type="multiple" defaultValue={['material', 'quantity']} className="w-full">
                <AccordionItem value="material" className="border-gray-200/10">
                  <AccordionTrigger className="text-lg font-semibold text-gray-200">Material</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {materials.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => !m.outOfStock && setAppState(s => ({...s, stickerSheet: {...s.stickerSheet, material: {id: m.id, name: m.name}}}))}
                          disabled={m.outOfStock}
                          className={cn(
                            "relative group rounded-lg p-3 text-center transition-all duration-200 border-2",
                            appState.stickerSheet.material.id === m.id ? "bg-gray-700 border-green-400" : "bg-gray-800 border-gray-600 hover:border-gray-500",
                            m.outOfStock && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {m.outOfStock && (
                            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                              Sold Out
                            </div>
                          )}
                          <Image src={m.image} alt={m.name} width={96} height={96} className="mx-auto mb-2 rounded-md" />
                          <p className="font-semibold text-sm text-gray-200 group-disabled:text-gray-500">{m.name}</p>
                        </button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="quantity" className="border-gray-200/10">
                  <AccordionTrigger className="text-lg font-semibold text-gray-200">Quantity</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {quantityOptions.map((q) => (
                        <Button 
                          key={q.quantity} 
                          variant={quantity === q.quantity ? "default" : "outline"} 
                          onClick={() => handleQuantityButtonClick(q.quantity)} 
                          className={cn(
                            "h-auto flex-col py-3 px-2 text-center",
                            quantity === q.quantity 
                              ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                              : "border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
                          )}
                        >
                          <span className="font-bold text-lg leading-none">{q.quantity}</span>
                          <span className="text-xs text-gray-400 mt-1">${q.pricePer.toFixed(2)}/sticker</span>
                        </Button>
                      ))}
                    </div>
                    <div className="mt-4">
                        <Input
                            type="number"
                            id="custom-quantity-input"
                            className="w-full h-12 text-center text-lg font-bold bg-gray-800 border-gray-600 text-gray-200 placeholder:text-gray-500 focus:ring-primary focus:border-primary"
                            placeholder="Custom quantity..."
                            onChange={handleCustomQuantityChange}
                            onFocus={() => setQuantity(0)}
                        />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            
              <div className="p-0.5 rounded-2xl bg-gradient-to-tr from-green-400 to-blue-600 mt-4 sticky bottom-4">
                  <div className="bg-[#1a1a1a] rounded-[18px] p-4">
                    <div className="flex flex-row items-center justify-between pb-4">
                      <h3 className="text-lg font-headline text-gray-200">Total Price</h3>
                      <div className="text-right">
                         <span className="text-3xl font-bold font-headline text-green-400">${totalPrice}</span>
                         {quantity > 0 && <p className="text-sm text-gray-400">{quantity} stickers at ${selectedQuantityOption.pricePer.toFixed(2)} each</p>}
                      </div>
                    </div>
                    <Button size="lg" className="w-full text-lg h-14 font-bold bg-green-500 hover:bg-green-600 text-white" onClick={handleAddToCart} disabled={quantity <= 0 || appState.stickers.length === 0}>
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

    