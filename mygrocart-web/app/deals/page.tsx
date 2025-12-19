"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useAuth } from '@/lib/auth-context';
import { GET_DEALS_NEAR_ME } from '@/lib/graphql/queries';
import { ADD_LIST_ITEM } from '@/lib/graphql/mutations';
import { DealCard } from '@/components/deals/DealCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, Tag, CheckCircle, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Deal {
  id: string;
  productName: string;
  productBrand?: string;
  productCategory?: string;
  salePrice: number;
  regularPrice?: number;
  unit?: string;
  dealType: string;
  quantity?: string;
  storeName: string;
  savings?: number;
  savingsPercent?: number;
  validFrom?: string;
  validTo?: string;
}

interface GetDealsNearMeResponse {
  getDealsNearMe: {
    deals: Deal[];
    totalCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    currentPage: number;
    totalPages: number;
  };
}

const CATEGORIES = [
  'All',
  'Dairy',
  'Meat',
  'Produce',
  'Bakery',
  'Pantry',
  'Beverages',
  'Snacks',
  'Frozen',
];

const STORES = [
  'All Stores',
  'ShopRite',
  'Target',
  'ACME',
  'Stop & Shop',
  'Walmart',
];

export default function DealsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStore, setSelectedStore] = useState('All Stores');
  const [sortBy, setSortBy] = useState('savings');
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const [showSuccess, setShowSuccess] = useState(false);

  const zipCode = user?.zipCode || '07001';

  // GraphQL query - must be before any conditional returns
  const { data, loading, error } = useQuery<GetDealsNearMeResponse>(GET_DEALS_NEAR_ME, {
    variables: {
      zipCode,
      category: selectedCategory === 'All' ? undefined : selectedCategory,
      limit: 100,
    },
    skip: !isAuthenticated || !user,
  });

  // Mutation to add items to shopping list
  const [addListItem, { loading: addingItem }] = useMutation(ADD_LIST_ITEM);

  // Handle adding a deal to the shopping list
  const handleAddToList = async (deal: Deal) => {
    try {
      await addListItem({
        variables: {
          itemName: deal.productName,
          itemVariant: deal.productBrand || undefined,
          category: deal.productCategory || undefined,
          quantity: 1,
        },
      });
      setAddedItems((prev) => new Set(prev).add(deal.id));
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to add to list:', err);
    }
  };

  // Redirect if not authenticated (after loading completes)
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user)) {
      router.push('/login');
    }
  }, [isAuthenticated, user, router, isLoading]);

  // Show loading or nothing while checking auth
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

  const deals: Deal[] = data?.getDealsNearMe?.deals || [];

  // Filter deals by search query and store
  const filteredDeals = deals.filter((deal: Deal) => {
    const matchesSearch = searchQuery
      ? deal.productName.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesStore =
      selectedStore === 'All Stores'
        ? true
        : deal.storeName === selectedStore;
    return matchesSearch && matchesStore;
  });

  // Sort deals
  const sortedDeals = [...filteredDeals].sort((a: Deal, b: Deal) => {
    switch (sortBy) {
      case 'savings':
        return (b.savingsPercent || 0) - (a.savingsPercent || 0);
      case 'price':
        return a.salePrice - b.salePrice;
      case 'store':
        return a.storeName.localeCompare(b.storeName);
      default:
        return 0;
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-6 h-6 text-orange-500" />
            <h1 className="text-3xl font-bold text-gray-900">
              Deals Near You
            </h1>
          </div>
          <p className="text-gray-600 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            {sortedDeals.length} deals found in {zipCode}
          </p>
        </div>

        {/* Success message */}
        {showSuccess && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Item added to your shopping list!
            </AlertDescription>
          </Alert>
        )}

        {/* Search and filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search deals (e.g., milk, bread, chicken)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((category) => (
                  <Badge
                    key={category}
                    variant={
                      selectedCategory === category ? 'default' : 'outline'
                    }
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Store
              </label>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger>
                  <SelectValue placeholder="All Stores" />
                </SelectTrigger>
                <SelectContent>
                  {STORES.map((store) => (
                    <SelectItem key={store} value={store}>
                      {store}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Sort By
              </label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="savings">Savings %</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="store">Store</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600 font-medium">
              Error loading deals: {error.message}
            </p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && sortedDeals.length === 0 && (
          <div className="bg-white rounded-lg p-12 text-center">
            <Filter className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No deals found
            </h3>
            <p className="text-gray-600 mb-6">
              Try adjusting your filters or search query
            </p>
            <Button onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
              setSelectedStore('All Stores');
            }}>
              Clear Filters
            </Button>
          </div>
        )}

        {/* Deals grid */}
        {!loading && !error && sortedDeals.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedDeals.map((deal: Deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                onClick={() => {}}
                onAddToList={
                  addedItems.has(deal.id)
                    ? undefined
                    : () => handleAddToList(deal)
                }
                isAdded={addedItems.has(deal.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
