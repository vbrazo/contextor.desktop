import { useState, useRef, useEffect } from 'react';

interface Position {
  x: number;
  y: number;
}

interface UseDragAndDropReturn {
  position: Position;
  isDragging: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
}

export const useDragAndDrop = (initialPosition: Position = { x: 0, y: 0 }): UseDragAndDropReturn => {
  const [position, setPosition] = useState<Position>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const windowStartPos = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const pendingMove = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX,
      y: e.clientY
    };
    // Store current window position (we'll get this from screen coordinates)
    windowStartPos.current = {
      x: e.screenX - e.clientX,
      y: e.screenY - e.clientY
    };
  };

  const performWindowMove = () => {
    if (pendingMove.current && window.api && window.api.moveWindow) {
      window.api.moveWindow(pendingMove.current.x, pendingMove.current.y);
      setPosition(pendingMove.current);
      pendingMove.current = null;
    }
    animationFrameRef.current = null;
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      // Calculate the new window position based on screen coordinates
      const newX = windowStartPos.current.x + (e.clientX - dragStartPos.current.x);
      const newY = windowStartPos.current.y + (e.clientY - dragStartPos.current.y);
      
      // Store the pending move
      pendingMove.current = { x: newX, y: newY };
      
      // Use requestAnimationFrame to throttle the window moves
      if (animationFrameRef.current === null) {
        animationFrameRef.current = requestAnimationFrame(performWindowMove);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // Clear any pending animation frame
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    // Perform final move if there's a pending one
    if (pendingMove.current) {
      performWindowMove();
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      // Clean up animation frame on unmount
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isDragging]);

  return {
    position,
    isDragging,
    handleMouseDown,
  };
};
