"use client";

import { useState, useEffect, useCallback } from "react";
import { useLazyQuery, useMutation } from "@apollo/client/react";
import { Search, Plus, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  SEARCH_PRODUCTS,
  ADD_GROCERY_LIST_ITEM,
} from "@/lib/graphql/queries";
import Image from "next/image";
import Link from "next/link";
import { PriceRangeBadge } from "@/components/ui/PriceRangeBadge";
import { StorePriceList } from "@/components/ui/StorePriceList";
import { calculatePriceRange } from "@/lib/utils/price-helpers";

interface Store {
  storeId: string;
  chainName: string;
  storeName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

interface StorePrice {
  priceId: string;
  upc: string;
  storeId: string;
  price: number;
  dealType?: string;
  lastUpdated: string;
  store: Store;
}

interface Product {
  upc: string;
  name: string;
  brand?: string;
  size?: string;
  imageUrl?: string;
  category?: string;
  storePrices?: StorePrice[];
}

export default function SearchPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [addSuccess, setAddSuccess] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  const [searchProducts, { loading, data, error }] =
    useLazyQuery(SEARCH_PRODUCTS);
  const [addToList, { loading: addingToList }] = useMutation(
    ADD_GROCERY_LIST_ITEM
  );

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?returnUrl=/search');
    }
  }, [isAuthenticated, router]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setCurrentPage(1); // Reset to page 1 on new search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Execute search when debounced query or page changes
  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      const offset = (currentPage - 1) * 20;
      searchProducts({ variables: { query: debouncedQuery, limit: 20, offset } });
    }
  }, [debouncedQuery, currentPage, searchProducts]);

  const toggleProductExpanded = (upc: string) => {
    setExpandedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(upc)) {
        newSet.delete(upc);
      } else {
        newSet.add(upc);
      }
      return newSet;
    });
  };

  const handleAddToList = useCallback(
    async (productUpc: string) => {
      if (!isAuthenticated || !user?.userId) {
        return; // Button should be disabled anyway
      }

      try {
        await addToList({
          variables: {
            userId: user.userId,
            upc: productUpc,
            quantity: 1,
          },
        });
        setAddSuccess(true);
        setTimeout(() => setAddSuccess(false), 3000);
      } catch (err) {
        console.error("Failed to add product:", err);
        alert("Failed to add product to list");
      }
    },
    [addToList, isAuthenticated, user]
  );

  // Extract pagination data
  const searchResult = (data as any)?.searchProducts;
  const products: Product[] = searchResult?.products || [];
  const totalCount = searchResult?.totalCount || 0;
  const hasNextPage = searchResult?.hasNextPage || false;
  const hasPreviousPage = searchResult?.hasPreviousPage || false;
  const totalPages = searchResult?.totalPages || 0;

  // Filter and sort products
  const filteredProducts = products
    .filter((product) => {
      // Store filtering would be implemented when store data is available
      if (selectedStore === "all") return true;
      return true; // Placeholder
    })
    .sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "brand") {
        return (a.brand || "").localeCompare(b.brand || "");
      }
      return 0;
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Product Search</h1>
          <p className="mt-2 text-gray-500">
            Search for products across multiple stores to find the best deals
          </p>
        </div>

        {/* Success Alert */}
        {addSuccess && (
          <div className="mb-6">
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <AlertDescription>Product added to your list!</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Auth Notice */}
        {!isAuthenticated && (
          <div className="mb-6">
            <Alert>
              <AlertDescription>
                <Link href="/login" className="text-green-600 hover:text-green-700 font-medium hover:underline">
                  Sign in
                </Link>{" "}
                to add products to your grocery list
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search for products (e.g., milk, bread, eggs)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 pl-10 pr-4"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-3">
            {/* Store Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Store:</span>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2"
              >
                <option value="all">All Stores</option>
                <option value="target">Target</option>
                <option value="shoprite">ShopRite</option>
              </select>
            </div>

            {/* Sort Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2"
              >
                <option value="name">Name</option>
                <option value="brand">Brand</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </div>

          {filteredProducts.length > 0 && (
            <div className="text-sm text-gray-500">
              Showing {((currentPage - 1) * 20) + 1}-{Math.min(currentPage * 20, totalCount)} of {totalCount} products
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <>
            <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                <div>
                  <p className="font-medium text-blue-900">
                    Searching Target and ShopRite...
                  </p>
                  <p className="text-sm text-blue-700">
                    This may take 5-10 seconds as we scrape live prices
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-4">
                    <Skeleton className="mx-auto mb-4 h-20 w-20 rounded-lg" />
                    <Skeleton className="mb-2 h-5 w-full" />
                    <Skeleton className="mb-2 h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardContent>
                  <CardFooter className="p-4 pt-0">
                    <Skeleton className="h-10 w-full" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            <p className="font-medium">Error loading products</p>
            <p className="mt-1 text-sm">{error.message}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && searchQuery.trim() === "" && (
          <div className="py-12 text-center">
            <Search className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              Start searching
            </h3>
            <p className="mt-2 text-gray-500">
              Enter a product name to search across stores
            </p>
          </div>
        )}

        {/* No Results */}
        {!loading &&
          !error &&
          searchQuery.trim() !== "" &&
          filteredProducts.length === 0 && (
            <div className="py-12 text-center">
              <Search className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No products found
              </h3>
              <p className="mt-2 text-gray-500">
                Try searching with different keywords
              </p>
            </div>
          )}

        {/* Products Grid */}
        {!loading && !error && filteredProducts.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => {
              const priceRange = calculatePriceRange(product.storePrices || []);
              const isExpanded = expandedProducts.has(product.upc);
              const hasMultiplePrices = (product.storePrices?.length || 0) > 1;

              return (
                <Card
                  key={product.upc}
                  className="overflow-hidden transition-shadow hover:shadow-md"
                >
                  <CardContent className="p-4">
                    {/* Product Image */}
                    <div className="mb-4 flex h-20 items-center justify-center">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          width={80}
                          height={80}
                          className="rounded-lg object-contain"
                        />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-gray-100">
                          <span className="text-2xl text-gray-400">📦</span>
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <h3 className="mb-1 line-clamp-2 text-base font-semibold text-gray-900">
                      {product.name}
                    </h3>
                    {product.brand && (
                      <p className="mb-1 line-clamp-1 text-sm text-gray-500">
                        {product.brand}
                      </p>
                    )}
                    {product.size && (
                      <p className="text-xs text-gray-400 mb-2">{product.size}</p>
                    )}

                    {/* Price Information - Unified Display */}
                    {product.storePrices && product.storePrices.length > 0 ? (
                      <div className="mt-3 border-t pt-3">
                        {!isExpanded && hasMultiplePrices ? (
                          // Collapsed: Show price range
                          <div
                            className="cursor-pointer"
                            onClick={() => toggleProductExpanded(product.upc)}
                          >
                            <PriceRangeBadge priceRange={priceRange} />
                            <button className="mt-2 text-xs text-blue-600 hover:underline">
                              View all stores →
                            </button>
                          </div>
                        ) : (
                          // Expanded or single price: Show all store prices
                          <div>
                            <StorePriceList
                              storePrices={product.storePrices}
                              showDealBadge={true}
                              variant="compact"
                            />
                            {hasMultiplePrices && (
                              <button
                                className="mt-2 text-xs text-blue-600 hover:underline"
                                onClick={() => toggleProductExpanded(product.upc)}
                              >
                                Show less ↑
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3 border-t pt-3">
                        <p className="text-xs text-gray-400">No pricing available</p>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="p-4 pt-0">
                    {isAuthenticated ? (
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() => handleAddToList(product.upc)}
                        disabled={addingToList}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add to List
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        variant="outline"
                        asChild
                      >
                        <Link href="/login?returnUrl=/search">
                          Sign in to add
                        </Link>
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && filteredProducts.length > 0 && totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={!hasPreviousPage}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <div className="flex items-center gap-1">
              {/* Show first page */}
              {currentPage > 3 && (
                <>
                  <Button
                    variant={currentPage === 1 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                  >
                    1
                  </Button>
                  {currentPage > 4 && <span className="px-2 text-gray-500">...</span>}
                </>
              )}

              {/* Show pages around current page */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  return page === currentPage ||
                         (page >= currentPage - 2 && page <= currentPage + 2);
                })
                .map(page => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className={currentPage === page ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    {page}
                  </Button>
                ))}

              {/* Show last page */}
              {currentPage < totalPages - 2 && (
                <>
                  {currentPage < totalPages - 3 && <span className="px-2 text-gray-500">...</span>}
                  <Button
                    variant={currentPage === totalPages ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                  >
                    {totalPages}
                  </Button>
                </>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={!hasNextPage}
              className="flex items-center gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
