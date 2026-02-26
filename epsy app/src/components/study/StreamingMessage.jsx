import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export default function StreamingMessage({ content, shouldAnimate = false, onAnimationComplete, webEnabled = false }) {
  const [displayedContent, setDisplayedContent] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  // Reset when content changes or animation starts
  useEffect(() => {
    if (shouldAnimate) {
      setCurrentIndex(0);
      setDisplayedContent('');
    } else {
      setCurrentIndex(content.length);
      setDisplayedContent(content);
    }
  }, [content, shouldAnimate]);

  // Animate character by character
  useEffect(() => {
    if (!shouldAnimate) return;
    
    if (currentIndex >= content.length) {
      if (onAnimationComplete) {
        onAnimationComplete();
      }
      return;
    }

    const currentChar = content[currentIndex];
    const isPunctuation = ['.', ',', '!', '?', ';', ':'].includes(currentChar);
    const delay = isPunctuation ? 100 : 25;
    
    const timeout = setTimeout(() => {
      setDisplayedContent(content.slice(0, currentIndex + 1));
      setCurrentIndex(currentIndex + 1);
    }, delay);

    return () => clearTimeout(timeout);
  }, [content, currentIndex, shouldAnimate, onAnimationComplete]);

  // Process content to handle [WEB]...[/WEB] tags
  const processContent = (text) => {
    if (!webEnabled) return text;
    
    const parts = [];
    let lastIndex = 0;
    const webRegex = /\[WEB\](.*?)\[\/WEB\]/gs;
    let match;

    while ((match = webRegex.exec(text)) !== null) {
      // Add text before the tag
      if (match.index > lastIndex) {
        parts.push({ type: 'normal', content: text.slice(lastIndex, match.index) });
      }
      // Add web-sourced text
      parts.push({ type: 'web', content: match[1] });
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({ type: 'normal', content: text.slice(lastIndex) });
    }

    return parts.length > 0 ? parts : [{ type: 'normal', content: text }];
  };

  const contentParts = processContent(displayedContent);

  return (
    <div className="text-base leading-[1.7] text-stone-800 max-w-full overflow-hidden">
      {Array.isArray(contentParts) ? (
        <>
          {contentParts.map((part, idx) => (
            <span key={idx} style={part.type === 'web' ? { color: 'var(--theme-primary)' } : {}} className="block max-w-full overflow-x-auto">
              <ReactMarkdown 
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              className="prose prose-base prose-stone max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-3 [&_li]:my-1 [&_a]:text-[0.9em] [&_a]:min-h-[44px] [&_a]:inline-flex [&_a]:items-center [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_.katex-display]:max-w-full [&_.katex]:text-base [&_.katex]:max-w-full"
              components={{
                a: ({ children, ...props }) => (
                  <a {...props} className="text-sm underline" target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                ),
                ul: ({ children }) => <ul className="my-1 ml-4 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="my-1 ml-4 list-decimal space-y-1">{children}</ol>,
                li: ({ children }) => (
                  <li className="my-0.5 flex items-start gap-2">
                    <span className="text-black mt-0.5">•</span>
                    <span className="flex-1">{children}</span>
                  </li>
                ),
              }}
            >
              {part.content}
              </ReactMarkdown>
            </span>
          ))}
          {shouldAnimate && currentIndex < content.length && (
            <span 
              className="inline-block w-1.5 h-4 ml-0.5 animate-pulse"
              style={{ backgroundColor: 'var(--theme-primary)' }}
            />
          )}
        </>
      ) : (
        <>
        <ReactMarkdown 
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
          className="prose prose-base prose-stone max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-3 [&_li]:my-1 [&_a]:text-[0.9em] [&_a]:min-h-[44px] [&_a]:inline-flex [&_a]:items-center [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_.katex-display]:max-w-full [&_.katex]:text-base [&_.katex]:max-w-full"
          components={{
            a: ({ children, ...props }) => (
              <a {...props} className="text-sm underline" target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ),
            ul: ({ children }) => <ul className="my-1 ml-4 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="my-1 ml-4 list-decimal space-y-1">{children}</ol>,
            li: ({ children }) => (
              <li className="my-0.5 flex items-start gap-2">
                <span className="text-black mt-0.5">•</span>
                <span className="flex-1">{children}</span>
              </li>
            ),
          }}
          >
            {displayedContent}
          </ReactMarkdown>
          {shouldAnimate && currentIndex < content.length && (
            <span 
              className="inline-block w-1.5 h-4 ml-0.5 animate-pulse"
              style={{ backgroundColor: 'var(--theme-primary)' }}
            />
          )}
        </>
      )}
    </div>
  );
}