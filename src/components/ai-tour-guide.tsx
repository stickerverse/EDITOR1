"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tourSteps } from './tour-steps';
import { generateTourStep } from '@/ai/flows/generate-tour-step-flow';
import { Button } from './ui/button';

interface AITourGuideProps {
    isActive: boolean;
    onComplete: () => void;
}

export function AITourGuide({ isActive, onComplete }: AITourGuideProps) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [position, setPosition] = useState({ top: -9999, left: -9999 });
    const [explanation, setExplanation] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isActive) {
            setCurrentStepIndex(0);
        } else {
            setPosition({ top: -9999, left: -9999 });
        }
    }, [isActive]);
    
    useEffect(() => {
        if (!isActive) return;

        const fetchExplanation = async (feature: string) => {
            setIsLoading(true);
            try {
                const result = await generateTourStep({ featureDescription: feature });
                setExplanation(result.explanation);
            } catch (error) {
                console.error("Failed to generate tour step:", error);
                setExplanation("I had a little trouble explaining this, but it's a cool feature!");
            } finally {
                setIsLoading(false);
            }
        };

        const updatePosition = () => {
            const step = tourSteps[currentStepIndex];
            const targetElement = document.querySelector(step.selector);

            if (targetElement) {
                const rect = targetElement.getBoundingClientRect();
                const menuHeight = menuRef.current?.offsetHeight || 300;
                
                let top = rect.top + window.scrollY;
                let left = rect.left + window.scrollX + rect.width + 10;
                
                if (left + 300 > window.innerWidth) {
                    left = rect.left + window.scrollX - 310;
                }

                if (top + menuHeight > window.innerHeight) {
                    top = window.innerHeight - menuHeight - 20;
                }

                if (top < 0) {
                    top = 20;
                }

                setPosition({ top, left });
                fetchExplanation(step.content);
            }
        };
        
        // Timeout to allow elements to be in place
        const timer = setTimeout(updatePosition, 100);
        
        window.addEventListener('resize', updatePosition);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', updatePosition);
        };

    }, [isActive, currentStepIndex]);

    const goToNextStep = () => {
        if (currentStepIndex < tourSteps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            onComplete();
        }
    };

    const goToPrevStep = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1);
        }
    };
    
    if (!isActive) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={onComplete}></div>
            <div
                ref={menuRef}
                id="menu"
                className={cn("open transition-all duration-500 ease-in-out", !isActive && "opacity-0")}
                style={{ top: `${position.top}px`, left: `${position.left}px` }}
            >
                <span className="shine shine-top"></span>
                <span className="shine shine-bottom"></span>
                <span className="glow glow-top"></span>
                <span className="glow glow-bottom"></span>
                <span className="glow glow-bright glow-top"></span>
                <span className="glow glow-bright glow-bottom"></span>
                <div className="inner">
                    <section>
                        <header className="flex items-center gap-2 text-indigo-400 mb-2">
                           <Bot className="h-5 w-5" /> AI Helper
                        </header>
                        <div className="p-2 min-h-[60px] text-slate-300 text-sm">
                            {isLoading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Thinking...</span>
                                </div>
                            ) : (
                                explanation
                            )}
                        </div>
                    </section>
                    <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-slate-500">
                            {currentStepIndex + 1} / {tourSteps.length}
                        </span>
                        <div className="flex gap-2">
                             <Button
                                size="sm"
                                variant="outline"
                                onClick={goToPrevStep}
                                disabled={currentStepIndex === 0}
                                className="bg-slate-800/50 border-slate-700 h-8"
                            >
                                <ChevronLeft className="h-4 w-4" /> Prev
                            </Button>
                            <Button
                                size="sm"
                                onClick={goToNextStep}
                                className="bg-indigo-500/80 hover:bg-indigo-500 text-white h-8"
                            >
                                {currentStepIndex === tourSteps.length - 1 ? "Done" : "Next"} <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
                 <button
                    onClick={onComplete}
                    className="absolute top-2 right-2 p-1 text-slate-500 hover:text-white transition-colors"
                    aria-label="Close tour"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </>
    );
}
