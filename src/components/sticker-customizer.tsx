"use client";

import Image from 'next/image';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Star, Wand2, Upload, Sparkles, FileCheck2, ImagePlus, Minus, Plus } from 'lucide-react';
import { removeBackground } from '@/ai/flows/remove-background-flow';
import { addBorder } from '@/ai/flows/add-border-flow';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { generateSticker } from '@/ai/flows/generate-sticker-flow';

const BORDER_WIDTHS = ["thin", "medium", "thick", "extra-thick"];
const BORDER_COLORS = [
  { value: "white", label: "White", color: "#FFFFFF" },
  { value: "black", label: "Black", color: "#000000" },
  { value: "red", label: "Red", color: "#EF4444" },
  { value: "blue", label: "Blue", color: "#3B82F6" },
  { value: "green", label: "Green", color: "#22C55E" },
];

const materials = [
  { id: 'vinyl', name: 'White Vinyl', description: 'Our most popular, great for any use.' },
  { id: 'holographic', name: 'Holographic', description: 'Eye-catching rainbow effect.' },
  { id: 'transparent', name: 'Clear', description: 'Fully transparent material.' },
  { id: 'glitter', name: 'Glitter', description: 'Sparkly and attention-grabbing.' },
  { id: 'mirror', name: 'Mirror', description: 'Reflective, chrome-like finish.' },
];

const finishes = [
  { id: 'glossy', name: 'Glossy', description: 'Shiny and vibrant, great for outdoors.' },
  { id: 'matte', name: 'Matte', description: 'Smooth, non-reflective, premium feel.' },
  { id: 'cracked_ice', name: 'Cracked Ice', description: 'Holographic with a shattered glass look.' },
];

const quantityOptions = [
  { quantity: 50, pricePer: 0.89 },
  { quantity: 100, pricePer: 0.69 },
  { quantity: 200, pricePer: 0.54 },
  { quantity: 500, pricePer: 0.44 },
  { quantity: 1000, pricePer: 0.35 },
];


interface StickerState {
  source: 'upload' | 'generate' | null;
  originalUrl: string | null;
  bgRemovedUrl: string | null;
  borderedUrls: Record<string, string>;
  bgRemoved: boolean;
  borderAdded: boolean;
  borderWidthIndex: number;
  borderColor: string;
  isLoading: boolean;
  loadingText: string;
}

