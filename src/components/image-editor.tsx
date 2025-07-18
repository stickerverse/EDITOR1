
"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Upload, Loader2, Download, Image as ImageIcon, Sparkles, Trash2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from "@/hooks/use-toast";
import { removeBackgroundAction } from '@/app/actions';

export function ImageEditor() {
    const { toast } = useToast();
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [maskImage, setMaskImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showMask, setShowMask] = useState(false);
    const [viewMode, setViewMode] = useState('side-by-side');
    const [processingTime, setProcessingTime] = useState(0);

    const [threshold, setThreshold] = useState(30);
    const [smoothing, setSmoothing] = useState(2);
    const [featherRadius, setFeatherRadius] = useState(3);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const uploadAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const uploadArea = uploadAreaRef.current;
        if (!uploadArea) return;

        const handleDragOver = (e: DragEvent) => {
            e.preventDefault();
            uploadArea.classList.add('border-primary', 'bg-primary/10');
        };

        const handleDragLeave = (e: DragEvent) => {
            e.preventDefault();
            uploadArea.classList.remove('border-primary', 'bg-primary/10');
        };

        const handleDrop = (e: DragEvent) => {
            e.preventDefault();
            uploadArea.classList.remove('border-primary', 'bg-primary/10');
            const file = e.dataTransfer?.files[0];
            if (file && file.type.startsWith('image/')) {
                handleFile(file);
            }
        };

        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        uploadArea.addEventListener('drop', handleDrop);

        return () => {
            uploadArea.removeEventListener('dragover', handleDragOver);
            uploadArea.removeEventListener('dragleave', handleDragLeave);
            uploadArea.removeEventListener('drop', handleDrop);
        };
    }, []);

    const handleFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            setOriginalImage(e.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    const processImage = async () => {
        if (!originalImage) return;

        setIsProcessing(true);
        const startTime = performance.now();
        try {
            const result = await removeBackgroundAction({
                imageDataUri: originalImage,
                threshold: threshold,
                smoothing: smoothing,
                featherRadius: featherRadius,
                mode: 'auto' as const,
                edgeDetection: true,
                adaptiveThreshold: true
            });
            setProcessedImage(result.imageDataUri);
            if(result.mask) {
              setMaskImage(result.mask);
            }
        } catch (error) {
            console.error("Image processing failed:", error);
            toast({
                variant: "destructive",
                title: "Processing Failed",
                description: "Could not remove background from the image.",
            });
        } finally {
            const endTime = performance.now();
            setProcessingTime(endTime - startTime);
            setIsProcessing(false);
        }
    };
    
    const applyPreset = (preset: 'simple' | 'standard' | 'complex') => {
        const presets = {
            simple: { threshold: 15, smoothing: 1, featherRadius: 2 },
            standard: { threshold: 30, smoothing: 2, featherRadius: 3 },
            complex: { threshold: 50, smoothing: 3, featherRadius: 5 },
        };
        const p = presets[preset];
        setThreshold(p.threshold);
        setSmoothing(p.smoothing);
        setFeatherRadius(p.featherRadius);
    };

    const downloadImage = (dataUrl: string | null, filename: string) => {
        if (!dataUrl) return;
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        a.click();
    };
    
    const resetAll = () => {
        setOriginalImage(null);
        setProcessedImage(null);
        setMaskImage(null);
        setIsProcessing(false);
        setShowMask(false);
        setProcessingTime(0);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const renderImageBox = (type: 'original' | 'result' | 'mask' | 'placeholder', label: string) => {
        let src: string | null = null;
        if (type === 'original') src = originalImage;
        else if (type === 'result') src = processedImage;
        else if (type === 'mask') src = maskImage;
        
        const isCheckerboard = type === 'result';

        if (type === 'placeholder' || !src) {
            return (
                 <div className="flex flex-col h-full min-h-[400px] w-full items-center justify-center rounded-lg bg-secondary/30">
                    <div className="text-center text-muted-foreground">
                        <ImageIcon className="mx-auto h-16 w-16" />
                        <p className="mt-2">
                           {label}
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex flex-col">
                <Label className="text-center mb-2 font-semibold">{label}</Label>
                <div className={cn("relative flex h-full min-h-[400px] w-full items-center justify-center rounded-lg bg-secondary/30", isCheckerboard && "transparent-bg")}>
                    <img src={src} alt={label} className="max-h-[600px] max-w-full" />
                </div>
            </div>
        );
    };

    const renderImageView = () => {
        const imageToShow = showMask ? 'mask' : 'result';
        const imageToShowSrc = showMask ? maskImage : processedImage;

        if (viewMode === 'side-by-side') {
            return (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {renderImageBox('original', 'Original')}
                    {imageToShowSrc ? renderImageBox(imageToShow, showMask ? 'Mask' : 'Result') : renderImageBox('placeholder', 'Result will appear here')}
                </div>
            );
        }
        return (
            <div className="grid grid-cols-1 gap-4">
                 {imageToShowSrc ? renderImageBox(imageToShow, showMask ? 'Mask' : 'Result') : renderImageBox('original', 'Original')}
            </div>
        );
    };

    return (
        <div className="container mx-auto p-4">
            <header className="mb-8 rounded-lg bg-card p-8 text-center shadow-sm">
                <h1 className="text-4xl font-bold">Background Removal Tool</h1>
                <p className="mt-2 text-muted-foreground">Upload an image and remove its background instantly</p>
            </header>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-1">
                    <Card className="p-6">
                        <h2 className="mb-4 text-2xl font-semibold">1. Upload</h2>
                        <div
                            ref={uploadAreaRef}
                            onClick={() => fileInputRef.current?.click()}
                            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center transition-colors hover:border-primary hover:bg-primary/5"
                        >
                            <Upload className="mb-2 h-12 w-12 text-muted-foreground" />
                            <p>Drag & drop an image here</p>
                            <p className="mt-1 text-sm text-muted-foreground">or click to browse</p>
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h2 className="mb-4 text-2xl font-semibold">2. Adjust</h2>
                        <div className="mb-4 grid grid-cols-3 gap-2">
                           <Button variant="outline" onClick={() => applyPreset('simple')}>Simple</Button>
                           <Button variant="outline" onClick={() => applyPreset('standard')}>Standard</Button>
                           <Button variant="outline" onClick={() => applyPreset('complex')}>Complex</Button>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <Label htmlFor="threshold" className="flex justify-between"><span>Color Threshold</span> <span>{threshold}</span></Label>
                                <Slider id="threshold" value={[threshold]} onValueChange={([val]) => setThreshold(val)} min={5} max={100} step={5} />
                            </div>
                            <div>
                                <Label htmlFor="smoothing" className="flex justify-between"><span>Smoothing</span> <span>{smoothing}</span></Label>
                                <Slider id="smoothing" value={[smoothing]} onValueChange={([val]) => setSmoothing(val)} min={0} max={10} step={1} />
                            </div>
                             <div>
                                <Label htmlFor="featherRadius" className="flex justify-between"><span>Feather Radius</span> <span>{featherRadius}</span></Label>
                                <Slider id="featherRadius" value={[featherRadius]} onValueChange={([val]) => setFeatherRadius(val)} min={0} max={20} step={1} />
                            </div>
                        </div>
                    </Card>

                     <Card className="p-6">
                        <h2 className="mb-4 text-2xl font-semibold">3. Process</h2>
                         <Button onClick={processImage} disabled={!originalImage || isProcessing} className="w-full text-lg h-12">
                             {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                             Remove Background
                         </Button>
                    </Card>

                    {processedImage && (
                        <Card className="p-6">
                             <h2 className="mb-4 text-2xl font-semibold">4. Download</h2>
                             <div className="space-y-3">
                                <Button onClick={() => downloadImage(processedImage, 'result.png')} className="w-full" variant="secondary"><Download className="mr-2"/>Download Result</Button>
                                <Button onClick={() => downloadImage(maskImage, 'mask.png')} className="w-full" variant="outline"><Download className="mr-2"/>Download Mask</Button>
                                <Button onClick={resetAll} className="w-full" variant="destructive"><Trash2 className="mr-2"/>Reset All</Button>
                            </div>
                            <div className="mt-4 rounded-md bg-secondary p-3 text-sm text-secondary-foreground">
                                Processed in {processingTime.toFixed(0)}ms
                            </div>
                        </Card>
                    )}
                </div>

                <div className="lg:col-span-2">
                    <Card className="p-6">
                        {originalImage && (
                            <div className="mb-4 flex items-center gap-4">
                               <Select value={viewMode} onValueChange={setViewMode}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="side-by-side">Side by Side</SelectItem>
                                        <SelectItem value="single">Single View</SelectItem>
                                    </SelectContent>
                                </Select>
                                {processedImage && (
                                    <Button variant="outline" onClick={() => setShowMask(prev => !prev)}>
                                        {showMask ? <EyeOff className="mr-2"/> : <Eye className="mr-2"/>}
                                        {showMask ? 'Show Result' : 'Show Mask'}
                                    </Button>
                                )}
                            </div>
                        )}
                        
                        <div className="space-y-4">
                            {originalImage ? renderImageView() : renderImageBox('placeholder', 'No image uploaded yet')}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
