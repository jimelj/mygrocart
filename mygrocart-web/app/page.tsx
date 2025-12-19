"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@apollo/client/react';
import { useAuth } from '@/lib/auth-context';
import { GET_DEALS_NEAR_ME, GET_MY_LIST_WITH_DEALS, GET_CURRENT_FLYERS } from '@/lib/graphql/queries';
import { Button } from '@/components/ui/button';
import { DealCard } from '@/components/deals/DealCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, MapPin, DollarSign, Tag, Flame, Newspaper, ArrowRight, Sparkles } from 'lucide-react';

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
}

interface ListItem {
  id: string;
  itemName: string;
  matchingDeals?: Deal[];
}

interface Flyer {
  id: string;
  storeName: string;
  storeSlug: string;
  flyerName: string;
  imageUrls: string[];
  validFrom: string;
  validTo: string;
  status: string;
}

// GraphQL Response Types
interface GetDealsNearMeResponse {
  getDealsNearMe: {
    deals: Deal[];
  } | Deal[];
}

interface GetCurrentFlyersResponse {
  getCurrentFlyers: Flyer[];
}

interface GetMyListWithDealsResponse {
  getMyListWithDeals: ListItem[];
}

export default function Home() {
  const { isAuthenticated, user } = useAuth();

  const zipCode = user?.zipCode || '07001';

  // Fetch hot deals
  const { data: dealsData, loading: dealsLoading } = useQuery<GetDealsNearMeResponse>(GET_DEALS_NEAR_ME, {
    variables: {
      zipCode,
      limit: 8,
    },
    skip: !isAuthenticated || !user,
  });

  // Fetch current flyers
  const { data: flyersData, loading: flyersLoading } = useQuery<GetCurrentFlyersResponse>(GET_CURRENT_FLYERS, {
    variables: { zipCode },
    skip: !isAuthenticated || !user,
  });

  // Fetch list with deals
  const { data: listData } = useQuery<GetMyListWithDealsResponse>(GET_MY_LIST_WITH_DEALS, {
    variables: {
      userId: user?.userId,
    },
    skip: !isAuthenticated || !user,
  });

  const getDealsResponse = dealsData?.getDealsNearMe;
  const hotDeals: Deal[] = Array.isArray(getDealsResponse)
    ? getDealsResponse
    : (getDealsResponse?.deals || []);
  const flyers: Flyer[] = flyersData?.getCurrentFlyers || [];
  const listItems: ListItem[] = listData?.getMyListWithDeals || [];
  const itemsWithDeals = listItems.filter((item: ListItem) => item.matchingDeals && item.matchingDeals.length > 0);

  // If authenticated, show dashboard instead of landing page
  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back{user.name ? `, ${user.name}` : ''}!
            </h1>
            <p className="text-gray-600 mt-1 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Deals near {zipCode}
            </p>
          </div>

          {/* Your list deals summary - prominent CTA */}
          {itemsWithDeals.length > 0 && (
            <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-6 mb-8 text-white shadow-lg">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2">
                    {itemsWithDeals.length} of {listItems.length} items on your list are on sale!
                  </h3>
                  <p className="text-white/90 mb-4">
                    Check out the deals we found for you this week
                  </p>
                  <Link href="/list">
                    <Button
                      variant="secondary"
                      size="lg"
                      className="bg-white text-orange-600 hover:bg-gray-50"
                    >
                      View My List
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Weekly Flyers Section - Primary Feature */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">
                  This Week's Flyers
                </h2>
              </div>
              <Link href="/flyers">
                <Button variant="outline" size="sm">
                  View All Flyers
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            {flyersLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-40 rounded-lg" />
                ))}
              </div>
            ) : flyers.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {flyers.slice(0, 4).map((flyer: Flyer) => (
                  <Link key={flyer.id} href={`/flyers?store=${flyer.storeSlug}`}>
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full">
                      <div className="relative h-28 bg-gray-100">
                        {flyer.imageUrls?.[0] ? (
                          <Image
                            src={flyer.imageUrls[0]}
                            alt={`${flyer.storeName} flyer`}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Newspaper className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <p className="font-medium text-sm truncate">{flyer.storeName}</p>
                        <p className="text-xs text-gray-500">{flyer.imageUrls?.length || 0} pages</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <Newspaper className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No flyers available for your area</p>
                <p className="text-sm text-gray-400 mt-1">Check back soon - we update flyers weekly!</p>
              </Card>
            )}
          </div>

          {/* Hot Deals Section */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                <h2 className="text-xl font-bold text-gray-900">
                  Hot Deals This Week
                </h2>
              </div>
              <Link href="/deals">
                <Button variant="outline" size="sm">
                  View All Deals
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            {dealsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-48 rounded-lg" />
                ))}
              </div>
            ) : hotDeals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {hotDeals.slice(0, 8).map((deal: Deal) => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    onClick={() => {}}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No deals available right now</p>
                <p className="text-sm text-gray-400 mt-1">Check back soon for new deals!</p>
              </Card>
            )}
          </div>

          {/* Quick Actions Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            <Link href="/list" className="block">
              <Card className="p-6 hover:shadow-lg transition-all hover:border-green-200 h-full">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <ShoppingCart className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">My Shopping List</h3>
                <p className="text-gray-600 text-sm mb-3">
                  {listItems.length > 0
                    ? `${listItems.length} items in your list`
                    : 'Start building your grocery list'
                  }
                </p>
                <span className="text-green-600 font-medium text-sm flex items-center">
                  Go to List
                  <ArrowRight className="w-4 h-4 ml-1" />
                </span>
              </Card>
            </Link>

            <Link href="/deals" className="block">
              <Card className="p-6 hover:shadow-lg transition-all hover:border-orange-200 h-full">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <Tag className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Browse Deals</h3>
                <p className="text-gray-600 text-sm mb-3">
                  {hotDeals.length > 0
                    ? `${hotDeals.length}+ deals near you`
                    : 'Explore all deals in your area'
                  }
                </p>
                <span className="text-orange-600 font-medium text-sm flex items-center">
                  View Deals
                  <ArrowRight className="w-4 h-4 ml-1" />
                </span>
              </Card>
            </Link>

            <Link href="/comparison" className="block">
              <Card className="p-6 hover:shadow-lg transition-all hover:border-blue-200 h-full">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Compare Prices</h3>
                <p className="text-gray-600 text-sm mb-3">
                  Find the cheapest store for your list
                </p>
                <span className="text-blue-600 font-medium text-sm flex items-center">
                  Compare Now
                  <ArrowRight className="w-4 h-4 ml-1" />
                </span>
              </Card>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Landing page for non-authenticated users
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="pt-24 pb-20 bg-gradient-to-br from-slate-900 via-gray-900 to-emerald-900 text-white relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat'
          }}></div>
        </div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="text-center lg:text-left">
              <div className="mb-8 inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-500/20 to-green-500/20 backdrop-blur-sm text-emerald-300 border border-emerald-500/30 rounded-full text-sm font-medium shadow-lg">
                <span className="w-2 h-2 bg-emerald-400 rounded-full mr-3 animate-pulse"></span>
                Now Available - Save More, Shop Smarter
              </div>

              <h1 className="text-6xl lg:text-7xl font-black mb-8 leading-[0.9] tracking-tight">
                Built for the
                <br />
                <span className="bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 bg-clip-text text-transparent">
                  Future of Shopping
                </span>
              </h1>

              <p className="text-xl text-gray-300 mb-10 leading-relaxed max-w-2xl">
                Compare prices across multiple stores, build intelligent shopping lists, and save money with AI-powered tools designed for modern grocery shopping.
              </p>

              <div className="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start mb-12">
                <Link href="/signup">
                  <Button
                    size="lg"
                    className="group px-10 py-6 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all duration-300 text-lg font-semibold shadow-2xl hover:shadow-emerald-500/25 transform hover:-translate-y-1"
                  >
                    <span className="flex items-center justify-center">
                      Get Started Free
                      <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="lg"
                  className="px-10 py-6 border-2 border-gray-600 text-white hover:bg-white/10 hover:border-gray-500 rounded-xl transition-all duration-300 text-lg font-semibold backdrop-blur-sm"
                >
                  See How It Works
                </Button>
              </div>

              <div className="flex items-center justify-center lg:justify-start space-x-12">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <div className="text-3xl font-bold text-emerald-400">4.9</div>
                    <div className="flex ml-1">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">App Store Rating</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-400">50K+</div>
                  <div className="text-sm text-gray-400">Happy Users</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-400">$2.5M</div>
                  <div className="text-sm text-gray-400">Total Saved</div>
                </div>
              </div>
            </div>

            <div className="relative flex justify-center lg:justify-end">
              <div className="relative">
                {/* Phone Mockup */}
                <div className="relative w-80 h-[600px] bg-gray-900 rounded-[3rem] p-2 shadow-2xl">
                  <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden relative">
                    {/* Status Bar */}
                    <div className="h-8 bg-gray-50 flex items-center justify-between px-6 text-xs font-medium text-gray-600">
                      <span>9:41</span>
                      <div className="flex items-center space-x-1">
                        <div className="w-4 h-2 bg-gray-400 rounded-sm"></div>
                        <div className="w-4 h-2 bg-gray-400 rounded-sm"></div>
                        <div className="w-4 h-2 bg-gray-400 rounded-sm"></div>
                      </div>
                    </div>

                    {/* App Content */}
                    <div className="p-6 h-full bg-gradient-to-br from-emerald-50 to-green-50">
                      <div className="flex items-center mb-6">
                        <Image
                          src="/mygrocart-logo.png"
                          alt="MyGroCart"
                          width={32}
                          height={32}
                          className="rounded-lg shadow-sm"
                        />
                        <div className="ml-3">
                          <h3 className="font-bold text-gray-900">MyGroCart</h3>
                          <p className="text-xs text-gray-600">Smart Shopping</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-white rounded-xl p-4 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900">Shopping List</span>
                            <span className="text-xs text-emerald-600 font-medium">5 items</span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Milk</span>
                              <span className="text-sm font-medium text-gray-900">$3.49</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Bread</span>
                              <span className="text-sm font-medium text-gray-900">$2.99</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Eggs</span>
                              <span className="text-sm font-medium text-gray-900">$4.29</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl p-4 text-white">
                          <div className="text-sm font-medium mb-1">Best Deal Found!</div>
                          <div className="text-xs opacity-90">Save $2.50 at ShopRite</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Elements */}
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>

                <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">50K+</div>
              <div className="text-gray-600">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">$2.5M</div>
              <div className="text-gray-600">Total Savings</div>
            </div>
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">25%</div>
              <div className="text-gray-600">Average Savings</div>
            </div>
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">500+</div>
              <div className="text-gray-600">Partner Stores</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gradient-to-br from-gray-50 to-emerald-50 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M20 20c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10zm10 0c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10z'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat'
          }}></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-6">
              Powerful Features
            </div>
            <h2 className="text-5xl font-black text-gray-900 mb-6">
              Everything you need to
              <span className="bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent"> shop smarter</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              MyGroCart combines intelligent price comparison, location-based deals, and smart shopping lists
              to help you save money on every grocery trip.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="group text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Smart Shopping Lists</h3>
              <p className="text-gray-600 leading-relaxed">Build intelligent grocery lists with UPC scanning and product search capabilities</p>
            </div>

            <div className="group text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Real-Time Price Comparison</h3>
              <p className="text-gray-600 leading-relaxed">Compare prices across multiple supermarket chains instantly and find the best deals</p>
            </div>

            <div className="group text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Location-Based Deals</h3>
              <p className="text-gray-600 leading-relaxed">Find the best deals at stores within your preferred travel radius</p>
            </div>

            <div className="group text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Maximum Savings</h3>
              <p className="text-gray-600 leading-relaxed">Save up to 30% on your grocery bills with smart price tracking and alerts</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600 text-white relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat'
          }}></div>
        </div>
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="mb-8">
            <div className="inline-flex items-center px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-white rounded-full mr-3 animate-pulse"></span>
              Join 50,000+ Smart Shoppers
            </div>
          </div>

          <h2 className="text-5xl lg:text-6xl font-black mb-8 leading-tight">
            Ready to start
            <br />
            <span className="bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
              saving money?
            </span>
          </h2>

          <p className="text-xl mb-12 opacity-90 leading-relaxed max-w-2xl mx-auto">
            Join thousands of smart shoppers who save an average of 25% on groceries every month.
            Start your journey to smarter shopping today.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link href="/signup">
              <Button
                size="lg"
                className="group px-12 py-6 bg-white text-emerald-600 hover:bg-gray-50 rounded-2xl transition-all duration-300 text-xl font-bold shadow-2xl hover:shadow-white/25 transform hover:-translate-y-1"
              >
                <span className="flex items-center">
                  Get Started Free
                  <svg className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </Button>
            </Link>

            <div className="flex items-center space-x-4 text-white/80">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-yellow-300 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-sm font-medium">4.9/5 Rating</span>
              </div>
              <div className="w-px h-4 bg-white/30"></div>
              <span className="text-sm">No Credit Card Required</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white py-16 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-50">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M20 20c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10zm10 0c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10z'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat'
          }}></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-4 mb-6">
                <Image
                  src="/mygrocart-logo.png"
                  alt="MyGroCart"
                  width={48}
                  height={48}
                  className="rounded-xl shadow-lg"
                />
                <div>
                  <span className="text-2xl font-bold">MyGroCart</span>
                  <p className="text-sm text-emerald-400 -mt-1">Smart Shopping</p>
                </div>
              </div>
              <p className="text-gray-400 mb-6 leading-relaxed max-w-md">
                The smartest way to save money on groceries. Compare prices, build lists, and find the best deals at stores near you.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-emerald-600 rounded-lg flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-emerald-600 rounded-lg flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-6 text-white">Product</h3>
              <ul className="space-y-3">
                <li><a href="#features" className="text-gray-400 hover:text-emerald-400 transition-colors">Features</a></li>
                <li><Link href="/search" className="text-gray-400 hover:text-emerald-400 transition-colors">Search Products</Link></li>
                <li><Link href="/login" className="text-gray-400 hover:text-emerald-400 transition-colors">Sign In</Link></li>
                <li><Link href="/signup" className="text-gray-400 hover:text-emerald-400 transition-colors">Sign Up</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-6 text-white">Company</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-400 hover:text-emerald-400 transition-colors">About Us</a></li>
                <li><a href="#" className="text-gray-400 hover:text-emerald-400 transition-colors">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-emerald-400 transition-colors">Contact</a></li>
                <li><a href="#" className="text-gray-400 hover:text-emerald-400 transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400 text-sm">
                &copy; 2025 MyGroCart. All rights reserved.
              </p>
              <div className="flex space-x-6 mt-4 md:mt-0">
                <a href="#" className="text-gray-400 hover:text-emerald-400 text-sm transition-colors">Privacy Policy</a>
                <a href="#" className="text-gray-400 hover:text-emerald-400 text-sm transition-colors">Terms of Service</a>
                <a href="#" className="text-gray-400 hover:text-emerald-400 text-sm transition-colors">Cookie Policy</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
