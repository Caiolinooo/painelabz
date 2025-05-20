'use client';

import React from 'react';

interface ScoreChartProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  maxScore?: number;
}

export default function ScoreChart({
  score,
  size = 100,
  strokeWidth = 8,
  maxScore = 10
}: ScoreChartProps) {
  // Normalizar pontuação para garantir que esteja entre 0 e maxScore
  const normalizedScore = Math.max(0, Math.min(score, maxScore));
  
  // Calcular porcentagem da pontuação
  const percentage = (normalizedScore / maxScore) * 100;
  
  // Calcular raio e circunferência
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Calcular o valor do traço
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  // Determinar a cor com base na pontuação
  const getColor = () => {
    if (percentage >= 80) return '#22c55e'; // Verde para pontuações altas
    if (percentage >= 60) return '#3b82f6'; // Azul para pontuações médias-altas
    if (percentage >= 40) return '#f59e0b'; // Amarelo para pontuações médias
    if (percentage >= 20) return '#f97316'; // Laranja para pontuações médias-baixas
    return '#ef4444'; // Vermelho para pontuações baixas
  };
  
  const color = getColor();
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Círculo de fundo */}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        
        {/* Círculo de progresso */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      
      {/* Texto da pontuação */}
      <div
        className="absolute inset-0 flex items-center justify-center flex-col"
        style={{ fontSize: size * 0.25 }}
      >
        <span className="font-bold" style={{ color }}>
          {normalizedScore.toFixed(1)}
        </span>
        <span className="text-gray-500 text-xs">/ {maxScore}</span>
      </div>
    </div>
  );
}
