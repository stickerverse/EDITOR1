import React, { useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StickerContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onDelete: () => void;
}

export function StickerContextMenu({ isOpen, position, onClose, onDelete }: StickerContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close only if the click is outside the menu itself
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
  
  // This useEffect handles the checkbox state for animation
  useEffect(() => {
    const input = menuRef.current?.querySelector('#toggle') as HTMLInputElement | null;
    if (input) {
      input.checked = isOpen;
    }
  }, [isOpen]);

  return (
    <div
      ref={menuRef}
      className={cn(
        "menu-tooltip",
        !isOpen && "closed", // Used for closing animation
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)',
        zIndex: 50,
        // Hide when not open to prevent interaction issues
        visibility: isOpen ? 'visible' : 'hidden', 
      }}
      // Prevent the canvas from capturing this click
      onMouseDown={(e) => e.stopPropagation()} 
    >
      <input type="checkbox" id="toggle" readOnly />
      <label htmlFor="toggle" className="toggle" onClick={(e) => {
        // Allow the central button to also close the menu
        e.stopPropagation();
        onClose();
      }}>
        <Trash2 className="text-red-500 m-auto" />
      </label>
      
      {/* Delete Button */}
      <li style={{ '--i': 2 } as React.CSSProperties} className="circle-box">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
            // No need to call onClose here, as the parent will handle it
          }}
          className="anchor"
          title="Delete"
        >
          <Trash2 className="text-white" />
        </button>
      </li>

      {/* These are hidden but required for the circle layout */}
      <li style={{ '--i': 0 } as React.CSSProperties} className="circle-box"><a href="#" className="anchor"></a></li>
      <li style={{ '--i': 1 } as React.CSSProperties} className="circle-box"><a href="#" className="anchor"></a></li>
      <li style={{ '--i': 3 } as React.CSSProperties} className="circle-box"><a href="#" className="anchor"></a></li>
      <li style={{ '--i': 4 } as React.CSSProperties} className="circle-box"><a href="#" className="anchor"></a></li>
      <li style={{ '--i': 5 } as React.CSSProperties} className="circle-box"><a href="#" className="anchor"></a></li>
      <li style={{ '--i': 6 } as React.CSSProperties} className="circle-box"><a href="#" className="anchor"></a></li>
      <li style={{ '--i': 7 } as React.CSSProperties} className="circle-box"><a href="#" className="anchor"></a></li>
    </div>
  );
}
