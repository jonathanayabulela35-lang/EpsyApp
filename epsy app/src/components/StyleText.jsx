import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from './api/base44Client';

const styleTexts = {
  professional: {
    greeting: 'Good day',
    shallWe: 'shall we begin?',
    addMaterials: 'Add Your Study Materials',
    uploadPrompt: 'Upload PDFs, images of textbooks, or paste your notes to begin',
    noConversations: 'No conversations yet',
    readyToLearn: 'Ready to Learn',
    uploadMaterials: 'Upload study materials to begin your session',
  },
  casual: {
    greeting: 'Hey',
    shallWe: "let's do this!",
    addMaterials: 'Drop Your Study Stuff',
    uploadPrompt: 'Toss in some PDFs, pics of your textbooks, or whatever notes you got',
    noConversations: 'Nothing here yet',
    readyToLearn: "Let's Get Started",
    uploadMaterials: 'Add your study materials and we can get rolling',
  },
  friendly: {
    greeting: 'Hi there',
    shallWe: 'ready to learn?',
    addMaterials: 'Add Your Materials',
    uploadPrompt: 'Upload your study materials - PDFs, images, or notes!',
    noConversations: 'No conversations yet',
    readyToLearn: 'Ready to Learn Together',
    uploadMaterials: "Upload your materials and let's start learning!",
  },
  supportive: {
    greeting: 'Hello',
    shallWe: "we can start whenever you're ready",
    addMaterials: 'Add Your Study Materials',
    uploadPrompt: "Take your time - upload PDFs, images, or notes when you're ready",
    noConversations: 'No conversations yet',
    readyToLearn: 'Here to Support You',
    uploadMaterials: "Add your materials when you're comfortable, and we'll begin",
  },
  calm: {
    greeting: 'Hello',
    shallWe: 'shall we?',
    addMaterials: 'Add Your Study Materials',
    uploadPrompt: 'Upload PDFs, images of textbooks, or paste your notes to get started',
    noConversations: 'No conversations yet',
    readyToLearn: 'Ready to Learn',
    uploadMaterials: 'Upload your study materials to begin',
  },
};

export function useStyleText() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const style = user?.ai_style || 'calm';
  return styleTexts[style] || styleTexts.calm;
}

export default function StyleText({ textKey }) {
  const texts = useStyleText();
  return <>{texts[textKey] || textKey}</>;
}