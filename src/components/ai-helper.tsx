"use client";

import React, { useState, useEffect } from 'react';
import { Bot, Loader2 } from 'lucide-react';
import { generateHelp } from '@/ai/flows/generate-help-flow';

export function AIHelper() {
    const [helpText, setHelpText] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchHelp = async () => {
            try {
                setIsLoading(true);
                const result = await generateHelp();
                // Basic markdown to HTML conversion
                const formattedText = result.helpText
                    .replace(/### (.*)/g, '<h3 class="text-lg font-semibold text-indigo-400 mt-4 mb-2">$1</h3>')
                    .replace(/## (.*)/g, '<h2 class="text-xl font-bold text-purple-400 mt-6 mb-3">$1</h2>')
                    .replace(/# (.*)/g, '<h1 class="text-2xl font-bold text-white mb-4">$1</h1>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
                    .replace(/\* (.*)/g, '<li class="ml-5 list-disc">$1</li>')
                    .replace(/(\r\n|\n|\r)/gm, '<br>');

                setHelpText(formattedText);
            } catch (error) {
                console.error("Failed to fetch help:", error);
                setHelpText("<p>Oops! I had a little trouble fetching the guide. Please try again in a moment!</p>");
            } finally {
                setIsLoading(false);
            }
        };

        fetchHelp();
    }, []);

    return (
        <div className="flex flex-col items-center justify-center text-left max-w-full">
            <div className="flex items-center gap-3 mb-4">
                <Bot className="h-10 w-10 text-indigo-400" />
                <h2 className="text-2xl font-bold text-white">Stickerific AI Helper</h2>
            </div>

            <div className="w-full p-4 bg-slate-900/50 rounded-lg max-h-[60vh] overflow-y-auto">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center">
                        <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
                        <p className="mt-4 text-slate-300">Your friendly AI helper is thinking...</p>
                    </div>
                ) : (
                    <div 
                        className="prose prose-invert prose-sm text-slate-300"
                        dangerouslySetInnerHTML={{ __html: helpText }}
                    />
                )}
            </div>
        </div>
    );
}
