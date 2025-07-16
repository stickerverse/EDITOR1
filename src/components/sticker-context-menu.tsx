import React, { useEffect, useRef } from 'react';
import { Trash2, Copy, ChevronsUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StickerContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onBringToFront: () => void;
}

export function StickerContextMenu({ 
  isOpen, 
  position, 
  onClose, 
  onDelete,
  onDuplicate,
  onBringToFront
}: StickerContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);
  
  const handleAction = (action: () => void) => {
    action();
    onClose();
  }

  return (
    <aside 
      id="menu" 
      ref={menuRef}
      className={cn(isOpen && "open")}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onMouseDown={(e) => e.stopPropagation()} 
    >
      <span className="shine shine-top"></span>
      <span className="shine shine-bottom"></span>
      <span className="glow glow-top"></span>
      <span className="glow glow-bottom"></span>
      <span className="glow glow-bright glow-top"></span>
      <span className="glow glow-bright glow-bottom"></span>
      
      <div className="inner">
          <section>
              <header>Actions</header>
              <ul>
                  <li onClick={() => handleAction(onDuplicate)}>
                    <Copy /> Duplicate
                  </li>
                  <li onClick={() => handleAction(onBringToFront)}>
                    <ChevronsUp /> Bring to Front
                  </li>
                  <li onClick={() => handleAction(onDelete)}>
                    <Trash2 /> Delete
                  </li>
              </ul>
          </section>
      </div>
    </aside>
  );
}
