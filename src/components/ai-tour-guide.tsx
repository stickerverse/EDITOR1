"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Loader2 } from 'lucide-react';
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
    const tourTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isActive) {
            setCurrentStepIndex(0);
        } else {
            setPosition({ top: -9999, left: -9999 });
            if (tourTimeoutRef.current) {
                clearTimeout(tourTimeoutRef.current);
            }
        }
        return () => {
             if (tourTimeoutRef.current) {
                clearTimeout(tourTimeoutRef.current);
            }
        }
    }, [isActive]);

    const goToNextStep = () => {
        if (currentStepIndex < tourSteps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            onComplete();
        }
    };
    
    useEffect(() => {
        if (!isActive) return;

        const fetchExplanation = async (feature: string) => {
            setIsLoading(true);
            setExplanation('');
             if (tourTimeoutRef.current) {
                clearTimeout(tourTimeoutRef.current);
            }
            try {
                const result = await generateTourStep({ featureDescription: feature });
                setExplanation(result.explanation);
            } catch (error) {
                console.error("Failed to generate tour step:", error);
                setExplanation("I had a little trouble explaining this, but it's a cool feature! ✨");
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
                
                if (left + 300 > window.innerWidth) { // If menu overflows right
                    left = rect.left + window.scrollX - 310;
                }
                 if (left < 10) { // If menu overflows left
                    left = 10;
                }

                if (top + menuHeight > window.innerHeight) {
                    top = window.innerHeight - menuHeight - 20;
                }

                if (top < 0) {
                    top = 20;
                }

                setPosition({ top, left });
                fetchExplanation(step.content);
            } else {
                // If element not found, skip to next step after a short delay
                tourTimeoutRef.current = setTimeout(goToNextStep, 500);
            }
        };
        
        const timer = setTimeout(updatePosition, 100);
        
        window.addEventListener('resize', updatePosition);
        return () => {
            clearTimeout(timer);
             if (tourTimeoutRef.current) {
                clearTimeout(tourTimeoutRef.current);
            }
            window.removeEventListener('resize', updatePosition);
        };

    }, [isActive, currentStepIndex]);
    
    // Effect to automatically proceed to the next step
    useEffect(() => {
        if (isActive && !isLoading && explanation) {
            tourTimeoutRef.current = setTimeout(goToNextStep, 5000); // 5 seconds delay
        }
        return () => {
            if (tourTimeoutRef.current) {
                clearTimeout(tourTimeoutRef.current);
            }
        };
    }, [isActive, isLoading, explanation, currentStepIndex]);

    if (!isActive) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={onComplete}></div>
            <div
                ref={menuRef}
                id="menu"
                className={cn("open transition-all duration-500 ease-in-out", !isActive && "opacity-0")}
                style={{ top: `${position.top}px`, left: `${position.left}px`, minWidth: '300px' }}
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
                           <Bot className="h-5 w-5" /> AI Tour Guide
                        </header>
                        <div className="p-2 min-h-[80px] text-slate-300 text-sm flex items-center justify-center">
                            {isLoading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Thinking...</span>
                                </div>
                            ) : (
                                <p className="leading-relaxed">{explanation}</p>
                            )}
                        </div>
                    </section>
                     <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-slate-500">
                            Step {currentStepIndex + 1} of {tourSteps.length}
                        </span>
                         <Button
                            size="sm"
                            onClick={onComplete}
                            className="bg-slate-800/50 border-slate-700 h-8"
                        >
                            {currentStepIndex === tourSteps.length - 1 ? "Finish" : "Skip Tour"}
                        </Button>
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
