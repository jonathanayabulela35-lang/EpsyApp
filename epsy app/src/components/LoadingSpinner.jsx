import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 
        className="w-8 h-8 animate-spin mb-3" 
        style={{ color: 'var(--theme-primary)' }}
      />
      <p className="text-sm text-stone-500">{text}</p>
    </div>
  );
}