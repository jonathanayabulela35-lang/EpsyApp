import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function UpgradePrompt({ open, onOpenChange, feature, remaining, limit }) {
  const features = {
    chat_material_uploads: {
      title: 'Chat Material Upload Limit Reached',
      description: 'You\'ve uploaded 3 materials today in chat sessions.',
      reset: 'Resets tomorrow'
    },
    module_material_uploads: {
      title: 'Module Material Upload Limit Reached',
      description: 'You\'ve uploaded 5 materials this week in your modules.',
      reset: 'Resets next week'
    },
    examples_analogies: {
      title: 'Examples & Analogies Limit Reached',
      description: 'You\'ve generated 5 examples or analogies today.',
      reset: 'Resets tomorrow'
    },
    activities: {
      title: 'Activity Generation Limit Reached',
      description: 'You\'ve generated 5 activities this week.',
      reset: 'Resets next week'
    }
  };

  const info = features[feature] || features.chat_material_uploads;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--theme-primary-light, rgba(229, 228, 226, 0.3))' }}>
            <Sparkles className="w-8 h-8" style={{ color: 'var(--theme-primary)' }} />
          </div>
          <DialogTitle className="text-center text-xl">{info.title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <p className="text-center text-stone-600">{info.description}</p>
          <p className="text-center text-sm text-stone-500">{info.reset}</p>

          <div className="bg-stone-50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <Zap className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
              <h3 className="font-semibold text-stone-800">Upgrade to Pro</h3>
            </div>
            <ul className="space-y-2 text-sm text-stone-700">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--theme-primary)' }}></span>
                Unlimited uploads
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--theme-primary)' }}></span>
                Unlimited AI features
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--theme-primary)' }}></span>
                Priority support
              </li>
            </ul>
          </div>

          <Button
            onClick={() => window.location.href = createPageUrl('ProCheckout')}
            className="w-full text-white font-semibold py-6"
            style={{ backgroundColor: 'var(--theme-primary)' }}
          >
            Upgrade to Pro - $9.99/month
          </Button>

          <Button
            onClick={() => onOpenChange(false)}
            variant="ghost"
            className="w-full"
          >
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}