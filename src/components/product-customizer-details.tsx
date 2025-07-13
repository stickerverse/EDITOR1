"use client"

import { useState } from 'react';
import { Star, Wand2, Loader2, Sparkles, Upload, ImagePlus, FileCheck2, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { generateSticker } from '@/ai/flows/generate-sticker-flow';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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

export function ProductCustomizerDetails({ onStickerUpdate }: { onStickerUpdate: (dataUrl: string, source: 'upload' | 'generate') => void }) {
  const { toast } = useToast();
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

  const processFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            onStickerUpdate(dataUrl, 'upload');
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
        onStickerUpdate(result.imageDataUri, 'generate');
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

  return (
    <div className="flex flex-col space-y-6">
      <header>
        <h1 className="text-3xl md:text-4xl font-bold font-headline tracking-tight">
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
                <p className="text-sm text-muted-foreground font-medium"><span className="text-foreground">5.0</span> (4,882 reviews)</p>
            </div>
        </div>
      </header>
      
      <CustomizationSection title="Upload your artwork">
        <Tabs defaultValue="generate" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate" onClick={() => setUploadedFileName(null)}><Wand2 className="mr-2 h-4 w-4"/>Generate</TabsTrigger>
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
                        "relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted transition-colors",
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
          <AccordionTrigger className="text-lg font-semibold">Size</AccordionTrigger>
          <AccordionContent>
            <div className="flex items-center gap-4">
                <div className="flex flex-1 items-center rounded-md border border-input">
                    <Button variant="ghost" size="icon" className="h-full rounded-r-none" onClick={() => handleSizeChange('w', width - 1)}><Minus className="h-4 w-4"/></Button>
                    <Input type="number" value={width} onChange={(e) => handleSizeChange('w', Number(e.target.value))} className="w-full text-base h-12 text-center border-y-0 border-x !ring-0 focus-visible:!ring-0" aria-label="Width in inches" />
                    <Button variant="ghost" size="icon" className="h-full rounded-l-none" onClick={() => handleSizeChange('w', width + 1)}><Plus className="h-4 w-4"/></Button>
                </div>
                <span className="text-muted-foreground font-semibold">x</span>
                <div className="flex flex-1 items-center rounded-md border border-input">
                    <Button variant="ghost" size="icon" className="h-full rounded-r-none" onClick={() => handleSizeChange('h', height - 1)}><Minus className="h-4 w-4"/></Button>
                    <Input type="number" value={height} onChange={(e) => handleSizeChange('h', Number(e.target.value))} className="w-full text-base h-12 text-center border-y-0 border-x !ring-0 focus-visible:!ring-0" aria-label="Height in inches" />
                    <Button variant="ghost" size="icon" className="h-full rounded-l-none" onClick={() => handleSizeChange('h', height + 1)}><Plus className="h-4 w-4"/></Button>
                </div>
                <div className="text-sm font-medium text-muted-foreground">inches</div>
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="material">
          <AccordionTrigger className="text-lg font-semibold">Material</AccordionTrigger>
          <AccordionContent>
            <RadioGroup value={material} onValueChange={setMaterial} className="grid grid-cols-1 gap-3">
              {materials.map((m) => (
                <div key={m.id}>
                  <RadioGroupItem value={m.id} id={`material-${m.id}`} className="sr-only" />
                  <Label htmlFor={`material-${m.id}`} className={cn("cursor-pointer rounded-lg border-2 p-4 transition-all flex items-center gap-4", material === m.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                    <div className="flex-1">
                      <p className="font-semibold">{m.name}</p>
                      <p className="text-sm text-muted-foreground">{m.description}</p>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </AccordionContent>
        </AccordionItem>
         <AccordionItem value="lamination">
          <AccordionTrigger className="text-lg font-semibold">Lamination</AccordionTrigger>
          <AccordionContent>
            <RadioGroup value={finish} onValueChange={setFinish} className="grid grid-cols-1 gap-3">
              {finishes.map((f) => (
                 <div key={f.id}>
                  <RadioGroupItem value={f.id} id={`finish-${f.id}`} className="sr-only" />
                  <Label htmlFor={`finish-${f.id}`} className={cn("cursor-pointer rounded-lg border-2 p-4 transition-all flex items-center gap-4", finish === f.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                    <div className="flex-1">
                      <p className="font-semibold">{f.name}</p>
                      <p className="text-sm text-muted-foreground">{f.description}</p>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="quantity">
          <AccordionTrigger className="text-lg font-semibold">Quantity</AccordionTrigger>
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
                    className="w-full h-12 text-center text-lg font-bold"
                    placeholder="Custom quantity..."
                    onChange={handleCustomQuantityChange}
                    onFocus={() => setQuantity(0)}
                />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Card className="mt-4 shadow-md border-primary/20 sticky bottom-4">
        <CardHeader className="flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg font-headline">Total Price</CardTitle>
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
      </Card>
    </div>
  );
}

function CustomizationSection({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      <h2 className="text-xl font-semibold font-headline">{title}</h2>
      {children}
    </div>
  );
}
