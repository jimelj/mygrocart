"use client";

import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Plus, Minus, ShoppingCart, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import {
  SEARCH_PRODUCTS,
  GET_USER_GROCERY_LISTS,
  ADD_GROCERY_LIST_ITEM,
  UPDATE_GROCERY_LIST_ITEM,
  REMOVE_GROCERY_LIST_ITEM
} from '@/lib/graphql/queries';
import { REQUEST_PRICE_UPDATE } from '@/lib/graphql/mutations';
import { EmptySearchState } from '@/components/search/EmptySearchState';
import { PriceFreshnessBadge } from '@/components/ui/PriceFreshnessBadge';
import { StorePriceList } from '@/components/ui/StorePriceList';
import { useToast } from '@/components/ui/use-toast';
import { calculateCheapestSubtotal } from '@/lib/utils/price-helpers';

interface Product {
  upc: string;
  name: string;
  brand?: string;
  size?: string;
  imageUrl?: string;
  priceAge?: string;
  lastPriceUpdate?: string;
  storePrices?: StorePrice[];
}

interface StorePrice {
  storeId: string;
  storeName: string;
  price: number;
  dealType?: string;
}

interface GroceryListItem {
  listItemId: string;
  upc: string;
  quantity: number;
  product?: Product;
}

// GraphQL Response Types
interface SearchProductsResponse {
  searchProducts: {
    products: Product[];
    totalCount: number;
  };
}

interface GetUserGroceryListsResponse {
  getUserGroceryLists: GroceryListItem[];
}

