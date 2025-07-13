
"use client"

import { useState } from 'react';
import { ChevronRight, Star, Square, Circle, Sparkles, Sparkle, Layers, FlipHorizontal, Upload, Wand2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ContourCutIcon, RoundedRectangleIcon, VinylIcon } from '@/components/icons';
import { useToast } from "@/hooks/use-toast";
import { generateSticker } from '@/ai/flows/generate-sticker-flow';


const shapes = [
  { id: 'contour', name: 'Contour Cut', icon: ContourCutIcon },
  { id: 'square', name: 'Square', icon: Square },
  { id: 'circle', name: 'Circle', icon: Circle },
  { id: 'rounded', name: 'Rounded Corners', icon: RoundedRectangleIcon },
];

const materials = [
  { id: 'vinyl', name: 'Vinyl', icon: VinylIcon },
  { id: 'holographic', name: 'Holographic', icon: Sparkles },
  { id: 'transparent', name: 'Transparent', icon: Layers },
  { id: 'glitter', name: 'Glitter', icon: Sparkle },
  { id: 'mirror', name: 'Mirror', icon: FlipHorizontal },
];

const finishes = [
  { id: 'glossy', name: 'Glossy' },
  { id: 'matte', name: 'Matte' },
  { id: 'cracked_ice', name: 'Cracked Ice' },
];

const quantityOptions = [
  { quantity: 50, pricePer: 0.89, discount: 0 },
  { quantity: 100, pricePer: 0.69, discount: 22 },
  { quantity: 200, pricePer: 0.54, discount: 39 },
  { quantity: 500, pricePer: 0.44, discount: 50 },
  { quantity: 1000, pricePer: 0.35, discount: 60 },
];

