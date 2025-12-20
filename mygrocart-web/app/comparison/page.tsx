"use client";

import React from 'react';
import { useQuery } from '@apollo/client/react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Store, TrendingDown, ShoppingCart, Tag, ChevronDown, ChevronUp, Percent } from 'lucide-react';
import Link from 'next/link';
import { GET_STORE_DEALS_RANKING, GET_MY_LIST_WITH_DEALS } from '@/lib/graphql/queries';

interface MatchedDealSummary {
  listItemName: string;
  dealProductName: string;
  salePrice: number;
  regularPrice?: number;
  lowestPrice?: number;
  savings?: number;
  savingsPercent?: number;
  isBestPrice?: boolean;
}

interface StoreDealsRanking {
  storeName: string;
  matchedItemCount: number;
  totalListItems: number;
  matchPercentage: number;
  totalCost: number;
  totalSavings: number;
  deals: MatchedDealSummary[];
  isBestValue: boolean;
}

interface StoreDealsRankingResult {
  rankings: StoreDealsRanking[];
  bestStore: string | null;
  totalPotentialSavings: number;
  listItemCount: number;
  message: string;
}

interface GetStoreDealsRankingResponse {
  getStoreDealsRanking: StoreDealsRankingResult;
}

interface GetMyListResponse {
  getMyListWithDeals: Array<{ id: string }>;
}