export default function ShoppingListPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const toggleItemExpanded = (listItemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(listItemId)) {
        newSet.delete(listItemId);
      } else {
        newSet.add(listItemId);
      }
      return newSet;
    });
  };

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // GraphQL Queries
  const { data: productsData, loading: searchLoading } = useQuery<SearchProductsResponse>(SEARCH_PRODUCTS, {
    variables: { query: searchQuery },
    skip: !searchQuery
  });

  const { data: groceryListData, refetch: refetchGroceryList } = useQuery<GetUserGroceryListsResponse>(GET_USER_GROCERY_LISTS, {
    variables: { userId: user?.userId },
    skip: !user?.userId
  });

  // GraphQL Mutations
  const [addGroceryListItem] = useMutation(ADD_GROCERY_LIST_ITEM);
  const [updateGroceryListItem] = useMutation(UPDATE_GROCERY_LIST_ITEM);
  const [removeGroceryListItem] = useMutation(REMOVE_GROCERY_LIST_ITEM);
  const [requestPriceUpdate] = useMutation(REQUEST_PRICE_UPDATE);

  const handleAddProduct = async (product: Product) => {
    try {
      await addGroceryListItem({
        variables: {
          userId: user?.userId,
          upc: product.upc,
          quantity: 1
        }
      });
      refetchGroceryList();
    } catch (error) {
      console.error('Error adding product:', error);
    }
  };

  const handleUpdateQuantity = async (listItemId: string, quantity: number) => {
    try {
      if (quantity <= 0) {
        await removeGroceryListItem({
          variables: { listItemId }
        });
      } else {
        await updateGroceryListItem({
          variables: { listItemId, quantity }
        });
      }
      refetchGroceryList();
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  const handleRequestPriceUpdate = async (upc: string) => {
    try {
      await requestPriceUpdate({
        variables: { upc, priority: 'normal' }
      });
      toast({
        title: 'Update requested!',
        description: 'We\'ll refresh the price for this product soon.',
        variant: 'success',
        duration: 3000
      });
    } catch (error) {
      console.error('Error requesting price update:', error);
      toast({
        title: 'Request failed',
        description: 'Could not request price update. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const groceryList: GroceryListItem[] = groceryListData?.getUserGroceryLists || [];

  if (!isAuthenticated || !user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="w-6 h-6 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-900">My Shopping List</h1>
          </div>
          <p className="text-gray-600">Add products and find the best deals</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Product Search Section */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Search Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search for products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {searchLoading && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                    <p className="mt-2 text-gray-500">Searching...</p>
                  </div>
                )}

                {productsData?.searchProducts?.products && productsData.searchProducts.products.length > 0 && (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {(productsData.searchProducts.products as Product[]).map((product: Product) => (
                      <div
                        key={product.upc}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          {product.imageUrl ? (
                            <Image
                              src={product.imageUrl}
                              alt={product.name}
                              width={48}
                              height={48}
                              className="rounded object-contain"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                              <span className="text-2xl">📦</span>
                            </div>
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{product.name}</h4>
                            <p className="text-sm text-gray-600">
                              {product.brand} {product.size && `- ${product.size}`}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              {product.priceAge && (
                                <PriceFreshnessBadge
                                  priceAge={product.priceAge}
                                  lastPriceUpdate={product.lastPriceUpdate}
                                />
                              )}
                              {product.priceAge && product.priceAge.includes('day') && parseInt(product.priceAge) >= 8 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRequestPriceUpdate(product.upc)}
                                  className="text-xs"
                                >
                                  Request Update
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleAddProduct(product)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {searchQuery && productsData?.searchProducts?.products?.length === 0 && !searchLoading && (
                  <EmptySearchState searchTerm={searchQuery} />
                )}

                {!searchQuery && (
                  <div className="text-center py-8 text-gray-500">
                    Start typing to search for products
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Shopping List Section */}
          <div>
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" />
                      Your Shopping List ({groceryList.length} items)
                    </div>
                  </CardTitle>
                  {groceryList.length > 0 && (
                    <Link href="/comparison">
                      <Button className="bg-green-600 hover:bg-green-700">
                        Compare Prices
                      </Button>
                    </Link>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {groceryList.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 mb-2">Your shopping list is empty</p>
                    <p className="text-sm text-gray-400">
                      Search for products to add them to your list
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {groceryList.map((item: GroceryListItem) => {
                      const isExpanded = expandedItems.has(item.listItemId);
                      const storePrices = item.product?.storePrices;
                      const hasStorePrices = storePrices && storePrices.length > 0;
                      const { subtotal, cheapestStore } = hasStorePrices
                        ? calculateCheapestSubtotal(item.quantity, storePrices)
                        : { subtotal: 0, cheapestStore: 'N/A' };

                      return (
                        <div
                          key={item.listItemId}
                          className="border rounded-lg hover:shadow-sm transition-shadow"
                        >
                          {/* Item Header */}
                          <div className="flex items-center justify-between p-3">
                            <div className="flex items-center space-x-3 flex-1">
                              {item.product?.imageUrl ? (
                                <Image
                                  src={item.product.imageUrl}
                                  alt={item.product.name || 'Product'}
                                  width={48}
                                  height={48}
                                  className="rounded object-contain"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                                  <span className="text-2xl">📦</span>
                                </div>
                              )}
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">
                                  {item.product?.name || 'Unknown Product'}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  {item.product?.brand} {item.product?.size && `- ${item.product.size}`}
                                </p>
                                {hasStorePrices && !isExpanded && (
                                  <p className="text-xs text-green-600 mt-1">
                                    Best at {cheapestStore}: ${subtotal.toFixed(2)}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateQuantity(item.listItemId, item.quantity - 1)}
                                className="h-8 w-8 p-0"
                              >
                                <Minus className="w-4 h-4" />
                              </Button>
                              <span className="w-8 text-center font-medium">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateQuantity(item.listItemId, item.quantity + 1)}
                                className="h-8 w-8 p-0"
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                              {hasStorePrices && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleItemExpanded(item.listItemId)}
                                  className="h-8 w-8 p-0"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Expanded Price Details */}
                          {isExpanded && hasStorePrices && (
                            <div className="px-3 pb-3 pt-0 border-t bg-gray-50">
                              <div className="mt-3">
                                <p className="text-sm font-semibold text-gray-700 mb-2">
                                  Prices per unit:
                                </p>
                                <StorePriceList
                                  storePrices={item.product.storePrices}
                                  showDealBadge={true}
                                  variant="default"
                                />
                                <div className="mt-3 pt-3 border-t flex justify-between items-center">
                                  <span className="text-sm text-gray-600">
                                    Best subtotal ({item.quantity} × cheapest):
                                  </span>
                                  <span className="text-lg font-bold text-green-600">
                                    ${subtotal.toFixed(2)} at {cheapestStore}
                                  </span>
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

            {groceryList.length > 0 && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-green-900">Ready to compare prices?</p>
                    <p className="text-sm text-green-700">
                      See which store offers the best deal on your list
                    </p>
                  </div>
                  <Link href="/comparison">
                    <Button className="bg-green-600 hover:bg-green-700">
                      Compare Now
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