export function ProductCustomizer({ onStickerUpdate }: { onStickerUpdate: (dataUrl: string) => void }) {
  const { toast } = useToast();
  const [shape, setShape] = useState(shapes[0].id);
  const [material, setMaterial] = useState(materials[0].id);
  const [finish, setFinish] = useState(finishes[0].id);
  const [width, setWidth] = useState(3);
  const [height, setHeight] = useState(3);
  const [quantity, setQuantity] = useState(quantityOptions[0].quantity);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);


  const selectedQuantityOption = quantityOptions.find(q => q.quantity === quantity) || quantityOptions[0];
  const totalPrice = (selectedQuantityOption.pricePer * selectedQuantityOption.quantity).toFixed(2);
  
  const handleAddToCart = () => {
    toast({
      title: "Added to Cart!",
      description: `Your custom ${shape} stickers are on the way.`,
    })
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        onStickerUpdate(dataUrl);
      };
      reader.readAsDataURL(file);
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
    try {
      const result = await generateSticker({ prompt });
      if (result.imageDataUri) {
        onStickerUpdate(result.imageDataUri);
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


  const isCustomQuantity = !quantityOptions.some(q => q.quantity === quantity);

  return (
    <div className="flex flex-col space-y-6">
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center space-x-1 text-sm text-muted-foreground">
          <li><a href="#" className="hover:text-primary transition-colors">Home</a></li>
          <li><ChevronRight className="h-4 w-4" /></li>
          <li><a href="#" className="hover:text-primary transition-colors">Stickers</a></li>
          <li><ChevronRight className="h-4 w-4" /></li>
          <li><span className="font-medium text-foreground">Custom Stickers</span></li>
        </ol>
      </nav>

      <header>
        <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight">
            <span className="bg-gradient-to-r from-primary via-accent to-primary/80 bg-clip-text text-transparent">
                Custom Stickers
            </span>
        </h1>
        <p className="mt-3 text-muted-foreground max-w-prose">High quality, durable, and fully customizable stickers for any occasion.</p>
        <div className="mt-4 flex items-center gap-4">
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
      
      <Separator />

      <CustomizationSection title="Design your Sticker">
        <Tabs defaultValue="generate" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate"><Wand2 className="mr-2"/>Generate with AI</TabsTrigger>
            <TabsTrigger value="upload"><Upload className="mr-2"/>Upload Image</TabsTrigger>
          </TabsList>
          <TabsContent value="generate" className="mt-4">
            <div className="space-y-4">
                <Textarea
                    placeholder="e.g., A cute baby panda developer writing code, sticker, vector art"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={3}
                />
                <Button onClick={handleGenerateSticker} disabled={isGenerating} className="w-full">
                    {isGenerating ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                        </>
                    ) : (
                        <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Generate Sticker
                        </>
                    )}
                </Button>
            </div>
          </TabsContent>
          <TabsContent value="upload" className="mt-4">
            <div className="space-y-2">
              <Label htmlFor="picture">Upload your design</Label>
              <Input id="picture" type="file" accept="image/*" onChange={handleImageUpload} />
            </div>
          </TabsContent>
        </Tabs>
      </CustomizationSection>

      <CustomizationSection title="Shape">
        <RadioGroup value={shape} onValueChange={setShape} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {shapes.map((s) => (
            <div key={s.id}>
              <RadioGroupItem value={s.id} id={`shape-${s.id}`} className="sr-only" />
              <Label htmlFor={`shape-${s.id}`} className={cn("cursor-pointer rounded-lg border-2 p-4 flex flex-col items-center justify-center gap-2 transition-all", shape === s.id ? "border-primary bg-primary/5 shadow-inner" : "border-border hover:border-primary/50")}>
                <s.icon className="w-8 h-8 mb-1 text-primary" />
                <span className="text-sm font-medium text-center">{s.name}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </CustomizationSection>

      <CustomizationSection title="Material">
        <RadioGroup value={material} onValueChange={setMaterial} className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {materials.map((m) => (
             <div key={m.id}>
              <RadioGroupItem value={m.id} id={`material-${m.id}`} className="sr-only" />
              <Label htmlFor={`material-${m.id}`} className={cn("cursor-pointer rounded-lg border-2 p-4 flex flex-col items-center justify-center gap-2 transition-all", material === m.id ? "border-primary bg-primary/5 shadow-inner" : "border-border hover:border-primary/50")}>
                <m.icon className="w-8 h-8 mb-1 text-primary" />
                <span className="text-sm font-medium text-center">{m.name}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </CustomizationSection>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CustomizationSection title="Finish" className="col-span-1">
           <Select value={finish} onValueChange={setFinish}>
            <SelectTrigger className="w-full text-base h-12">
              <SelectValue placeholder="Select a finish" />
            </SelectTrigger>
            <SelectContent>
              {finishes.map((f) => (
                <SelectItem key={f.id} value={f.id} className="text-base">{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CustomizationSection>

        <CustomizationSection title="Size (inches)" className="col-span-1">
          <div className="flex items-center gap-4">
            <Input type="number" value={width} onChange={(e) => setWidth(Number(e.target.value))} className="w-full text-base h-12 text-center" aria-label="Width in inches" />
            <span className="text-muted-foreground font-semibold">x</span>
            <Input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value))} className="w-full text-base h-12 text-center" aria-label="Height in inches" />
          </div>
        </CustomizationSection>
      </div>

      <CustomizationSection title="Quantity">
        <RadioGroup value={isCustomQuantity ? "custom" : quantity.toString()} onValueChange={(value) => {
            if (value !== "custom") {
              setQuantity(parseInt(value, 10));
            }
        }} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quantityOptions.map((q) => (
            <div key={q.quantity}>
              <RadioGroupItem value={q.quantity.toString()} id={`quantity-${q.quantity}`} className="sr-only" />
              <Label htmlFor={`quantity-${q.quantity}`} className={cn("cursor-pointer rounded-lg border-2 p-3 transition-all flex items-center justify-between", quantity === q.quantity ? "border-primary bg-primary/5 shadow-inner" : "border-border hover:border-primary/50")}>
                <div className="text-left">
                  <p className="font-bold text-lg">{q.quantity}</p>
                  <p className="text-sm text-muted-foreground">${q.pricePer.toFixed(2)} each</p>
                </div>
                {q.discount > 0 && (
                  <Badge variant="default" className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold">{q.discount}% OFF</Badge>
                )}
              </Label>
            </div>
          ))}
          <div>
            <RadioGroupItem value="custom" id="quantity-custom" className="sr-only" />
            <Label htmlFor="quantity-custom" className={cn("cursor-pointer rounded-lg border-2 p-3 transition-all flex items-center justify-between", isCustomQuantity ? "border-primary bg-primary/5 shadow-inner" : "border-border hover:border-primary/50")}>
                <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">Custom</span>
                    <Input
                        type="number"
                        id="custom-quantity-input"
                        className="w-24 h-8 text-center"
                        value={isCustomQuantity ? quantity : ""}
                        placeholder="Qty"
                        onChange={handleCustomQuantityChange}
                        onFocus={() => {
                            if (!isCustomQuantity) {
                                setQuantity(0); // or a default custom value
                            }
                        }}
                    />
                </div>
            </Label>
          </div>
        </RadioGroup>
      </CustomizationSection>

      <Card className="mt-4 shadow-md border-primary/20">
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl font-headline">Total Price</CardTitle>
          <span className="text-3xl font-bold font-headline text-primary">${totalPrice}</span>
        </CardHeader>
        <CardContent>
           <Button size="lg" className="w-full text-lg h-12 mt-4 font-bold" onClick={handleAddToCart}>
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
      <h2 className="text-lg font-semibold font-headline">{title}</h2>
      {children}
    </div>
  );
}
