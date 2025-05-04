// components/Modal.js
import { useEffect, useRef } from 'react';
import { FiX } from 'react-icons/fi';

export default function Modal({ isOpen, onClose, title, children, type = 'info' }) {
  const modalRef = useRef();
  
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  // Determine background color based on type
  const getBgColor = () => {
    switch(type) {
      case 'success': return 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800';
      case 'error': return 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800';
      case 'warning': return 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800';
      default: return 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800';
    }
  };
  
  // Stop event propagation to prevent flickering
  const handleOverlayClick = () => {
    onClose();
  };
  
  const handleModalClick = (e) => {
    e.stopPropagation();
  };
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/50 will-change-auto"
      onClick={handleOverlayClick}
      style={{
        backfaceVisibility: "hidden",
        transform: "translateZ(0)",
        WebkitFontSmoothing: "subpixel-antialiased"
      }}
    >
      <div 
        ref={modalRef}
        className={`w-full max-w-md rounded-xl shadow-xl border ${getBgColor()} p-6 bg-white dark:bg-gray-800`}
        onClick={handleModalClick}
        style={{
          backfaceVisibility: "hidden",
          transform: "translateZ(0)",
          WebkitFontSmoothing: "subpixel-antialiased"
        }}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{title}</h3>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <FiX className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <div className="text-gray-700 dark:text-gray-200">
          {children}
        </div>
      </div>
    </div>
  );
}