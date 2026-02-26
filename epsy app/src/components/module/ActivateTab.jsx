import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Plus, Brain, ArrowLeft, CheckCircle2, XCircle, BookOpen, MessageSquare, Globe, Target, ArrowRight, Loader2 } from 'lucide-react';
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import UpgradePrompt from '@/components/UpgradePrompt';

export default function ActivitiesTab({ moduleName }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedSources, setSelectedSources] = useState({ material: false, conversation: false, web: false });
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [selectedConversations, setSelectedConversations] = useState([]);
  const [questionCountInput, setQuestionCountInput] = useState('5');
  const [difficulty, setDifficulty] = useState('Average');
  const [activityType, setActivityType] = useState('multiple-choice');
  const [currentActivity, setCurrentActivity] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [savedActivityDifficulty, setSavedActivityDifficulty] = useState(null);
  const [weakAreas, setWeakAreas] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAddingQuestions, setIsAddingQuestions] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [viewingActivity, setViewingActivity] = useState(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [limitFeature, setLimitFeature] = useState('');

  const { data: allMaterials = [] } = useQuery({
    queryKey: ['materials', moduleName],
    queryFn: () => base44.entities.Material.filter({ module_name: moduleName }),
    staleTime: 30000,
    placeholderData: (previousData) => previousData,
  });

  const { data: allConversations = [] } = useQuery({
    queryKey: ['sessions', moduleName],
    queryFn: () => base44.entities.StudySession.filter({ status: 'active', subject: moduleName }),
    staleTime: 30000,
    placeholderData: (previousData) => previousData,
  });

  const { data: completedActivities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ['completedActivities', moduleName],
    queryFn: () => base44.entities.CompletedActivity.filter({ module_name: moduleName }),
    staleTime: 30000,
    placeholderData: (previousData) => previousData,
  });

  const handleStartGeneration = () => {
    setStep(1);
    setSelectedSources({ material: false, conversation: false, web: false });
    setSelectedMaterials([]);
    setSelectedConversations([]);
    setQuestionCountInput('5');
    setDifficulty('Average');
    setActivityType('multiple-choice');
    queryClient.invalidateQueries({ queryKey: ['materials', moduleName] });
    queryClient.invalidateQueries({ queryKey: ['sessions', moduleName] });
    setGenerateDialogOpen(true);
  };

  const handleSourceToggle = (source) => {
    setSelectedSources(prev => {
      const newState = { ...prev, [source]: !prev[source] };
      if (source === 'web' && !prev[source]) {
        if (!newState.material && !newState.conversation) {
          return prev;
        }
      }
      if ((source === 'material' || source === 'conversation') && prev[source]) {
        if (newState.web && !newState.material && !newState.conversation) {
          newState.web = false;
        }
      }
      return newState;
    });
  };

  const handleMaterialToggle = (materialId) => {
    setSelectedMaterials(prev => 
      prev.includes(materialId) 
        ? prev.filter(id => id !== materialId)
        : [...prev, materialId]
    );
  };

  const handleConversationToggle = (conversationId) => {
    setSelectedConversations(prev => 
      prev.includes(conversationId) 
        ? prev.filter(id => id !== conversationId)
        : [...prev, conversationId]
    );
  };

  const canProceedToNextStep = () => {
    if (step === 1) {
      const hasNonWebSource = selectedSources.material || selectedSources.conversation;
      return hasNonWebSource || (!selectedSources.web && Object.values(selectedSources).some(v => v));
    }
    if (step === 2) {
      if (selectedSources.material && selectedMaterials.length === 0) return false;
      if (selectedSources.conversation && selectedConversations.length === 0) return false;
      return true;
    }
    if (step === 3) {
      const count = parseInt(questionCountInput);
      return count >= 5 && count <= 50;
    }
    if (step === 4) {
      return difficulty !== '';
    }
    return false;
  };

  const getNextStep = () => {
    if (step === 1) {
      if (selectedSources.material || selectedSources.conversation) return 2;
      return 3;
    }
    return step + 1;
  };

  const handleGenerateQuestions = async () => {
    // Check usage limit first
    try {
      const limitCheck = await base44.functions.invoke('checkUsageLimit', {
        feature: 'activities'
      });

      if (!limitCheck.data.allowed) {
        setGenerateDialogOpen(false);
        setLimitFeature('activities');
        setShowUpgradePrompt(true);
        return;
      }

      setGenerateDialogOpen(false);
      setIsGenerating(true);
      setGenerationError(null);
      setSavedActivityDifficulty(difficulty);
    
      const questionCount = parseInt(questionCountInput);
      let contentSources = [];
    
      if (selectedSources.material && selectedMaterials.length > 0) {
        for (const materialId of selectedMaterials) {
          const material = allMaterials.find(m => m.id === materialId);
          if (material?.extracted_content) {
            contentSources.push({ type: 'material', content: material.extracted_content });
          }
        }
      }
      
      if (selectedSources.conversation && selectedConversations.length > 0) {
        for (const convId of selectedConversations) {
          const conversation = allConversations.find(c => c.id === convId);
          if (conversation?.conversation) {
            const content = conversation.conversation.map(m => `${m.role}: ${m.content}`).join('\n\n');
            contentSources.push({ type: 'conversation', content });
          }
        }
      }
      
      const allContent = contentSources.map(s => s.content).join('\n\n---\n\n');
      
      const difficultyInstructions = {
        'Decent': 'Questions should be straightforward, testing basic understanding and recall. Use clear, simple language.',
        'Average': 'Questions should be moderately challenging, requiring application and reasoning. Test understanding beyond memorization.',
        'Trying': 'Questions should be difficult, testing deeper understanding, connections, or multi-step reasoning. Challenge students to think critically.'
      };

      const isDescriptive = activityType === 'descriptive';
      const prompt = `You are Wisa, an expert exam creator. Based on the following study materials, generate exactly ${questionCount} ${isDescriptive ? 'descriptive answer' : 'multiple-choice'} questions in an exam-style format.

DIFFICULTY LEVEL: ${difficulty}
${difficultyInstructions[difficulty]}

${selectedSources.web ? 'You may also use additional information from the web to enhance questions where appropriate.' : ''}

MATERIALS:
${allContent}

INSTRUCTIONS:
1. Generate EXACTLY ${questionCount} questions - no more, no less
2. Ensure every question is fresh and distinct - NO repetition, rephrasing, or close resemblance between questions
3. Organize questions by concept/topic
4. ${isDescriptive ? 'For each question, provide a model answer that students should aim for' : 'For each question provide four answer options (A, B, C, D) - RANDOMIZE the position of correct answers across questions, do NOT put correct answers consistently in the same position'}
5. ${isDescriptive ? 'Provide' : 'For multiple choice, provide'} a brief Wisa AI explanation (1-2 sentences)
6. Group related questions together under concept headers
7. Apply the difficulty level in question phrasing and cognitive demand, not just topic choice

Format as JSON with this structure:
{
  "concepts": [
    {
      "name": "Concept Name",
      "questions": [{ question, ${isDescriptive ? 'model_answer' : 'options: {A, B, C, D}, correct'}, explanation }]
    }
  ]
}`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: selectedSources.web,
        response_json_schema: {
          type: 'object',
          properties: {
            concepts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  questions: {
                    type: 'array',
                    items: isDescriptive ? {
                      type: 'object',
                      properties: {
                        question: { type: 'string' },
                        model_answer: { type: 'string' },
                        explanation: { type: 'string' }
                      }
                    } : {
                      type: 'object',
                      properties: {
                        question: { type: 'string' },
                        options: {
                          type: 'object',
                          properties: {
                            A: { type: 'string' },
                            B: { type: 'string' },
                            C: { type: 'string' },
                            D: { type: 'string' }
                          }
                        },
                        correct: { type: 'string' },
                        explanation: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      const totalQuestions = response.concepts.reduce((sum, concept) => sum + concept.questions.length, 0);
      
      const tolerance = 3;
      if (Math.abs(totalQuestions - questionCount) > tolerance) {
        throw new Error(`Question count too far from requested amount (received ${totalQuestions}, expected around ${questionCount})`);
      }

      setCurrentActivity(response.concepts);
      setUserAnswers({});
      setShowResults(false);
      setIsGenerating(false);

      // Increment usage counter
      await base44.functions.invoke('incrementUsage', {
        feature: 'activities',
        usageId: limitCheck.data.usageId
      });
    } catch (error) {
      console.error('Generation error:', error);
      setGenerationError(error.message || 'Failed to generate questions. Please try again.');
      setIsGenerating(false);
    }
  };

  const saveActivityMutation = useMutation({
    mutationFn: (data) => base44.entities.CompletedActivity.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['completedActivities'] });
    },
  });

  const handleSubmitAnswers = async () => {
    setShowResults(true);
    setIsAnalyzing(true);
    
    const score = calculateScore();
    
    const incorrectQuestions = [];
    currentActivity.forEach((concept, cIdx) => {
      concept.questions.forEach((q, qIdx) => {
        const userAnswer = userAnswers[`${cIdx}-${qIdx}`];
        if (q.correct && userAnswer !== q.correct) {
          incorrectQuestions.push({
            concept: concept.name,
            question: q.question,
            userAnswer: userAnswer,
            correctAnswer: q.correct,
            correctText: q.options?.[q.correct],
            explanation: q.explanation
          });
        }
      });
    });

    let analysis = null;
    if (incorrectQuestions.length > 0) {
      const analysisPrompt = `You are Wisa AI, analyzing a student's quiz performance.

The student struggled with these questions:
${incorrectQuestions.map((q, idx) => `
${idx + 1}. Concept: ${q.concept}
   Question: ${q.question}
   Student's answer: ${q.userAnswer ? `Option ${q.userAnswer}` : 'No answer'}
   Correct answer: Option ${q.correctAnswer} - ${q.correctText}
   Explanation: ${q.explanation}
`).join('\n')}

TASK: Identify 2-4 key study focus points that address the student's weak areas. Each focus point should:
1. Target a specific gap in understanding revealed by the incorrect answers
2. Be clear and specific (not generic)
3. Guide the student to reinforce foundational concepts
4. Be actionable and focused on a concrete topic

Return as JSON:
{
  "focus_points": [
    {
      "title": "Brief, clear title (5-8 words max)",
      "description": "One sentence describing what to focus on (15-20 words)"
    }
  ]
}`;

      analysis = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            focus_points: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (analysis?.focus_points) {
        setWeakAreas(analysis.focus_points);
      }
    }
    
    saveActivityMutation.mutate({
      module_name: moduleName,
      difficulty: savedActivityDifficulty,
      activity_type: activityType,
      questions_data: currentActivity,
      score: score,
      focus_points: analysis?.focus_points || [],
      completed_date: new Date().toISOString()
    });
    
    setIsAnalyzing(false);
  };

  const handleAnswerSelect = (conceptIdx, questionIdx, answer) => {
    if (!showResults) {
      setUserAnswers(prev => ({
        ...prev,
        [`${conceptIdx}-${questionIdx}`]: answer
      }));
    }
  };

  const calculateScore = () => {
    if (!currentActivity) return { correct: 0, total: 0 };
    let correct = 0;
    let total = 0;
    currentActivity.forEach((concept, cIdx) => {
      concept.questions.forEach((q, qIdx) => {
        total++;
        if (userAnswers[`${cIdx}-${qIdx}`] === q.correct) correct++;
      });
    });
    return { correct, total };
  };

  const getTotalQuestions = () => {
    if (!currentActivity) return 0;
    return currentActivity.reduce((sum, concept) => sum + concept.questions.length, 0);
  };

  const createStudySessionMutation = useMutation({
    mutationFn: async (data) => base44.entities.StudySession.create(data),
    onSuccess: (newSession) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      navigate(createPageUrl(`Study?id=${newSession.id}&autoStart=true`));
    },
  });

  const handleFocusPointClick = async (focusPoint) => {
    setIsAnalyzing(true);
    
    const notesPrompt = `You are Wisa AI, generating focused study notes.

FOCUS AREA:
Title: ${focusPoint.title}
Description: ${focusPoint.description}

TASK: Create short, clear study notes (150-250 words) that:
1. Explain the key concepts the student needs to understand
2. Break down complex ideas into simple parts
3. Highlight the most important points to focus on
4. Provide a solid foundation for studying this topic

Write the notes in a clear, instructional style as if you're preparing a mini-lesson. Just write the content - no introduction like "Here are the notes..."`;

    const notes = await base44.integrations.Core.InvokeLLM({
      prompt: notesPrompt
    });

    const questionsPrompt = `You are Wisa AI. Based on these study notes about "${focusPoint.title}", generate exactly 4 focused questions that:
1. Target the key concepts in the notes
2. Help the student actively engage with the material
3. Guide toward understanding the fundamentals
4. Are specific and concrete (not generic)

STUDY NOTES:
${notes}

Return as JSON:
{"questions": ["question 1", "question 2", "question 3", "question 4"]}`;

    const suggestedQuestions = await base44.integrations.Core.InvokeLLM({
      prompt: questionsPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: { type: "string" },
            minItems: 4,
            maxItems: 4
          }
        }
      }
    });

    const sessionData = {
      title: focusPoint.title,
      subject: moduleName,
      materials: [{
        name: `Study Focus: ${focusPoint.title}`,
        type: 'text',
        extracted_content: notes,
        number: 1
      }],
      conversation: [],
      suggestedQuestions: suggestedQuestions?.questions || [],
      status: 'active'
    };

    createStudySessionMutation.mutate(sessionData);
  };

  const handleAddFiveQuestions = async () => {
    setIsAddingQuestions(true);
    setShowResults(false);
    setGenerationError(null);
    
    let contentSources = [];
    
    if (selectedSources.material && selectedMaterials.length > 0) {
      for (const materialId of selectedMaterials) {
        const material = allMaterials.find(m => m.id === materialId);
        if (material?.extracted_content) {
          contentSources.push({ type: 'material', content: material.extracted_content });
        }
      }
    }
    
    if (selectedSources.conversation && selectedConversations.length > 0) {
      for (const convId of selectedConversations) {
        const conversation = allConversations.find(c => c.id === convId);
        if (conversation?.conversation) {
          const content = conversation.conversation.map(m => `${m.role}: ${m.content}`).join('\n\n');
          contentSources.push({ type: 'conversation', content });
        }
      }
    }
    
    const allContent = contentSources.map(s => s.content).join('\n\n---\n\n');
    
    const difficultyInstructions = {
      'Decent': 'Questions should be straightforward, testing basic understanding and recall. Use clear, simple language.',
      'Average': 'Questions should be moderately challenging, requiring application and reasoning. Test understanding beyond memorization.',
      'Trying': 'Questions should be difficult, testing deeper understanding, connections, or multi-step reasoning. Challenge students to think critically.'
    };

    const isDescriptive = activityType === 'descriptive';
    const prompt = `You are Wisa, an expert exam creator. Based on the following study materials, generate exactly 5 ${isDescriptive ? 'descriptive answer' : 'multiple-choice'} questions in an exam-style format.

DIFFICULTY LEVEL: ${savedActivityDifficulty}
${difficultyInstructions[savedActivityDifficulty]}

${selectedSources.web ? 'You may also use additional information from the web to enhance questions where appropriate.' : ''}

MATERIALS:
${allContent}

INSTRUCTIONS:
1. Generate EXACTLY 5 questions - no more, no less
2. Ensure every question is fresh and distinct - NO repetition, rephrasing, or close resemblance between questions
3. Make sure these questions are completely different from any questions already generated in this activity
4. Organize questions by concept/topic
5. ${isDescriptive ? 'For each question, provide a model answer that students should aim for' : 'For each question provide four answer options (A, B, C, D) - RANDOMIZE the position of correct answers across questions, do NOT put correct answers consistently in the same position'}
6. ${isDescriptive ? 'Provide' : 'For multiple choice, provide'} a brief Wisa AI explanation (1-2 sentences)
7. Group related questions together under concept headers
8. Apply the difficulty level in question phrasing and cognitive demand, not just topic choice

Format as JSON with this structure:
{
  "concepts": [
    {
      "name": "Concept Name",
      "questions": [{ question, ${isDescriptive ? 'model_answer' : 'options: {A, B, C, D}, correct'}, explanation }]
    }
  ]
}`;

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: selectedSources.web,
        response_json_schema: {
          type: 'object',
          properties: {
            concepts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  questions: {
                    type: 'array',
                    items: isDescriptive ? {
                      type: 'object',
                      properties: {
                        question: { type: 'string' },
                        model_answer: { type: 'string' },
                        explanation: { type: 'string' }
                      }
                    } : {
                      type: 'object',
                      properties: {
                        question: { type: 'string' },
                        options: {
                          type: 'object',
                          properties: {
                            A: { type: 'string' },
                            B: { type: 'string' },
                            C: { type: 'string' },
                            D: { type: 'string' }
                          }
                        },
                        correct: { type: 'string' },
                        explanation: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      const totalQuestions = response.concepts.reduce((sum, concept) => sum + concept.questions.length, 0);
      
      const tolerance = 3;
      if (Math.abs(totalQuestions - 5) > tolerance) {
        throw new Error(`Question count too far from requested amount (received ${totalQuestions}, expected around 5)`);
      }

      setCurrentActivity([...currentActivity, ...response.concepts]);
      setIsAddingQuestions(false);
    } catch (error) {
      console.error('Generation error:', error);
      setGenerationError(error.message || 'Failed to add questions. Please try again.');
      setIsAddingQuestions(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4">
      {isGenerating ? (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin mb-4" style={{ borderColor: 'var(--theme-primary)', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>Generating questions...</p>
        </div>
      ) : generationError ? (
        <div className="flex flex-col items-center justify-center h-full px-6">
          <XCircle className="w-16 h-16 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-stone-800 mb-2">Generation Failed</h3>
          <p className="text-sm text-stone-600 text-center mb-6">
            {generationError}
          </p>
          <Button
            onClick={() => {
              setGenerationError(null);
              handleStartGeneration();
            }}
            className="rounded-2xl px-6 py-3 font-semibold"
            style={{ 
              backgroundColor: 'var(--theme-primary)', 
              color: 'var(--theme-text, #1C1917)'
            }}
          >
            Try Again
          </Button>
        </div>
      ) : viewingActivity ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={() => setViewingActivity(null)} className="rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Activities
            </Button>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: 'var(--theme-primary-light)', color: 'var(--theme-primary)' }}>
                {viewingActivity.difficulty}
              </span>
            </div>
          </div>

          <Card className="p-5 bg-white border-0 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-stone-800 mb-1">
                  {viewingActivity.activity_type === 'multiple-choice' ? 'Multiple Choice Activity' : 'Descriptive Activity'}
                </h2>
                <p className="text-sm text-stone-500">
                  Completed on {new Date(viewingActivity.completed_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <div className="text-center">
                <div className={`text-3xl font-bold ${
                  Math.round((viewingActivity.score.correct / viewingActivity.score.total) * 100) >= 80 ? 'text-green-600' : 
                  Math.round((viewingActivity.score.correct / viewingActivity.score.total) * 100) >= 60 ? 'text-yellow-600' : 
                  'text-red-600'
                }`}>
                  {Math.round((viewingActivity.score.correct / viewingActivity.score.total) * 100)}%
                </div>
                <div className="text-xs text-stone-500 mt-1">
                  {viewingActivity.score.correct}/{viewingActivity.score.total} correct
                </div>
              </div>
            </div>
          </Card>

          {viewingActivity.questions_data.map((concept, cIdx) => (
            <div key={cIdx} className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-1 w-12 rounded-full" style={{ backgroundColor: 'var(--theme-primary)' }} />
                <h2 className="text-lg font-bold text-stone-800">{concept.name}</h2>
              </div>
              
              {concept.questions.map((q, qIdx) => {
                const globalIdx = viewingActivity.questions_data.slice(0, cIdx).reduce((sum, c) => sum + c.questions.length, 0) + qIdx;
                return (
                  <Card key={`${cIdx}-${qIdx}`} className="p-4 bg-white border-0 rounded-2xl shadow-sm">
                    <h3 className="font-medium text-stone-800 mb-3">
                      {globalIdx + 1}. {q.question}
                    </h3>
                    {q.options ? (
                      <div className="space-y-2">
                        {Object.entries(q.options).map(([letter, text]) => {
                          const isCorrect = letter === q.correct;
                          return (
                            <div
                              key={letter}
                              className={`p-3 rounded-xl border ${
                                isCorrect ? 'bg-green-50 border-green-300' : 'border-stone-200'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm">
                                  <span className="font-medium">{letter}.</span> {text}
                                </span>
                                {isCorrect && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : q.model_answer && (
                      <div className="p-3 rounded-xl bg-green-50 border border-green-200">
                        <p className="text-sm font-semibold text-green-800 mb-1">Model Answer:</p>
                        <p className="text-sm text-green-700">{q.model_answer}</p>
                      </div>
                    )}
                    
                    <div className="mt-4 p-3 rounded-xl" style={{ backgroundColor: 'var(--theme-bg, #F5F5F4)' }}>
                      <p className="text-sm text-stone-600">
                        <span className="font-semibold">Wisa:</span> {q.explanation}
                      </p>
                    </div>
                  </Card>
                );
              })}
            </div>
          ))}

          {viewingActivity.focus_points && viewingActivity.focus_points.length > 0 && (
            <Card className="p-5 bg-white border-0 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
                <h3 className="text-lg font-semibold text-stone-800">Focus Areas</h3>
              </div>
              <p className="text-sm text-stone-600 mb-4">
                Based on your performance, here are key areas to strengthen:
              </p>
              <div className="space-y-3">
                {viewingActivity.focus_points.map((area, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleFocusPointClick(area)}
                    className="p-4 rounded-2xl bg-stone-50 border cursor-pointer transition-all hover:shadow-md active:scale-[0.98]"
                    style={{ borderColor: 'var(--theme-primary-light)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-stone-800 mb-1">{area.title}</h4>
                        <p className="text-sm text-stone-600">{area.description}</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-stone-400 flex-shrink-0 mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      ) : !currentActivity ? (
        <>
          <Button
            onClick={handleStartGeneration}
            className="w-full rounded-2xl py-6 text-base mb-6 font-semibold"
            style={{ 
              backgroundColor: 'var(--theme-primary)', 
              color: 'var(--theme-text, #1C1917)'
            }}
          >
            <Plus className="w-5 h-5 mr-2" />
            Generate Questions
          </Button>

          <div className="space-y-3">
            <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wide">
              Past Activities
            </h3>
            
            {activitiesLoading && completedActivities.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-white/50 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : completedActivities.length === 0 ? (
              <Card className="p-8 bg-white/70 border-0 rounded-2xl text-center">
                <Brain className="w-10 h-10 text-stone-300 mx-auto mb-3" />
                <p className="text-stone-500 text-sm">No activities yet</p>
                <p className="text-stone-400 text-xs mt-1">Generate questions to get started</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {completedActivities.map((activity) => {
                  const percentage = Math.round((activity.score.correct / activity.score.total) * 100);
                  const scoreColor = percentage >= 80 ? 'text-green-600' : percentage >= 60 ? 'text-yellow-600' : 'text-red-600';
                  
                  return (
                    <Card 
                      key={activity.id} 
                      onClick={() => setViewingActivity(activity)}
                      className="p-5 bg-white border-0 rounded-2xl shadow-sm hover:shadow-lg transition-all cursor-pointer active:scale-[0.98]"
                      style={{ borderLeft: `4px solid var(--theme-primary)` }}
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700">
                              {activity.activity_type === 'multiple-choice' ? 'Multiple Choice' : 'Descriptive'}
                            </span>
                            <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: 'var(--theme-primary-light)', color: 'var(--theme-primary)' }}>
                              {activity.difficulty}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-stone-500">
                            <span className="font-medium">{new Date(activity.completed_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <span>•</span>
                            <span>{activity.score.total} questions</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className={`text-2xl font-bold ${scoreColor}`}>
                            {percentage}%
                          </div>
                          <div className="text-xs text-stone-500">
                            {activity.score.correct}/{activity.score.total}
                          </div>
                        </div>
                      </div>
                      
                      {activity.focus_points && activity.focus_points.length > 0 && (
                        <div className="pt-3 border-t border-stone-100">
                          <div className="flex items-center gap-1 mb-2">
                            <Target className="w-3.5 h-3.5 text-stone-400" />
                            <p className="text-xs font-semibold text-stone-600">Focus Areas</p>
                          </div>
                          <div className="space-y-1">
                            {activity.focus_points.slice(0, 2).map((point, idx) => (
                              <p key={idx} className="text-xs text-stone-500 line-clamp-1">• {point.title}</p>
                            ))}
                            {activity.focus_points.length > 2 && (
                              <p className="text-xs text-stone-400 italic">+{activity.focus_points.length - 2} more</p>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between">
                        <span className="text-xs text-stone-400">Tap to review</span>
                        <ArrowRight className="w-4 h-4 text-stone-300" />
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={() => {
              setCurrentActivity(null);
              setGenerationError(null);
            }} className="rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              {savedActivityDifficulty && (
                <span className="text-sm font-medium text-stone-600">
                  {savedActivityDifficulty}
                </span>
              )}
              {showResults && (
                <div className="text-lg font-semibold" style={{ color: 'var(--theme-primary)' }}>
                  Score: {calculateScore().correct}/{calculateScore().total}
                </div>
              )}
            </div>
          </div>

          {currentActivity.map((concept, cIdx) => (
            <div key={cIdx} className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-1 w-12 rounded-full" style={{ backgroundColor: 'var(--theme-primary)' }} />
                <h2 className="text-lg font-bold text-stone-800">{concept.name}</h2>
              </div>
              
              {concept.questions.map((q, qIdx) => {
                const globalIdx = currentActivity.slice(0, cIdx).reduce((sum, c) => sum + c.questions.length, 0) + qIdx;
                return (
                  <motion.div
                    key={`${cIdx}-${qIdx}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: globalIdx * 0.03 }}
                  >
                    <Card className="p-4 bg-white border-0 rounded-2xl shadow-sm">
                      <h3 className="font-medium text-stone-800 mb-3">
                        {globalIdx + 1}. {q.question}
                      </h3>
                      {q.options ? (
                        <RadioGroup 
                          value={userAnswers[`${cIdx}-${qIdx}`]} 
                          onValueChange={(value) => handleAnswerSelect(cIdx, qIdx, value)}
                        >
                          <div className="space-y-2">
                            {Object.entries(q.options).map(([letter, text]) => {
                            const isCorrect = letter === q.correct;
                            const isSelected = userAnswers[`${cIdx}-${qIdx}`] === letter;
                            const showFeedback = showResults && isSelected;
                            
                            return (
                              <div
                                key={letter}
                                className={`flex items-center space-x-2 p-3 rounded-xl border transition-colors ${
                                  showResults && isCorrect ? 'bg-green-50 border-green-300' :
                                  showFeedback && !isCorrect ? 'bg-red-50 border-red-300' :
                                  'border-stone-200 hover:bg-stone-50'
                                }`}
                              >
                                <RadioGroupItem value={letter} id={`q${cIdx}-${qIdx}-${letter}`} disabled={showResults} />
                                <Label htmlFor={`q${cIdx}-${qIdx}-${letter}`} className="flex-1 cursor-pointer">
                                  <span className="font-medium">{letter}.</span> {text}
                                </Label>
                                {showResults && isSelected && (
                                  isCorrect ? 
                                    <CheckCircle2 className="w-5 h-5 text-green-600" /> : 
                                    <XCircle className="w-5 h-5 text-red-600" />
                                )}
                              </div>
                            );
                            })}
                          </div>
                        </RadioGroup>
                      ) : (
                        <div className="space-y-3">
                          <textarea
                            value={userAnswers[`${cIdx}-${qIdx}`] || ''}
                            onChange={(e) => handleAnswerSelect(cIdx, qIdx, e.target.value)}
                            disabled={showResults}
                            placeholder="Type your answer here..."
                            className="w-full min-h-32 p-3 border border-stone-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-stone-300 disabled:bg-stone-50"
                          />
                          {showResults && q.model_answer && (
                            <div className="p-3 rounded-xl bg-green-50 border border-green-200">
                              <p className="text-sm font-semibold text-green-800 mb-1">Model Answer:</p>
                              <p className="text-sm text-green-700">{q.model_answer}</p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {showResults && (
                        <div className="mt-4 p-3 rounded-xl" style={{ backgroundColor: 'var(--theme-bg, #F5F5F4)' }}>
                          <p className="text-sm text-stone-600">
                            <span className="font-semibold">Wisa:</span> {q.explanation}
                          </p>
                        </div>
                      )}
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          ))}

          {!showResults ? (
            <Button
              onClick={handleSubmitAnswers}
              disabled={Object.keys(userAnswers).length !== getTotalQuestions()}
              className="w-full rounded-2xl py-6 text-base font-semibold"
              style={{ 
                backgroundColor: 'var(--theme-primary)', 
                color: 'var(--theme-text, #1C1917)'
              }}
            >
              Submit Answers
            </Button>
          ) : (
            <>
              {isAnalyzing && (
                <div className="flex items-center justify-center py-4">
                  <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: 'var(--theme-primary)', borderTopColor: 'transparent' }} />
                </div>
              )}
              
              {!isAnalyzing && (
                <>
                  <Button
                    onClick={handleAddFiveQuestions}
                    disabled={isAddingQuestions}
                    className="w-full rounded-2xl py-6 text-base font-semibold mt-4"
                    variant="outline"
                    style={{ 
                      borderColor: 'var(--theme-primary)', 
                      color: 'var(--theme-primary)'
                    }}
                  >
                    {isAddingQuestions ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Generating 5 more questions...
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5 mr-2" />
                        Add 5 More Questions
                      </>
                    )}
                  </Button>
                  
                  {weakAreas.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4 mt-6"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Target className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
                        <h3 className="text-lg font-semibold text-stone-800">Suggested Focus Areas</h3>
                      </div>
                      <p className="text-sm text-stone-600 mb-4">
                        Based on your performance, here are key areas to strengthen your understanding:
                      </p>
                      
                      <div className="space-y-3">
                        {weakAreas.map((area, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            onClick={() => handleFocusPointClick(area)}
                            className="p-4 rounded-2xl bg-white border-2 cursor-pointer transition-all hover:shadow-md"
                            style={{ borderColor: 'var(--theme-primary-light)' }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <h4 className="font-semibold text-stone-800 mb-1">{area.title}</h4>
                                <p className="text-sm text-stone-600">{area.description}</p>
                              </div>
                              <ArrowRight className="w-5 h-5 text-stone-400 flex-shrink-0 mt-1" />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      <Dialog open={generateDialogOpen} onOpenChange={(open) => {
        if (!open) setGenerateDialogOpen(false);
      }}>
        <DialogContent className="max-w-sm rounded-3xl" style={{ backgroundColor: 'var(--theme-bg)' }}>
          <DialogHeader className="text-center">
            <DialogTitle className="text-center" style={{ color: 'var(--theme-text)' }}>
              {step === 1 && 'Select Sources'}
              {step === 2 && 'Choose Specific Sources'}
              {step === 3 && 'Number of Questions'}
              {step === 4 && 'Difficulty Level'}
              {step === 5 && 'Activity Type'}
            </DialogTitle>
          </DialogHeader>
          
          {step === 1 && (
            <div className="space-y-4 pt-4">
              <p className="text-sm text-stone-600">Select where to generate questions from:</p>
              
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 cursor-pointer hover:bg-stone-50">
                  <Checkbox 
                    checked={selectedSources.material}
                    onCheckedChange={() => handleSourceToggle('material')}
                  />
                  <BookOpen className="w-5 h-5 text-stone-600" />
                  <span className="text-sm font-medium">Material</span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 cursor-pointer hover:bg-stone-50">
                  <Checkbox 
                    checked={selectedSources.conversation}
                    onCheckedChange={() => handleSourceToggle('conversation')}
                  />
                  <MessageSquare className="w-5 h-5 text-stone-600" />
                  <span className="text-sm font-medium">Conversation</span>
                </label>

                <div 
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    !selectedSources.material && !selectedSources.conversation 
                      ? 'border-stone-200 opacity-50 cursor-not-allowed' 
                      : 'border-stone-200 hover:bg-stone-50 cursor-pointer'
                  }`}
                >
                  <Checkbox 
                    checked={selectedSources.web}
                    onCheckedChange={() => handleSourceToggle('web')}
                    disabled={!selectedSources.material && !selectedSources.conversation}
                  />
                  <Globe className="w-5 h-5 text-stone-600" />
                  <div className="flex-1">
                    <span className="text-sm font-medium">From the Web</span>
                    {!selectedSources.material && !selectedSources.conversation && (
                      <p className="text-xs text-stone-500 mt-0.5">Requires Material or Conversation</p>
                    )}
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => setStep(getNextStep())}
                className="w-full rounded-xl font-semibold"
                style={{ backgroundColor: 'var(--theme-primary)', color: 'var(--theme-text)' }}
                disabled={!canProceedToNextStep()}
              >
                Next
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 pt-4">
              <p className="text-sm text-stone-600 text-center">Choose specific sources:</p>
              
              <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                {selectedSources.material && allMaterials.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3 px-1">Materials</h4>
                    <div className="space-y-2">
                      {allMaterials.map((material) => (
                        <label
                          key={material.id}
                          className="flex items-start gap-3 p-3.5 rounded-xl border border-stone-200 cursor-pointer hover:bg-stone-50 transition-colors"
                        >
                          <Checkbox 
                            checked={selectedMaterials.includes(material.id)}
                            onCheckedChange={() => handleMaterialToggle(material.id)}
                            className="mt-0.5 flex-shrink-0"
                          />
                          <span className="text-sm font-medium flex-1 min-w-0 break-words leading-relaxed">{material.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {selectedSources.conversation && allConversations.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3 px-1">Conversations</h4>
                    <div className="space-y-2">
                      {allConversations.map((conv) => (
                        <label
                          key={conv.id}
                          className="flex items-start gap-3 p-3.5 rounded-xl border border-stone-200 cursor-pointer hover:bg-stone-50 transition-colors"
                        >
                          <Checkbox 
                            checked={selectedConversations.includes(conv.id)}
                            onCheckedChange={() => handleConversationToggle(conv.id)}
                            className="mt-0.5 flex-shrink-0"
                          />
                          <span className="text-sm font-medium flex-1 min-w-0 break-words leading-relaxed">{conv.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={() => setStep(1)}
                  variant="outline"
                  className="flex-1 rounded-xl"
                >
                  Back
                </Button>
                <Button 
                  onClick={() => setStep(3)}
                  className="flex-1 rounded-xl font-semibold"
                  style={{ backgroundColor: 'var(--theme-primary)', color: 'var(--theme-text)' }}
                  disabled={!canProceedToNextStep()}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 pt-4">
              <div>
                <Label className="text-sm text-stone-600 mb-2 block">
                  How many questions? (5-50)
                </Label>
                <Input
                  type="number"
                  min="5"
                  max="50"
                  value={questionCountInput}
                  onChange={(e) => setQuestionCountInput(e.target.value)}
                  className="rounded-xl text-center text-lg font-semibold"
                  placeholder="Enter number"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={() => setStep(selectedSources.material || selectedSources.conversation ? 2 : 1)}
                  variant="outline"
                  className="flex-1 rounded-xl"
                >
                  Back
                </Button>
                <Button 
                  onClick={() => setStep(4)}
                  className="flex-1 rounded-xl font-semibold"
                  style={{ backgroundColor: 'var(--theme-primary)', color: 'var(--theme-text)' }}
                  disabled={!canProceedToNextStep()}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 pt-4">
              <p className="text-sm text-stone-600">Select difficulty level:</p>
              <RadioGroup value={difficulty} onValueChange={setDifficulty}>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 cursor-pointer hover:bg-stone-50">
                    <RadioGroupItem value="Decent" id="diff-decent" />
                    <Label htmlFor="diff-decent" className="cursor-pointer flex-1">
                      <span className="font-semibold">Decent</span>
                      <p className="text-xs text-stone-500">Straightforward, basic understanding</p>
                    </Label>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 cursor-pointer hover:bg-stone-50">
                    <RadioGroupItem value="Average" id="diff-average" />
                    <Label htmlFor="diff-average" className="cursor-pointer flex-1">
                      <span className="font-semibold">Average</span>
                      <p className="text-xs text-stone-500">Moderately challenging</p>
                    </Label>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 cursor-pointer hover:bg-stone-50">
                    <RadioGroupItem value="Trying" id="diff-trying" />
                    <Label htmlFor="diff-trying" className="cursor-pointer flex-1">
                      <span className="font-semibold">Trying</span>
                      <p className="text-xs text-stone-500">Difficult, deep reasoning</p>
                    </Label>
                  </label>
                </div>
              </RadioGroup>

              <div className="flex gap-2">
                <Button 
                  onClick={() => setStep(3)}
                  variant="outline"
                  className="flex-1 rounded-xl"
                >
                  Back
                </Button>
                <Button 
                  onClick={() => setStep(5)}
                  className="flex-1 rounded-xl font-semibold"
                  style={{ backgroundColor: 'var(--theme-primary)', color: 'var(--theme-text)' }}
                  disabled={!canProceedToNextStep()}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6 pt-4">
              <p className="text-sm text-stone-600">Choose activity type:</p>
              <RadioGroup value={activityType} onValueChange={setActivityType}>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 cursor-pointer hover:bg-stone-50">
                    <RadioGroupItem value="multiple-choice" id="type-mc" />
                    <Label htmlFor="type-mc" className="cursor-pointer flex-1">
                      <span className="font-semibold">Multiple Choice</span>
                      <p className="text-xs text-stone-500">Select from options</p>
                    </Label>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 cursor-pointer hover:bg-stone-50">
                    <RadioGroupItem value="descriptive" id="type-desc" />
                    <Label htmlFor="type-desc" className="cursor-pointer flex-1">
                      <span className="font-semibold">Descriptive Answer</span>
                      <p className="text-xs text-stone-500">Type your responses</p>
                    </Label>
                  </label>
                </div>
              </RadioGroup>

              <div className="flex gap-2">
                <Button 
                  onClick={() => setStep(4)}
                  variant="outline"
                  className="flex-1 rounded-xl"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleGenerateQuestions}
                  className="flex-1 rounded-xl font-semibold"
                  style={{ backgroundColor: 'var(--theme-primary)', color: 'var(--theme-text)' }}
                >
                  Generate
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <UpgradePrompt
        open={showUpgradePrompt}
        onOpenChange={setShowUpgradePrompt}
        feature={limitFeature}
      />
    </div>
  );
}