
"use client";

import React from 'react';

interface StickerCustomizerProps {
    productType: string;
}

export function StickerCustomizer({ productType }: StickerCustomizerProps) {
  return (
    <div className="container mx-auto px-0 py-0 md:py-4">
        <div className="text-white text-center p-8 bg-slate-800 rounded-lg">
            <h1 className="text-3xl font-bold">Sticker Customizer for: {productType}</h1>
            <p className="mt-4">This component is temporarily simplified to resolve a startup issue.</p>
            <p>We will restore its functionality shortly.</p>
        </div>
    </div>
  );
}
