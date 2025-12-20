"use client";

import React, { useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { useAuth } from '@/lib/auth-context';
import { MATCH_DEALS_TO_MY_LIST } from '@/lib/graphql/queries';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tag, ShoppingCart, ArrowLeft, Store, Percent } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Deal {
  id: string;
  productName: string;
  productBrand?: string;
  salePrice: number;
  regularPrice?: number;
  storeName: string;
  dealType: string;
  savings?: number;
  savingsPercent?: number;
  validFrom?: string;
  validTo?: string;
  imageUrl?: string;
}

interface ListItem {
  id: string;
  itemName: string;
  itemVariant?: string;
  category?: string;
  quantity: number;
}

interface DealMatch {
  deal: Deal;
  listItem: ListItem;
  matchScore: number;
  matchReason: string;
}

interface MatchDealsResponse {
  matchDealsToMyList: DealMatch[];
}

export default function MatchedDealsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  const { data, loading, error, refetch } = useQuery<MatchDealsResponse>(MATCH_DEALS_TO_MY_LIST, {
    variables: { userId: user?.userId },
    skip: !isAuthenticated || !user?.userId,
  });

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user)) {
      router.push('/login');
    }
  }, [isAuthenticated, user, router, isLoading]);

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const matches = data?.matchDealsToMyList || [];

  // Group matches by list item
  const groupedByItem = matches.reduce((acc, match) => {
    const key = match.listItem.id;
    if (!acc[key]) {
      acc[key] = {
        listItem: match.listItem,
        deals: [],
      };
    }
    acc[key].deals.push(match);
    return acc;
  }, {} as Record<string, { listItem: ListItem; deals: DealMatch[] }>);

  const groupedItems = Object.values(groupedByItem);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/list">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to List
            </Button>
          </Link>
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-6 h-6 text-orange-500" />
            <h1 className="text-3xl font-bold text-gray-900">Matched Deals</h1>
          </div>
          <p className="text-gray-600">
            {matches.length} {matches.length === 1 ? 'deal' : 'deals'} matched to your shopping list
          </p>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-6 text-center">
              <p className="text-red-600 font-medium mb-4">
                Error loading matched deals: {error.message}
              </p>
              <Button onClick={() => refetch()} variant="outline">
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!loading && !error && matches.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Matching Deals Found
              </h3>
              <p className="text-gray-600 mb-6">
                Add items to your shopping list to find matching deals from local flyers.
              </p>
              <Link href="/list">
                <Button className="bg-green-600 hover:bg-green-700">
                  Go to Shopping List
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Matched deals grouped by list item */}
        {!loading && !error && groupedItems.length > 0 && (
          <div className="space-y-6">
            {groupedItems.map(({ listItem, deals }) => (
              <Card key={listItem.id} className="overflow-hidden">
                {/* List item header */}
                <div className="bg-green-50 px-6 py-4 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {listItem.itemName}
                        {listItem.itemVariant && (
                          <span className="text-gray-600 font-normal"> ({listItem.itemVariant})</span>
                        )}
                      </h3>
                      {listItem.category && (
                        <Badge variant="secondary" className="mt-1">
                          {listItem.category}
                        </Badge>
                      )}
                    </div>
                    <Badge className="bg-orange-500">
                      {deals.length} {deals.length === 1 ? 'deal' : 'deals'}
                    </Badge>
                  </div>
                </div>

                {/* Deals for this item */}
                <CardContent className="p-0 divide-y">
                  {deals.map((match) => (
                    <div key={match.deal.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {match.deal.productName}
                          </p>
                          {match.deal.productBrand && (
                            <p className="text-sm text-gray-500">{match.deal.productBrand}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Store className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600">{match.deal.storeName}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">
                            ${match.deal.salePrice.toFixed(2)}
                          </p>
                          {match.deal.regularPrice && (
                            <p className="text-sm text-gray-500 line-through">
                              ${match.deal.regularPrice.toFixed(2)}
                            </p>
                          )}
                          {match.deal.savingsPercent && match.deal.savingsPercent > 0 && (
                            <Badge variant="outline" className="mt-1 text-orange-600 border-orange-300">
                              <Percent className="w-3 h-3 mr-1" />
                              Save {match.deal.savingsPercent}%
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Summary card */}
        {!loading && !error && matches.length > 0 && (
          <Card className="mt-8 bg-gradient-to-r from-green-50 to-orange-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900 mb-1">
                    Total Potential Savings
                  </p>
                  <p className="text-sm text-gray-600">
                    Based on {matches.length} matched {matches.length === 1 ? 'deal' : 'deals'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-green-600">
                    ${matches.reduce((sum, m) => sum + (m.deal.savings || 0), 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">estimated savings</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
