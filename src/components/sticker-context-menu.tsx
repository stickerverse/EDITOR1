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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Open the menu by checking the checkbox
      inputRef.current.checked = true;
    }

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

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="menu-tooltip"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)',
        zIndex: 50,
      }}
    >
      <input type="checkbox" id="toggle" ref={inputRef} />
      <label htmlFor="toggle" className="toggle" onClick={(e) => e.stopPropagation()}>
        <Trash2 className="text-red-500 m-auto" />
      </label>
      
      {/* Delete Button */}
      <li style={{ '--i': 2 } as React.CSSProperties} className="circle-box">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
            onClose();
          }}
          className="anchor"
          title="Delete"
        >
          <Trash2 className="text-white" />
        </button>
      </li>

      {/* These are hidden but required for the circle layout */}
      <li style={{ '--i': 0 } as React.CSSProperties} className="circle-box">
        <a href="#" className="anchor"></a>
      </li>
      <li style={{ '--i': 1 } as React.CSSProperties} className="circle-box">
        <a href="#" className="anchor"></a>
      </li>
      <li style={{ '--i': 3 } as React.CSSProperties} className="circle-box">
        <a href="#" className="anchor"></a>
      </li>
      <li style={{ '--i': 4 } as React.CSSProperties} className="circle-box">
        <a href="#" className="anchor"></a>
      </li>
      <li style={{ '--i': 5 } as React.CSSProperties} className="circle-box">
        <a href="#" className="anchor"></a>
      </li>
      <li style={{ '--i': 6 } as React.CSSProperties} className="circle-box">
        <a href="#" className="anchor"></a>
      </li>
      <li style={{ '--i': 7 } as React.CSSProperties} className="circle-box">
        <a href="#" className="anchor"></a>
      </li>
    </div>
  );
}
