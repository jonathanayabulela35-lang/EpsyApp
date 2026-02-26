import React from 'react';
import { 
  BookOpen, Beaker, Calculator, Globe, Laptop, Palette, Book, 
  FlaskConical, Triangle, Music, Dna, Atom, Brain, Languages,
  Scale, TrendingUp, Users, Heart, Leaf, Lightbulb
} from 'lucide-react';

const iconMap = {
  physics: FlaskConical,
  chemistry: Beaker,
  biology: Dna,
  math: Calculator,
  mathematics: Calculator,
  geometry: Triangle,
  algebra: Calculator,
  calculus: Calculator,
  geography: Globe,
  history: Book,
  literature: BookOpen,
  english: Languages,
  language: Languages,
  computer: Laptop,
  programming: Laptop,
  coding: Laptop,
  art: Palette,
  music: Music,
  science: Atom,
  psychology: Brain,
  philosophy: Lightbulb,
  law: Scale,
  economics: TrendingUp,
  business: TrendingUp,
  sociology: Users,
  health: Heart,
  environmental: Leaf,
};

export default function SubjectIcon({ subjectName, className = "w-6 h-6" }) {
  const name = subjectName?.toLowerCase() || '';
  
  // Find matching icon based on subject name
  for (const [key, Icon] of Object.entries(iconMap)) {
    if (name.includes(key)) {
      return <Icon className={className} />;
    }
  }
  
  // Default icon
  return <BookOpen className={className} />;
}