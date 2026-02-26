import React from 'react';

export default function AnimatedStar() {
  const starPoints = [
    { d: "M12 2L15.09 8.26" },
    { d: "M15.09 8.26L22 9.27" },
    { d: "M22 9.27L17 14.14" },
    { d: "M17 14.14L18.18 21.02" },
    { d: "M18.18 21.02L12 17.77" },
    { d: "M12 17.77L5.82 21.02" },
    { d: "M5.82 21.02L7 14.14" },
    { d: "M7 14.14L2 9.27" },
    { d: "M2 9.27L8.91 8.26" },
    { d: "M8.91 8.26L12 2" }
  ];

  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      {starPoints.map((point, idx) => (
        <path
          key={idx}
          d={point.d}
          stroke="var(--theme-primary, #E5E4E2)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
    </svg>
  );
}