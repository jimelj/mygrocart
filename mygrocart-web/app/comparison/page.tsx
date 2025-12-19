"use client";

import React from 'react';
import { useQuery } from '@apollo/client/react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, DollarSign, TrendingDown, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { COMPARE_PRICES, GET_USER_GROCERY_LISTS } from '@/lib/graphql/queries';
import { SavingsBanner } from '@/components/ui/SavingsBanner';

interface Store {
  storeId: string;
  chainName: string;
  storeName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

interface MissingItem {
  name: string;
  upc: string;
  quantity: number;
}

interface StoreComparison {
  store: Store;
  totalCost: number;
  itemCount: number;
  totalItems: number;
  completionPercentage: number;
  missingItems: MissingItem[];
  isCheapest: boolean;
  savings: number;
}

interface PriceComparisonResult {
  userId: string;
  stores: StoreComparison[];
  cheapestStore: string | null;
  maxSavings: number;
  message: string;
}

// GraphQL Response Types
interface GetUserGroceryListsResponse {
  getUserGroceryLists: unknown[];
}

interface ComparePricesResponse {
  comparePrices: PriceComparisonResult;
}

export default function ComparisonPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const { data: groceryListData } = useQuery<GetUserGroceryListsResponse>(GET_USER_GROCERY_LISTS, {
    variables: { userId: user?.userId },
    skip: !user?.userId
  });

  const { data: priceComparisonData, loading: comparisonLoading, refetch } = useQuery<ComparePricesResponse>(COMPARE_PRICES, {
    variables: { userId: user?.userId },
    skip: !user?.userId,
    fetchPolicy: 'network-only' // Always fetch fresh prices, don't use cache
  });

  const groceryList = groceryListData?.getUserGroceryLists || [];
  const priceComparisonResult = priceComparisonData?.comparePrices;
  const priceComparison: StoreComparison[] = priceComparisonResult?.stores || [];

  if (!isAuthenticated || !user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-6 h-6 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">Price Comparison</h1>
              </div>
              <p className="text-gray-600">
                Comparing {groceryList.length} items across nearby stores
              </p>
            </div>
            <Link href="/list">
              <Button variant="outline">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Edit List
              </Button>
            </Link>
          </div>
        </div>

        {comparisonLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Comparing prices across stores...</p>
          </div>
        ) : groceryList.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No items in your list</h3>
              <p className="text-gray-500 mb-4">
                Add items to your shopping list to see price comparisons
              </p>
              <Link href="/list">
                <Button className="bg-green-600 hover:bg-green-700">
                  Add Items to List
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : priceComparison.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No price data available</h3>
              <p className="text-gray-500 mb-4">
                We don&apos;t have pricing information for your items yet
              </p>
              <Button onClick={() => refetch()} className="bg-green-600 hover:bg-green-700">
                Refresh Prices
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Store Comparison Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {priceComparison.map((comp: StoreComparison) => {
                // Calculate savings relative to most expensive store
                const maxTotal = Math.max(...priceComparison.map(c => c.totalCost));
                const savingsVsMax = maxTotal - comp.totalCost;

                return (
                  <Card
                    key={comp.store.storeId}
                    className={`${
                      comp.isCheapest
                        ? 'ring-2 ring-green-500 shadow-lg'
                        : ''
                    } transition-all hover:shadow-xl`}
                  >
                    <CardHeader>
                      {comp.isCheapest && (
                        <Badge className="w-fit mb-2 bg-green-500 hover:bg-green-600">
                          Best Deal!
                        </Badge>
                      )}
                      <CardTitle className="text-xl">{comp.store.chainName}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {comp.store.storeName}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 mb-4">
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="text-gray-600">Total Cost:</span>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900">
                              ${comp.totalCost.toFixed(2)}
                            </div>
                            {!comp.isCheapest && savingsVsMax > 0 && (
                              <div className="text-xs text-red-600">
                                (+${savingsVsMax.toFixed(2)})
                              </div>
                            )}
                            {comp.isCheapest && (
                              <div className="text-xs text-green-600 font-medium">
                                (Cheapest!)
                              </div>
                            )}
                          </div>
                        </div>
                        {savingsVsMax > 0 && (
                          <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                            <span className="text-gray-600">You Save:</span>
                            <span className="text-xl font-bold text-green-600">
                              ${savingsVsMax.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Completion Info */}
                      {comp.completionPercentage < 100 && (
                        <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                          <p className="text-yellow-800">
                            {comp.itemCount} of {comp.totalItems} items available ({comp.completionPercentage.toFixed(0)}%)
                          </p>
                        </div>
                      )}

                      <Button
                        className={`w-full ${
                          comp.isCheapest
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-gray-600 hover:bg-gray-700'
                        }`}
                      >
                        Shop Here
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Savings Summary */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-green-600" />
                  Savings Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                    <div className="text-3xl font-bold text-green-600 mb-1">
                      ${(priceComparisonResult?.maxSavings || 0).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">Maximum Savings</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                    <div className="text-3xl font-bold text-green-600 mb-1">
                      {priceComparison.length > 0 && priceComparisonResult?.maxSavings
                        ? Math.round(
                            (priceComparisonResult.maxSavings /
                              Math.max(...priceComparison.map(c => c.totalCost))) *
                              100
                          )
                        : 0}
                      %
                    </div>
                    <div className="text-sm text-gray-600">Percentage Saved</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                    <div className="text-3xl font-bold text-green-600 mb-1">
                      {priceComparison.length}
                    </div>
                    <div className="text-sm text-gray-600">Stores Compared</div>
                  </div>
                </div>

                {priceComparisonResult?.message && (
                  <div className="mt-6 p-4 bg-white rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Shopping Tip</h4>
                    <p className="text-sm text-gray-600">
                      {priceComparisonResult.message}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Savings Banner */}
            {priceComparisonResult?.cheapestStore && priceComparisonResult?.maxSavings > 0 && (
              <SavingsBanner
                cheapestStore={priceComparisonResult.cheapestStore}
                maxSavings={priceComparisonResult.maxSavings}
                variant="default"
              />
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex gap-4 justify-center">
              <Link href="/list">
                <Button variant="outline">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Edit Shopping List
                </Button>
              </Link>
              <Button onClick={() => refetch()} className="bg-green-600 hover:bg-green-700">
                Refresh Prices
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