export default function ComparisonPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [expandedStore, setExpandedStore] = React.useState<string | null>(null);

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const { data: listData } = useQuery<GetMyListResponse>(GET_MY_LIST_WITH_DEALS, {
    variables: { userId: user?.userId },
    skip: !user?.userId
  });

  const { data: rankingData, loading: rankingLoading, refetch } = useQuery<GetStoreDealsRankingResponse>(
    GET_STORE_DEALS_RANKING,
    {
      variables: { userId: user?.userId },
      skip: !user?.userId,
      fetchPolicy: 'network-only'
    }
  );

  const listItemCount = listData?.getMyListWithDeals?.length || 0;
  const result = rankingData?.getStoreDealsRanking;
  const rankings = result?.rankings || [];

  if (!isAuthenticated || !user) {
    return null;
  }

  const toggleExpand = (storeName: string) => {
    setExpandedStore(expandedStore === storeName ? null : storeName);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Store className="w-6 h-6 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">Compare Store Prices</h1>
              </div>
              <p className="text-gray-600">
                Find the lowest total cost for your {listItemCount} list items
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

        {/* Loading State */}
        {rankingLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Finding the best deals for your list...</p>
          </div>
        )}

        {/* Empty List State */}
        {!rankingLoading && listItemCount === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No items in your list</h3>
              <p className="text-gray-500 mb-4">
                Add items to your shopping list to see which stores have the best deals
              </p>
              <Link href="/list">
                <Button className="bg-green-600 hover:bg-green-700">
                  Add Items to List
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* No Deals Found State */}
        {!rankingLoading && listItemCount > 0 && rankings.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Tag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No matching deals found</h3>
              <p className="text-gray-500 mb-4">
                {result?.message || "We couldn't find any current deals matching your list items"}
              </p>
              <Button onClick={() => refetch()} className="bg-green-600 hover:bg-green-700">
                Refresh
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Store Rankings */}
        {!rankingLoading && rankings.length > 0 && (
          <>
            {/* Summary Banner */}
            {result?.bestStore && rankings.length > 0 && (
              <Card className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-700 font-medium">Lowest Cost Store</p>
                      <p className="text-2xl font-bold text-green-800">{result.bestStore}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-green-700">Total Cost</p>
                      <p className="text-2xl font-bold text-green-600">
                        ${rankings[0]?.totalCost?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Store Cards */}
            <div className="space-y-4">
              {rankings.map((store, index) => (
                <Card
                  key={store.storeName}
                  className={`overflow-hidden transition-all ${
                    store.isBestValue ? 'ring-2 ring-green-500 shadow-lg' : ''
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          index === 0 ? 'bg-green-500' : index === 1 ? 'bg-blue-500' : 'bg-gray-400'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <CardTitle className="text-xl flex items-center gap-2">
                            {store.storeName}
                            {store.isBestValue && (
                              <Badge className="bg-green-500 hover:bg-green-600">Best Value</Badge>
                            )}
                          </CardTitle>
                          <CardDescription>
                            {store.matchedItemCount} of {store.totalListItems} items on sale
                          </CardDescription>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          ${store.totalCost.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500">total cost</div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Deal Coverage</span>
                        <span className="font-medium">{store.matchPercentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full ${
                            store.matchPercentage >= 50 ? 'bg-green-500' : 'bg-yellow-500'
                          }`}
                          style={{ width: `${store.matchPercentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Expand/Collapse Deals */}
                    <Button
                      variant="ghost"
                      className="w-full justify-between"
                      onClick={() => toggleExpand(store.storeName)}
                    >
                      <span className="flex items-center gap-2">
                        <Tag className="w-4 h-4" />
                        View {store.deals.length} matching deals
                      </span>
                      {expandedStore === store.storeName ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>

                    {/* Deals List (Expanded) */}
                    {expandedStore === store.storeName && (
                      <div className="mt-4 space-y-3 border-t pt-4">
                        {store.deals.map((deal, dealIndex) => (
                          <div
                            key={dealIndex}
                            className={`flex items-center justify-between p-3 rounded-lg ${
                              deal.isBestPrice ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                            }`}
                          >
                            <div>
                              <p className="font-medium text-gray-900 flex items-center gap-2">
                                {deal.listItemName}
                                {deal.isBestPrice && (
                                  <Badge className="bg-green-500 text-xs">Best Price</Badge>
                                )}
                              </p>
                              <p className="text-sm text-gray-500">{deal.dealProductName}</p>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${deal.isBestPrice ? 'text-green-600' : 'text-blue-600'}`}>
                                ${deal.salePrice.toFixed(2)}
                              </p>
                              {deal.regularPrice && (
                                <p className="text-sm text-gray-500 line-through">
                                  ${deal.regularPrice.toFixed(2)}
                                </p>
                              )}
                              {!deal.isBestPrice && deal.lowestPrice && deal.salePrice > deal.lowestPrice && (
                                <p className="text-xs text-orange-600">
                                  ${(deal.salePrice - deal.lowestPrice).toFixed(2)} more
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Summary Card */}
            <Card className="mt-8 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-blue-600" />
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                    <div className="text-3xl font-bold text-green-600 mb-1">
                      ${rankings[0]?.totalCost?.toFixed(2) || '0.00'}
                    </div>
                    <div className="text-sm text-gray-600">Lowest Total Cost</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                    <div className="text-3xl font-bold text-blue-600 mb-1">
                      {rankings.length}
                    </div>
                    <div className="text-sm text-gray-600">Stores Compared</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                    <div className="text-3xl font-bold text-orange-600 mb-1">
                      {rankings.length > 1
                        ? `$${(rankings[rankings.length - 1]?.totalCost - rankings[0]?.totalCost).toFixed(2)}`
                        : '$0.00'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {rankings.length > 1 ? 'Saved vs Highest' : 'Price Difference'}
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-white rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Shopping Tip</h4>
                  <p className="text-sm text-gray-600">
                    {rankings.length > 1
                      ? `${rankings[0].storeName} has the lowest total cost ($${rankings[0].totalCost.toFixed(2)}) for your ${rankings[0].matchedItemCount} matched items. You would pay $${(rankings[rankings.length - 1]?.totalCost - rankings[0]?.totalCost).toFixed(2)} more at ${rankings[rankings.length - 1]?.storeName}.`
                      : result?.message || 'Check back when more stores have matching deals for your items.'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="mt-6 flex gap-4 justify-center">
              <Link href="/list">
                <Button variant="outline">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Edit Shopping List
                </Button>
              </Link>
              <Link href="/deals/matches">
                <Button className="bg-green-600 hover:bg-green-700">
                  <Tag className="w-4 h-4 mr-2" />
                  View All Matched Deals
                </Button>
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
