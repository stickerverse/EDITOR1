
"use client";

import React from 'react';
import { StarsBackground } from '@/components/ui/stars';
import { motion } from 'framer-motion';
import NextImage from 'next/image';
import { cn } from '@/lib/utils';
import '../styles/holographic-effect.css';
import { Button } from './ui/button';
import { X } from 'lucide-react';

interface StickerPreviewProps {
  imageUrl: string;
  material: string;
  onClose: () => void;
}

export function StickerPreview({ imageUrl, material, onClose }: StickerPreviewProps) {

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <StarsBackground className="w-full h-full">
        <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="absolute top-4 right-4 z-50 text-white bg-white/10 hover:bg-white/20"
            aria-label="Close preview"
        >
            <X className="h-6 w-6" />
        </Button>
        <div className="perspective-container flex items-center justify-center w-full h-full">
          <motion.div
            initial={{ scale: 0.5, y: 100 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="item-3d"
          >
            <div className="item-img">
              <div className={cn(
                "relative w-[300px] h-[300px] transition-all duration-300",
                material === 'holographic' && 'holographic-effect'
              )}>
                <NextImage
                  src={imageUrl}
                  alt="Sticker Preview"
                  fill
                  sizes="300px"
                  className="object-contain"
                />
              </div>
              <div className="ground"></div>
            </div>
          </motion.div>
        </div>
      </StarsBackground>
    </motion.div>
  );
}
