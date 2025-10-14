import React, { useRef, useEffect, useState } from 'react';
// Fix: Added .ts extension to file path
import { Proof } from '../types.ts';
import { XIcon, CheckIcon } from './icons';

interface AnnotationEditorProps {
  proof: Proof;
  onSave: (newDataUrl: string) => void;
  onCancel: () => void;
}

const AnnotationEditor: React.FC<AnnotationEditorProps> = ({ proof, onSave, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPos = useRef<{ x: number, y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = proof.dataUrl;
    img.onload = () => {
      // Scale canvas to image, fitting within the viewport
      const maxWidth = window.innerWidth * 0.9;
      const maxHeight = (window.innerHeight - 150); // Leave space for buttons
      let { width, height } = img;
      
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width *= ratio;
      height *= ratio;

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
    };
  }, [proof.dataUrl]);

  const getEventPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getEventPos(e);
    if (pos) {
      setIsDrawing(true);
      lastPos.current = pos;
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const pos = getEventPos(e);
    if (!ctx || !pos || !lastPos.current) return;

    ctx.strokeStyle = '#DC3545'; // Red color from theme
    ctx.lineWidth = Math.max(3, canvas.width / 200); // Scale line width
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    
    lastPos.current = pos;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPos.current = null;
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const newDataUrl = canvas.toDataURL(proof.mimeType);
      onSave(newDataUrl);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex flex-col items-center justify-center p-4">
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className="max-w-full max-h-full rounded-lg shadow-2xl cursor-crosshair"
      />
      <div className="absolute bottom-6 flex space-x-4">
         <button onClick={onCancel} className="flex items-center space-x-2 px-6 py-3 text-sm font-semibold bg-white text-dark border border-slate-300 rounded-md shadow-lg hover:bg-slate-50 transition">
             <XIcon className="h-5 w-5"/>
             <span>Cancel</span>
         </button>
         <button onClick={handleSave} className="flex items-center space-x-2 px-6 py-3 text-sm font-semibold bg-primary text-white rounded-md shadow-lg hover:bg-primary-dark transition">
             <CheckIcon className="h-5 w-5"/>
             <span>Save Annotation</span>
         </button>
      </div>
    </div>
  );
};

export default AnnotationEditor;