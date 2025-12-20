"use client";

import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ShoppingCart, Plus, Minus, Trash2, Tag, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import {
  GET_MY_LIST_WITH_DEALS,
  MATCH_DEALS_TO_MY_LIST
} from '@/lib/graphql/queries';
import {
  ADD_LIST_ITEM,
  UPDATE_LIST_ITEM,
  REMOVE_LIST_ITEM
} from '@/lib/graphql/mutations';
import { SmartItemInput } from '@/components/list/SmartItemInput';
import { DealBadge } from '@/components/deals/DealBadge';

interface MatchingDeal {
  id: string;
  productName: string;
  salePrice: number;
  regularPrice?: number;
  storeName: string;
  dealType: string;
  savingsPercent?: number;
}

interface ListItem {
  id: string;
  itemName: string;
  itemVariant?: string;
  category?: string;
  quantity: number;
  checked: boolean;
  matchingDeals?: MatchingDeal[];
}

interface GetMyListWithDealsResponse {
  getMyListWithDeals: ListItem[];
}

export default function ShoppingListPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const toggleItemExpanded = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // GraphQL Queries
  const { data, loading, error, refetch } = useQuery<GetMyListWithDealsResponse>(GET_MY_LIST_WITH_DEALS, {
    variables: { userId: user?.userId },
    skip: !user?.userId
  });

  // GraphQL Mutations
  const [addItem] = useMutation(ADD_LIST_ITEM, {
    onError: (error) => {
      console.error('Error adding item:', error);
    }
  });

  const [updateItem] = useMutation(UPDATE_LIST_ITEM, {
    onError: (error) => {
      console.error('Error updating item:', error);
    }
  });

  const [removeItem] = useMutation(REMOVE_LIST_ITEM, {
    onError: (error) => {
      console.error('Error removing item:', error);
    }
  });

  // Handlers
  const handleAddItem = async (itemName: string, itemVariant?: string, category?: string) => {
    try {
      await addItem({
        variables: {
          itemName,
          itemVariant,
          category,
          quantity: 1,
        },
        refetchQueries: [{ query: GET_MY_LIST_WITH_DEALS, variables: { userId: user?.userId } }],
        awaitRefetchQueries: true,
      });
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  };

  const handleUpdateQuantity = async (id: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    try {
      await updateItem({
        variables: {
          id,
          quantity: newQuantity,
        },
        refetchQueries: [{ query: GET_MY_LIST_WITH_DEALS, variables: { userId: user?.userId } }],
        awaitRefetchQueries: true,
      });
    } catch (error) {
      console.error('Failed to update quantity:', error);
    }
  };

  const handleToggleChecked = async (id: string, checked: boolean) => {
    try {
      await updateItem({
        variables: {
          id,
          checked: !checked,
        },
        refetchQueries: [{ query: GET_MY_LIST_WITH_DEALS, variables: { userId: user?.userId } }],
        awaitRefetchQueries: true,
      });
    } catch (error) {
      console.error('Failed to toggle checked:', error);
    }
  };

  const handleRemoveItem = async (id: string) => {
    try {
      await removeItem({
        variables: { id },
        refetchQueries: [{ query: GET_MY_LIST_WITH_DEALS, variables: { userId: user?.userId } }],
        awaitRefetchQueries: true,
      });
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };

  const listItems: ListItem[] = data?.getMyListWithDeals || [];
  const totalMatchedDeals = listItems.reduce((sum, item) => sum + (item.matchingDeals?.length || 0), 0);

  if (!isAuthenticated || !user) {
    return null; // Will redirect
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
            <p className="text-gray-600">Loading your shopping list...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-16 h-16 mb-4 text-red-500">
              <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xl font-semibold text-gray-900 mb-2">Error Loading List</p>
            <p className="text-gray-600 mb-4">{error.message}</p>
            <Button onClick={() => refetch()} className="bg-green-600 hover:bg-green-700">
              Try Again
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="w-6 h-6 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-900">Shopping List</h1>
          </div>
          <p className="text-gray-600">
            {listItems.length} {listItems.length === 1 ? 'item' : 'items'}
            {totalMatchedDeals > 0 && (
              <span className="ml-2 text-orange-600 font-medium">
                • {totalMatchedDeals} {totalMatchedDeals === 1 ? 'deal' : 'deals'} matched
              </span>
            )}
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Smart Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Items</CardTitle>
            </CardHeader>
            <CardContent>
              <SmartItemInput onAddItem={handleAddItem} />
            </CardContent>
          </Card>

          {/* List Items Section */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    Your Items
                  </div>
                </CardTitle>
                {listItems.length > 0 && totalMatchedDeals > 0 && (
                  <Link href="/deals/matches">
                    <Button className="bg-green-600 hover:bg-green-700">
                      <Tag className="w-4 h-4 mr-2" />
                      View All Deals
                    </Button>
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {listItems.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 mb-2 font-medium">Your list is empty</p>
                  <p className="text-sm text-gray-400">
                    Start adding items to find matching deals
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {listItems.map((item) => {
                    const isExpanded = expandedItems.has(item.id);
                    const dealCount = item.matchingDeals?.length || 0;
                    const displayName = item.itemVariant
                      ? `${item.itemName} (${item.itemVariant})`
                      : item.itemName;

                    return (
                      <div
                        key={item.id}
                        className="border rounded-lg hover:shadow-md transition-all duration-200"
                      >
                        {/* Item Row */}
                        <div className="flex items-center gap-3 p-4">
                          {/* Checkbox */}
                          <div
                            onClick={() => handleToggleChecked(item.id, item.checked)}
                            className="cursor-pointer"
                          >
                            <Checkbox
                              checked={item.checked}
                              className="w-5 h-5"
                            />
                          </div>

                          {/* Item Info */}
                          <div className="flex-1 min-w-0">
                            <h4
                              className={`font-semibold text-gray-900 ${
                                item.checked ? 'line-through text-gray-400' : ''
                              }`}
                            >
                              {displayName}
                            </h4>
                            {item.category && (
                              <p className="text-sm text-gray-500">{item.category}</p>
                            )}
                          </div>

                          {/* Deal Badge */}
                          {dealCount > 0 && (
                            <DealBadge count={dealCount} />
                          )}

                          {/* Quantity Controls */}
                          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                              className="h-8 w-8 p-0 hover:bg-gray-200"
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                              className="h-8 w-8 p-0 hover:bg-gray-200"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>

                          {/* Expand/Delete Controls */}
                          <div className="flex items-center gap-1">
                            {dealCount > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleItemExpanded(item.id)}
                                className="h-8 w-8 p-0"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirmId(item.id)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Expanded Deal Preview */}
                        {isExpanded && dealCount > 0 && (
                          <div className="px-4 pb-4 pt-0 border-t bg-gray-50">
                            <p className="text-sm font-semibold text-gray-700 mb-3 mt-3">
                              Matching Deals:
                            </p>
                            <div className="space-y-2">
                              {item.matchingDeals?.slice(0, 3).map((deal) => (
                                <div
                                  key={deal.id}
                                  className="flex items-center justify-between p-3 bg-white rounded-lg border"
                                >
                                  <div className="flex-1">
                                    <p className="font-medium text-gray-900 text-sm">
                                      {deal.productName}
                                    </p>
                                    <p className="text-xs text-gray-500">{deal.storeName}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-lg font-bold text-green-600">
                                      ${deal.salePrice.toFixed(2)}
                                    </p>
                                    {deal.regularPrice && deal.savingsPercent && (
                                      <p className="text-xs text-gray-500 line-through">
                                        ${deal.regularPrice.toFixed(2)}
                                      </p>
                                    )}
                                    {deal.savingsPercent && (
                                      <p className="text-xs text-orange-600 font-medium">
                                        Save {deal.savingsPercent}%
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                            {dealCount > 3 && (
                              <Link href="/deals/matches">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full mt-3 text-green-600 border-green-600 hover:bg-green-50"
                                >
                                  View all {dealCount} deals
                                </Button>
                              </Link>
                            )}
                          </div>
                        )}

                        {/* Delete Confirmation */}
                        {deleteConfirmId === item.id && (
                          <div className="px-4 pb-4 pt-0 border-t bg-red-50">
                            <div className="flex items-center justify-between py-3">
                              <p className="text-sm text-gray-700">
                                Remove <strong>{displayName}</strong> from your list?
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setDeleteConfirmId(null)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Call-to-Action Section */}
          {listItems.length > 0 && totalMatchedDeals > 0 && (
            <div className="p-6 bg-gradient-to-r from-green-50 to-orange-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900 mb-1">
                    Ready to save on your groceries?
                  </p>
                  <p className="text-sm text-gray-600">
                    We found {totalMatchedDeals} matching {totalMatchedDeals === 1 ? 'deal' : 'deals'} for items on your list
                  </p>
                </div>
                <Link href="/deals/matches">
                  <Button className="bg-green-600 hover:bg-green-700 shadow-md">
                    <Tag className="w-4 h-4 mr-2" />
                    View Matched Deals
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
