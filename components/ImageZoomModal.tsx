
import React, { useState, useRef, useEffect } from 'react';
import { XIcon, DocumentTextIcon } from './icons.tsx';

interface ImageZoomModalProps {
    imageUrl: string;
    onClose: () => void;
}

const ImageZoomModal: React.FC<ImageZoomModalProps> = ({ imageUrl, onClose }) => {
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const lastMousePosition = useRef({ x: 0, y: 0 });
    const imageRef = useRef<HTMLImageElement>(null);

    const isPdf = imageUrl.includes('application/pdf') || imageUrl.endsWith('.pdf');

    const handleWheel = (e: React.WheelEvent) => {
        if (isPdf) return;
        e.preventDefault();
        const delta = e.deltaY * -0.001;
        const newScale = Math.min(Math.max(0.5, scale + delta), 5); // Clamp zoom level
        setScale(newScale);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isPdf) return;
        isDragging.current = true;
        lastMousePosition.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging.current) return;
        const dx = e.clientX - lastMousePosition.current.x;
        const dy = e.clientY - lastMousePosition.current.y;
        setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        lastMousePosition.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
        isDragging.current = false;
    };
    
    const handleReset = () => {
        setScale(1);
        setOffset({ x: 0, y: 0 });
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={onClose}
        >
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/30 p-2 rounded-lg z-50">
                 {!isPdf && (
                    <>
                     <button onClick={(e) => { e.stopPropagation(); setScale(s => Math.min(s * 1.2, 5)); }} className="text-white p-2 hover:bg-white/20 rounded-md">Zoom In</button>
                     <button onClick={(e) => { e.stopPropagation(); setScale(s => Math.max(s / 1.2, 0.5)); }} className="text-white p-2 hover:bg-white/20 rounded-md">Zoom Out</button>
                     <button onClick={(e) => { e.stopPropagation(); handleReset(); }} className="text-white p-2 hover:bg-white/20 rounded-md">Reset</button>
                    </>
                 )}
                 <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-white p-2 hover:bg-white/20 rounded-md"><XIcon className="h-6 w-6" /></button>
            </div>
            
            <div 
                className="relative overflow-hidden w-full h-full flex items-center justify-center"
                 onClick={(e) => e.stopPropagation()}
                 onWheel={handleWheel}
            >
                {isPdf ? (
                    <div className="w-full h-full max-w-5xl max-h-[90vh] bg-white rounded-lg shadow-2xl overflow-hidden">
                        <iframe 
                            src={imageUrl} 
                            className="w-full h-full" 
                            title="Document Preview"
                        />
                    </div>
                ) : (
                    <img
                        ref={imageRef}
                        src={imageUrl}
                        alt="Zoomed Proof"
                        className="max-w-full max-h-full transition-transform duration-100 ease-out"
                        style={{
                            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                            cursor: isDragging.current ? 'grabbing' : 'grab',
                        }}
                        onMouseDown={handleMouseDown}
                    />
                )}
            </div>
        </div>
    );
};

export default ImageZoomModal;
