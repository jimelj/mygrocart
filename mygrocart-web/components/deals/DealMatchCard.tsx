"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tag, TrendingDown, Store, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Deal {
  id: string;
  storeName: string;
  productName: string;
  productBrand?: string;
  salePrice: number;
  regularPrice?: number;
  dealType: 'SALE' | 'BOGO' | 'COUPON' | 'MULTI_BUY' | 'CLEARANCE';
  savings?: number;
  savingsPercent?: number;
  validFrom: string;
  validTo: string;
  imageUrl?: string;
}

export interface DealMatch {
  deal: Deal;
  matchScore: number;
  matchReason: string;
}

interface DealMatchCardProps {
  dealMatch: DealMatch;
  onClick?: () => void;
  className?: string;
}

/**
 * DealMatchCard - Displays a single deal match
 * - Shows: store name, product name, sale price, savings %, deal type
 * - Match score indicator
 */
export function DealMatchCard({ dealMatch, onClick, className }: DealMatchCardProps) {
  const { deal, matchScore, matchReason } = dealMatch;

  const savings = deal.savings ??
    (deal.regularPrice ? deal.regularPrice - deal.salePrice : 0);

  const savingsPercent = deal.savingsPercent ??
    (deal.regularPrice ? Math.round((savings / deal.regularPrice) * 100) : 0);

  const getDealTypeBadgeStyle = (dealType: string) => {
    switch (dealType.toUpperCase()) {
      case 'BOGO':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'SALE':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'CLEARANCE':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'MULTI_BUY':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'COUPON':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 0.9) return 'text-primary-600 bg-primary-50 border-primary-300';
    if (score >= 0.7) return 'text-yellow-600 bg-yellow-50 border-yellow-300';
    return 'text-orange-600 bg-orange-50 border-orange-300';
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  return (
    <Card
      onClick={onClick}
      className={cn(
        "hover:shadow-md transition-all duration-200 border-l-4 border-l-primary-600",
        onClick && "cursor-pointer",
        className
      )}
    >
      <div className="space-y-3">
        {/* Header: Store and Deal Type */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Store className="w-4 h-4 text-gray-500 shrink-0" />
            <span className="text-sm font-semibold text-gray-900 truncate">
              {deal.storeName}
            </span>
          </div>
          <Badge className={cn("text-xs shrink-0", getDealTypeBadgeStyle(deal.dealType))}>
            {deal.dealType}
          </Badge>
        </div>

        {/* Product Name */}
        <div className="space-y-1">
          <h4 className="font-semibold text-base text-gray-900 leading-tight">
            {deal.productName}
          </h4>
          {deal.productBrand && (
            <p className="text-xs text-gray-500">
              {deal.productBrand}
            </p>
          )}
        </div>

        {/* Price and Savings */}
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-primary-600">
                ${deal.salePrice.toFixed(2)}
              </span>
              {deal.regularPrice && (
                <span className="text-sm text-gray-500 line-through">
                  ${deal.regularPrice.toFixed(2)}
                </span>
              )}
            </div>
            {savingsPercent > 0 && (
              <div className="flex items-center gap-1 text-sm font-semibold text-orange-600">
                <TrendingDown className="w-4 h-4" />
                <span>Save {savingsPercent}%</span>
              </div>
            )}
          </div>

          {/* Match Score Indicator */}
          <div className={cn(
            "px-3 py-1.5 rounded-full text-xs font-bold border",
            getMatchScoreColor(matchScore)
          )}>
            {Math.round(matchScore * 100)}% match
          </div>
        </div>

        {/* Match Reason */}
        <div className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
          <Tag className="w-3.5 h-3.5 text-gray-500 mt-0.5 shrink-0" />
          <p className="text-xs text-gray-600 leading-relaxed">
            {matchReason}
          </p>
        </div>

        {/* Valid Dates */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Calendar className="w-3.5 h-3.5" />
          <span>
            Valid {formatDate(deal.validFrom)} - {formatDate(deal.validTo)}
          </span>
        </div>
      </div>
    </Card>
  );
}
