import { useEffect, useState, useRef } from 'react';

type ResizeDirection = 
  | 'top' | 'bottom' | 'left' | 'right' 
  | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface UseWindowResizeReturn {
  handleResizeStart: (direction: ResizeDirection) => (e: React.MouseEvent) => void;
}

export const useWindowResize = (): UseWindowResizeReturn => {
  const [isResizing, setIsResizing] = useState(false);
  const resizeDirection = useRef<ResizeDirection | null>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const startSize = useRef({ width: 0, height: 0 });

  const handleResizeStart = (direction: ResizeDirection) => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeDirection.current = direction;
    startPos.current = { x: e.screenX, y: e.screenY };
    
    // Get current window size (we'll estimate from the container)
    const container = document.querySelector('[data-window-container]') as HTMLElement;
    if (container) {
      startSize.current = {
        width: container.offsetWidth,
        height: container.offsetHeight
      };
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing || !resizeDirection.current) return;

    const deltaX = e.screenX - startPos.current.x;
    const deltaY = e.screenY - startPos.current.y;
    const direction = resizeDirection.current;

    let newWidth = startSize.current.width;
    let newHeight = startSize.current.height;

    // Calculate new dimensions based on resize direction
    if (direction.includes('right')) {
      newWidth = Math.max(400, startSize.current.width + deltaX);
    } else if (direction.includes('left')) {
      newWidth = Math.max(400, startSize.current.width - deltaX);
    }

    if (direction.includes('bottom')) {
      newHeight = Math.max(300, startSize.current.height + deltaY);
    } else if (direction.includes('top')) {
      newHeight = Math.max(300, startSize.current.height - deltaY);
    }

    // Apply max constraints
    newWidth = Math.min(1200, newWidth);
    newHeight = Math.min(800, newHeight);

    // Send resize command to main process
    if (window.api && window.api.resizeWindow) {
      window.api.resizeWindow(newHeight);
      // Also need to resize width - let's add this to the API
      if (window.api.setWindowSize) {
        window.api.setWindowSize(newWidth, newHeight);
      }
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
    resizeDirection.current = null;
  };

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return { handleResizeStart };
}; 