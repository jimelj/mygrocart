"use client";

import React from 'react';
import { Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DealBadgeProps {
  count: number;
  onClick?: () => void;
  className?: string;
}

/**
 * DealBadge - Shows count of matching deals for a list item
 * - Green badge with number (e.g., "3 deals")
 * - Clickable to expand/show deals
 */
export function DealBadge({ count, onClick, className }: DealBadgeProps) {
  if (count === 0) return null;

  return (
    <Badge
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 hover:bg-green-200 border-green-300 transition-colors",
        onClick && "cursor-pointer",
        className
      )}
    >
      <Tag className="w-3 h-3" />
      <span>{count} {count === 1 ? 'deal' : 'deals'}</span>
    </Badge>
  );
}
