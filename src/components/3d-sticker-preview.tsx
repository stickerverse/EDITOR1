"use client";

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NextImage from 'next/image';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import '../styles/holographic-effect.css';


interface StickerPreviewProps {
  imageUrl: string;
  material: string;
  onClose?: () => void;
}

export function StickerPreview({ imageUrl, material, onClose }: StickerPreviewProps) {
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [rotation, setRotation] = useState({ x: -10, y: 20 });
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const item3dRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
  
  const handleInteractionStart = (clientX: number, clientY: number) => {
    setIsMouseDown(true);
    setLastMousePos({ x: clientX, y: clientY });
    if(item3dRef.current) {
        item3dRef.current.classList.add('rotating');
        isDraggingRef.current = true;
    }
  };

  const handleInteractionMove = (clientX: number, clientY: number) => {
    if (!isDraggingRef.current) return;
    
    const deltaX = clientX - lastMousePos.x;
    const deltaY = clientY - lastMousePos.y;

    setRotation(prev => ({
      x: Math.max(-45, Math.min(45, prev.x - deltaY * 0.5)),
      y: prev.y + deltaX * 0.5
    }));

    setLastMousePos({ x: clientX, y: clientY });
  };
  
  const handleInteractionEnd = () => {
    setIsMouseDown(false);
    isDraggingRef.current = false;
    if(item3dRef.current) {
      item3dRef.current.classList.remove('rotating');
    }
  };

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => handleInteractionStart(e.clientX, e.clientY);
  const handleMouseMove = (e: React.MouseEvent) => handleInteractionMove(e.clientX, e.clientY);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
      const touch = e.touches[0];
      handleInteractionStart(touch.clientX, touch.clientY);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleInteractionMove(touch.clientX, touch.clientY);
  };


  useEffect(() => {
    const currentIsMouseDown = isMouseDown;

    const moveHandler = (e: MouseEvent | TouchEvent) => {
        if (e instanceof MouseEvent) {
            handleInteractionMove(e.clientX, e.clientY);
        } else if (e.touches[0]) {
            handleInteractionMove(e.touches[0].clientX, e.touches[0].clientY);
        }
    };
    
    const endHandler = () => handleInteractionEnd();

    if (currentIsMouseDown) {
      window.addEventListener('mousemove', moveHandler);
      window.addEventListener('mouseup', endHandler);
      window.addEventListener('touchmove', moveHandler, { passive: false });
      window.addEventListener('touchend', endHandler);
    }

    return () => {
      window.removeEventListener('mousemove', moveHandler);
      window.removeEventListener('mouseup', endHandler);
      window.removeEventListener('touchmove', moveHandler);
      window.removeEventListener('touchend', endHandler);
    };
  }, [isMouseDown, lastMousePos]);


  const getMaterialLabel = () => {
    switch (material) {
      case 'holographic': return 'Holographic';
      case 'matte': return 'Matte';
      case 'transparent': return 'Transparent';
      default: return 'Vinyl';
    }
  };

  const getMaterialClasses = () => {
    switch (material) {
        case 'holographic': return 'holographic-effect';
        case 'matte': return 'material-matte';
        case 'transparent': return 'material-transparent';
        default: return 'material-vinyl';
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm sticker-preview-container"
        onClick={onClose}
      >
        <div className="stars-background" />

        {onClose && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            onClick={onClose}
            className="close-button"
            aria-label="Close preview"
          >
            <X className="w-6 h-6 text-white" />
          </motion.button>
        )}

        <div 
          className="perspective-container"
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div
            ref={item3dRef}
            initial={{ scale: 0.5, y: 100 }}
            animate={{ 
              scale: 1, 
              y: 0,
            }}
            style={{
                '--rotate-x': `${rotation.x}deg`,
                '--rotate-y': `${rotation.y}deg`,
            } as React.CSSProperties}
            transition={{ 
              type: 'spring', 
              stiffness: 260, 
              damping: 20
            }}
            className="item-3d"
          >
            <div
              className={cn("item-img", getMaterialClasses())}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              <div
                className="sticker-wrapper"
              >
                <NextImage
                    src={imageUrl}
                    alt="Sticker Preview"
                    fill
                    sizes="300px"
                    className="sticker-img"
                    priority
                  />
              </div>
              <div className="ground"/>
            </div>
          </motion.div>

        </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="material-label"
          >
            {getMaterialLabel()}
          </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
