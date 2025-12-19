"use client";

import React from 'react';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Tag, Package, Check } from 'lucide-react';

interface Deal {
  id: string;
  productName: string;
  productBrand?: string;
  salePrice: number;
  regularPrice?: number;
  storeName: string;
  dealType: string;
  savingsPercent?: number;
  validTo?: string;
  imageUrl?: string;
}

interface DealCardProps {
  deal: Deal;
  onClick?: () => void;
  onAddToList?: () => void;
  isAdded?: boolean;
}

export function DealCard({ deal, onClick, onAddToList, isAdded = false }: DealCardProps) {
  const savings = deal.regularPrice
    ? deal.regularPrice - deal.salePrice
    : 0;

  const savingsPercent = deal.savingsPercent ||
    (deal.regularPrice ? Math.round((savings / deal.regularPrice) * 100) : 0);

  const getDealTypeBadgeVariant = (dealType: string) => {
    switch (dealType.toLowerCase()) {
      case 'bogo':
        return 'secondary';
      case 'sale':
        return 'destructive';
      case 'clearance':
        return 'outline';
      default:
        return 'default';
    }
  };

  return (
    <Card
      className="group hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden"
      onClick={onClick}
    >
      {/* Product Image */}
      {deal.imageUrl ? (
        <div className="relative w-full h-32 bg-gray-100">
          <Image
            src={deal.imageUrl}
            alt={deal.productName}
            fill
            className="object-contain p-2"
            sizes="(max-width: 768px) 100vw, 300px"
            unoptimized
          />
        </div>
      ) : (
        <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
          <Package className="w-12 h-12 text-gray-300" />
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Store name and deal type */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground truncate">
              {deal.storeName}
            </p>
          </div>
          <Badge
            variant={getDealTypeBadgeVariant(deal.dealType)}
            className="shrink-0 text-xs"
          >
            {deal.dealType}
          </Badge>
        </div>

        {/* Product name */}
        <div className="space-y-1">
          <h3 className="font-semibold text-base line-clamp-2 leading-tight">
            {deal.productName}
          </h3>
          {deal.productBrand && (
            <p className="text-xs text-muted-foreground">
              {deal.productBrand}
            </p>
          )}
        </div>

        {/* Pricing */}
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-green-600">
                ${deal.salePrice.toFixed(2)}
              </span>
              {deal.regularPrice && (
                <span className="text-sm text-muted-foreground line-through">
                  ${deal.regularPrice.toFixed(2)}
                </span>
              )}
            </div>
            {savingsPercent > 0 && (
              <div className="flex items-center gap-1 text-xs font-medium text-orange-600">
                <Tag className="w-3 h-3" />
                <span>Save {savingsPercent}%</span>
              </div>
            )}
          </div>

          {/* Add to list button */}
          {isAdded ? (
            <Button
              size="sm"
              variant="outline"
              disabled
              className="shrink-0 bg-green-50 border-green-200 text-green-600"
            >
              <Check className="w-4 h-4" />
            </Button>
          ) : onAddToList ? (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onAddToList();
              }}
              className="shrink-0 hover:bg-green-50 hover:border-green-200 hover:text-green-600"
            >
              <ShoppingCart className="w-4 h-4" />
            </Button>
          ) : null}
        </div>

        {/* Valid until */}
        {deal.validTo && (() => {
          const date = new Date(deal.validTo);
          // Check if date is valid (not "Invalid Date")
          return !isNaN(date.getTime()) ? (
            <p className="text-xs text-muted-foreground">
              Valid until {date.toLocaleDateString()}
            </p>
          ) : null;
        })()}
      </div>
    </Card>
  );
}
