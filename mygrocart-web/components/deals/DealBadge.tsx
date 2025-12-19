"use client";

import React from 'react';
import { Flame } from 'lucide-react';

interface DealBadgeProps {
  count: number;
  className?: string;
}

export function DealBadge({ count, className = '' }: DealBadgeProps) {
  if (count === 0) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 ${className}`}
    >
      <Flame className="w-3 h-3" />
      <span>{count}</span>
    </span>
  );
}