const initialState: StickerState = {
  source: null,
  originalUrl: null,
  bgRemovedUrl: null,
  borderedUrls: {},
  bgRemoved: false,
  borderAdded: false,
  borderWidthIndex: 1, 
  borderColor: BORDER_COLORS[0].value,
  isLoading: false,
  loadingText: "",
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function CustomizationSection({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      <h2 className="text-xl font-semibold font-headline">{title}</h2>
      {children}
    </div>
  );
}

const GlassmorphicCard = ({ className, ...props }: React.ComponentProps<typeof Card>) => (
  <Card
    className={cn(
      "bg-white/40 backdrop-blur-lg border border-white/20 shadow-lg rounded-2xl",
      className
    )}
    {...props}
  />
);

export function StickerCustomizer() {
  const { toast } = useToast();
  const stableToast = useCallback(toast, []);
  
  const [sticker, setSticker] = useState<StickerState>(initialState);
  
  const debouncedBorderWidthIndex = useDebounce(sticker.borderWidthIndex, 300);
  const debouncedBorderColor = useDebounce(sticker.borderColor, 300);

  const [material, setMaterial] = useState(materials[0].id);
  const [finish, setFinish] = useState(finishes[0].id);
  const [width, setWidth] = useState(3);
  const [height, setHeight] = useState(3);
  const [quantity, setQuantity] = useState(quantityOptions[0].quantity);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

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

  const handleStickerUpdate = useCallback((newImage: string, source: 'upload' | 'generate') => {
    setSticker(s => ({
      ...initialState,
      originalUrl: newImage,
      source: source,
      bgRemoved: source === 'generate',
      bgRemovedUrl: source === 'generate' ? newImage : null,
      borderAdded: s.borderAdded,
      borderColor: s.borderColor,
      borderWidthIndex: s.borderWidthIndex
    }));
  }, []);

  const processFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            handleStickerUpdate(dataUrl, 'upload');
            setUploadedFileName(file.name);
            toast({
                title: "Image Uploaded",
                description: `${file.name} is ready for printing.`,
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
        handleStickerUpdate(result.imageDataUri, 'generate');
        toast({
          title: "Sticker Generated!",
          description: "Your new sticker design is ready.",
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

  const handleSizeChange = (type: 'w' | 'h', value: number) => {
    if (value >= 1) {
      if (type === 'w') setWidth(value);
      if (type === 'h') setHeight(value);
    }
  }

  const handleBackgroundToggle = async (checked: boolean) => {
    if (sticker.source !== 'upload' || !sticker.originalUrl) return;

    setSticker(s => ({ ...s, bgRemoved: checked, borderAdded: checked ? s.borderAdded : false }));

    if (checked) {
      if (sticker.bgRemovedUrl) return;
      
      setSticker(s => ({ ...s, isLoading: true, loadingText: "Removing Background..." }));
      try {
        const result = await removeBackground({ imageDataUri: sticker.originalUrl });
        if (result.imageDataUri) {
          setSticker(s => ({ ...s, bgRemovedUrl: result.imageDataUri, isLoading: false, loadingText: "" }));
          stableToast({
            title: 'Success!',
            description: 'The background has been removed.',
          });
        } else {
          throw new Error('Background removal failed to return data.');
        }
      } catch (error) {
        console.error('Background removal failed:', error);
        stableToast({
          variant: 'destructive',
          title: 'Background Removal Failed',
          description: 'Could not remove background. Please try again.',
        });
        setSticker(s => ({ ...s, bgRemoved: false, isLoading: false, loadingText: "" }));
      }
    }
  };
  
  const handleBorderToggle = (checked: boolean) => {
    setSticker(s => ({ ...s, borderAdded: checked }));
  };
  
  const handleBorderWidthChange = (value: number[]) => {
    setSticker(s => ({...s, borderWidthIndex: value[0]}));
  };

  const handleBorderColorChange = (colorValue: string) => {
    setSticker(s => ({...s, borderColor: colorValue}));
  };

  useEffect(() => {
    if (
      sticker.source !== 'upload' ||
      !sticker.borderAdded ||
      !sticker.bgRemoved ||
      !sticker.bgRemovedUrl
    ) {
      return;
    }

    const applyBorder = async () => {
      const key = `${debouncedBorderWidthIndex}-${debouncedBorderColor}`;
      if (sticker.borderedUrls[key]) return;
      
      setSticker(s => ({ ...s, isLoading: true, loadingText: "Applying Border..." }));
      try {
        const result = await addBorder({
          imageDataUri: sticker.bgRemovedUrl!,
          borderWidth: BORDER_WIDTHS[debouncedBorderWidthIndex],
          borderColor: debouncedBorderColor,
        });

        if (result.imageDataUri) {
          setSticker(s => ({ 
            ...s, 
            borderedUrls: { ...s.borderedUrls, [key]: result.imageDataUri },
            isLoading: false,
            loadingText: ""
          }));
        } else {
          throw new Error('Border addition failed to return data.');
        }
      } catch (error) {
        console.error('Adding border failed:', error);
        stableToast({
          variant: 'destructive',
          title: 'Border Addition Failed',
          description: 'Could not add border. Please try again.',
        });
        setSticker(s => ({ ...s, isLoading: false, loadingText: "" }));
      }
    };
    
    applyBorder();
  }, [
    sticker.source,
    debouncedBorderWidthIndex, 
    debouncedBorderColor, 
    sticker.borderAdded,
    sticker.bgRemoved, 
    sticker.bgRemovedUrl, 
    sticker.borderedUrls,
    stableToast
  ]);


  const imageToDisplay = useMemo(() => {
    const borderKey = `${debouncedBorderWidthIndex}-${debouncedBorderColor}`;
    if (sticker.borderAdded && sticker.bgRemoved && sticker.borderedUrls[borderKey]) {
      return sticker.borderedUrls[borderKey];
    }
    if (sticker.bgRemoved && sticker.bgRemovedUrl) {
      return sticker.bgRemovedUrl;
    }
    return sticker.originalUrl;
  }, [sticker, debouncedBorderColor, debouncedBorderWidthIndex]);

  const showBgRemoveToggle = sticker.source === 'upload';
  const showBorderControls = showBgRemoveToggle;

  return (
    <div className="container mx-auto px-0 py-0 md:py-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
        <div className="lg:sticky lg:top-8 h-max flex flex-col items-center gap-4">
          <GlassmorphicCard className="w-full max-w-lg aspect-square overflow-hidden">
            <CardContent className="p-0 h-full w-full">
              {sticker.isLoading && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-10">
                  <Loader2 className="h-12 w-12 animate-spin text-white" />
                  <p className="text-white mt-4 font-semibold">{sticker.loadingText}</p>
                </div>
              )}
               <div className="relative w-full h-full flex items-center justify-center p-4">
                <Image
                    src={imageToDisplay || "https://placehold.co/800x800.png"}
                    alt="Custom Sticker Preview"
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-contain transition-transform duration-300 hover:scale-105"
                    data-ai-hint="sticker design"
                    priority
                />
              </div>
            </CardContent>
          </GlassmorphicCard>
           {showBorderControls && (
            <GlassmorphicCard className="w-full max-w-lg">
                <CardContent className="p-4 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="background-switch" className="flex flex-col space-y-1">
                            <span className="font-medium text-gray-800">Remove Background</span>
                            <span className="text-xs text-gray-600">Automatically removes the background.</span>
                        </Label>
                        <Switch
                            id="background-switch"
                            checked={sticker.bgRemoved}
                            onCheckedChange={handleBackgroundToggle}
                            disabled={sticker.isLoading || !sticker.originalUrl}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="border-switch" className="flex flex-col space-y-1">
                            <span className={cn("font-medium text-gray-800", !sticker.bgRemoved && "text-gray-400")}>Add Sticker Border</span>
                            <span className={cn("text-xs text-gray-600", !sticker.bgRemoved && "text-gray-400")}>Adds a classic die-cut border.</span>
                        </Label>
                        <Switch
                            id="border-switch"
                            checked={sticker.borderAdded}
                            onCheckedChange={handleBorderToggle}
                            disabled={sticker.isLoading || !sticker.bgRemoved}
                        />
                    </div>
                    {sticker.borderAdded && sticker.bgRemoved && (
                    <div className="space-y-4 pt-4 border-t border-white/30">
                        <div className="grid gap-2">
                          <Label className="text-sm font-medium text-gray-800">Border Width</Label>
                          <Slider
                            value={[sticker.borderWidthIndex]}
                            onValueChange={handleBorderWidthChange}
                            min={0}
                            max={BORDER_WIDTHS.length - 1}
                            step={1}
                            disabled={sticker.isLoading}
                          />
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-sm font-medium text-gray-800">Border Color</Label>
                            <div className="flex items-center gap-2">
                                {BORDER_COLORS.map(color => (
                                    <button
                                        key={color.value}
                                        type="button"
                                        title={color.label}
                                        onClick={() => handleBorderColorChange(color.value)}
                                        className={cn(
                                            "w-8 h-8 rounded-full border-2 transition-transform hover:scale-110",
                                            sticker.borderColor === color.value ? "ring-2 ring-offset-2 ring-primary" : "border-white/50",
                                            sticker.isLoading && "cursor-not-allowed opacity-50"
                                        )}
                                        style={{ backgroundColor: color.color }}
                                        disabled={sticker.isLoading}
                                    >
                                      <span className="sr-only">{color.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    )}
                </CardContent>
            </GlassmorphicCard>
           )}
        </div>
        
        <GlassmorphicCard className="flex flex-col space-y-6 p-6">
          <header>
              <h1 className="text-3xl md:text-4xl font-bold font-headline tracking-tight text-gray-900">
                  Custom Die Cut Stickers
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
                      <p className="text-sm text-gray-700 font-medium"><span className="text-gray-900 font-semibold">5.0</span> (4,882 reviews)</p>
                  </div>
              </div>
            </header>
            
            <CustomizationSection title="Upload your artwork">
              <Tabs defaultValue="generate" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="generate" onClick={() => { setUploadedFileName(null); handleStickerUpdate('', 'generate'); }}><Wand2 className="mr-2 h-4 w-4"/>Generate</TabsTrigger>
                  <TabsTrigger value="upload"><Upload className="mr-2 h-4 w-4"/>Upload</TabsTrigger>
                </TabsList>
                <TabsContent value="generate" className="mt-4">
                  <div className="space-y-4">
                      <Textarea
                          placeholder="e.g., A cute baby panda developer writing code"
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          rows={3}
                      />
                      <Button onClick={handleGenerateSticker} disabled={isGenerating} className="w-full">
                          {isGenerating ? (
                              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
                          ) : (
                              <><Sparkles className="mr-2 h-4 w-4" />Generate Sticker</>
                          )}
                      </Button>
                  </div>
                </TabsContent>
                <TabsContent value="upload" className="mt-4">
                  <div className="space-y-2">
                      <Label
                          htmlFor="picture"
                          className={cn(
                              "relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-white/30 hover:bg-white/50 transition-colors",
                              isDragging && "border-primary bg-primary/10",
                              uploadedFileName && "border-green-500 bg-green-500/10"
                          )}
                          onDrop={handleDrop} onDragOver={handleDragOver} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave}
                      >
                          <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                              {uploadedFileName ? (
                                  <>
                                      <FileCheck2 className="w-8 h-8 mb-2 text-green-500" />
                                      <p className="font-semibold text-green-600">File Uploaded!</p>
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
                          <Input id="picture" type="file" accept="image/*" className="sr-only" onChange={handleImageUpload} />
                      </Label>
                  </div>
                </TabsContent>
              </Tabs>
            </CustomizationSection>
            
            <Accordion type="multiple" defaultValue={['size', 'quantity']} className="w-full">
              <AccordionItem value="size">
                <AccordionTrigger className="text-lg font-semibold text-gray-800">Size</AccordionTrigger>
                <AccordionContent>
                  <div className="flex items-center gap-4">
                      <div className="flex flex-1 items-center rounded-md border border-input">
                          <Button variant="ghost" size="icon" className="h-full rounded-r-none" onClick={() => handleSizeChange('w', width - 1)}><Minus className="h-4 w-4"/></Button>
                          <Input type="number" value={width} onChange={(e) => handleSizeChange('w', Number(e.target.value))} className="w-full text-base h-12 text-center border-y-0 border-x !ring-0 focus-visible:!ring-0 bg-transparent" aria-label="Width in inches" />
                          <Button variant="ghost" size="icon" className="h-full rounded-l-none" onClick={() => handleSizeChange('w', width + 1)}><Plus className="h-4 w-4"/></Button>
                      </div>
                      <span className="text-muted-foreground font-semibold">x</span>
                      <div className="flex flex-1 items-center rounded-md border border-input">
                          <Button variant="ghost" size="icon" className="h-full rounded-r-none" onClick={() => handleSizeChange('h', height - 1)}><Minus className="h-4 w-4"/></Button>
                          <Input type="number" value={height} onChange={(e) => handleSizeChange('h', Number(e.target.value))} className="w-full text-base h-12 text-center border-y-0 border-x !ring-0 focus-visible:!ring-0 bg-transparent" aria-label="Height in inches" />
                          <Button variant="ghost" size="icon" className="h-full rounded-l-none" onClick={() => handleSizeChange('h', height + 1)}><Plus className="h-4 w-4"/></Button>
                      </div>
                      <div className="text-sm font-medium text-muted-foreground">inches</div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="material">
                <AccordionTrigger className="text-lg font-semibold text-gray-800">Material</AccordionTrigger>
                <AccordionContent>
                  <RadioGroup value={material} onValueChange={setMaterial} className="grid grid-cols-1 gap-3">
                    {materials.map((m) => (
                      <div key={m.id}>
                        <RadioGroupItem value={m.id} id={`material-${m.id}`} className="sr-only" />
                        <Label htmlFor={`material-${m.id}`} className={cn("cursor-pointer rounded-lg border-2 p-4 transition-all flex items-center gap-4 border-white/30 bg-white/20 hover:bg-white/40", material === m.id ? "border-primary bg-primary/10" : "hover:border-primary/50")}>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-800">{m.name}</p>
                            <p className="text-sm text-gray-600">{m.description}</p>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </AccordionContent>
              </AccordionItem>
               <AccordionItem value="lamination">
                <AccordionTrigger className="text-lg font-semibold text-gray-800">Lamination</AccordionTrigger>
                <AccordionContent>
                  <RadioGroup value={finish} onValueChange={setFinish} className="grid grid-cols-1 gap-3">
                    {finishes.map((f) => (
                       <div key={f.id}>
                        <RadioGroupItem value={f.id} id={`finish-${f.id}`} className="sr-only" />
                        <Label htmlFor={`finish-${f.id}`} className={cn("cursor-pointer rounded-lg border-2 p-4 transition-all flex items-center gap-4 border-white/30 bg-white/20 hover:bg-white/40", finish === f.id ? "border-primary bg-primary/10" : "hover:border-primary/50")}>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-800">{f.name}</p>
                            <p className="text-sm text-gray-600">{f.description}</p>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="quantity">
                <AccordionTrigger className="text-lg font-semibold text-gray-800">Quantity</AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {quantityOptions.map((q) => (
                      <Button key={q.quantity} variant={quantity === q.quantity ? "default" : "outline"} onClick={() => handleQuantityButtonClick(q.quantity)} className="h-auto flex-col py-2">
                        <span className="font-bold text-lg">{q.quantity}</span>
                        <span className="text-xs">${q.pricePer.toFixed(2)}/sticker</span>
                      </Button>
                    ))}
                  </div>
                  <div className="mt-4 relative">
                      <Input
                          type="number"
                          id="custom-quantity-input"
                          className="w-full h-12 text-center text-lg font-bold bg-white/50"
                          placeholder="Custom quantity..."
                          onChange={handleCustomQuantityChange}
                          onFocus={() => setQuantity(0)}
                      />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <GlassmorphicCard className="mt-4 sticky bottom-4">
              <CardHeader className="flex-row items-center justify-between pb-4">
                <CardTitle className="text-lg font-headline text-gray-800">Total Price</CardTitle>
                <div className="text-right">
                   <span className="text-3xl font-bold font-headline text-primary">${totalPrice}</span>
                   {quantity > 0 && <p className="text-sm text-muted-foreground">{quantity} stickers at ${selectedQuantityOption.pricePer.toFixed(2)} each</p>}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                 <Button size="lg" className="w-full text-lg h-14 font-bold" onClick={handleAddToCart} disabled={quantity <= 0}>
                  Add to Cart
                </Button>
              </CardContent>
            </GlassmorphicCard>
        </GlassmorphicCard>
      </div>
    </div>
  );
}
