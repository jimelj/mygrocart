"use client";

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@apollo/client/react';
import { useAuth } from '@/lib/auth-context';
import { GET_CURRENT_FLYERS, GET_MY_LIST_WITH_DEALS } from '@/lib/graphql/queries';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import {
  ShoppingCart,
  Tag,
  DollarSign,
  Newspaper,
  ArrowRight,
  Sparkles,
  CheckCircle,
} from 'lucide-react';

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

interface Deal {
  id: string;
  productName: string;
  salePrice: number;
  regularPrice?: number;
  storeName: string;
  dealType: string;
  savings?: number;
  savingsPercent?: number;
  validFrom?: string;
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

interface GetCurrentFlyersResponse {
  getCurrentFlyers: Flyer[];
}

interface GetMyListWithDealsResponse {
  getMyListWithDeals: ListItem[];
}

// -----------------------------------------------------------------------
// Flyer Carousel
// -----------------------------------------------------------------------

function FlyerCarousel({
  flyers,
  loading,
  activeStoreSlug,
  onStoreChange,
  carouselRef,
}: {
  flyers: Flyer[];
  loading: boolean;
  activeStoreSlug: string | null;
  onStoreChange: (slug: string) => void;
  carouselRef: React.RefObject<HTMLDivElement | null>;
}) {
  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="shrink-0 w-44 h-56 rounded-xl" />
        ))}
      </div>
    );
  }

  if (flyers.length === 0) {
    return (
      <Card className="p-10 text-center bg-gray-50">
        <Newspaper className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-primary-500)' }} />
        <p className="font-semibold text-gray-700">No flyers available for your area yet</p>
        <p className="text-sm text-gray-500 mt-1">We update flyers every week — check back soon.</p>
      </Card>
    );
  }

  return (
    <div
      ref={carouselRef}
      className="flex gap-4 overflow-x-auto pb-4"
      style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
    >
      {flyers.map((flyer) => {
        const isActive = activeStoreSlug === flyer.storeSlug;
        return (
          <Link
            key={flyer.id}
            href={`/flyers?store=${flyer.storeSlug}`}
            onClick={() => onStoreChange(flyer.storeSlug)}
            className="shrink-0 focus:outline-none"
            style={{ scrollSnapAlign: 'start' }}
          >
            <div
              className={`w-44 rounded-xl overflow-hidden border-2 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${
                isActive ? 'shadow-lg scale-[1.02]' : 'border-gray-200'
              }`}
              style={
                isActive
                  ? { borderColor: 'var(--color-primary-500)' }
                  : undefined
              }
            >
              {/* Cover image */}
              <div className="relative h-40 bg-gray-100">
                {flyer.imageUrls?.[0] ? (
                  <Image
                    src={flyer.imageUrls[0]}
                    alt={`${flyer.storeName} weekly flyer`}
                    fill
                    sizes="176px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-2">
                    <Newspaper className="w-10 h-10 text-gray-300" />
                    <span className="text-xs text-gray-400">No preview</span>
                  </div>
                )}
                {/* Page count badge */}
                {(flyer.imageUrls?.length ?? 0) > 1 && (
                  <span className="absolute bottom-2 right-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded-full">
                    {flyer.imageUrls.length} pages
                  </span>
                )}
              </div>

              {/* Store name */}
              <div
                className="px-3 py-2.5"
                style={{ backgroundColor: isActive ? 'var(--color-primary-500)' : '#fff' }}
              >
                <p
                  className={`font-semibold text-sm truncate ${isActive ? 'text-white' : 'text-gray-900'}`}
                >
                  {flyer.storeName}
                </p>
                <p className={`text-xs mt-0.5 ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
                  View flyer
                </p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// -----------------------------------------------------------------------
// Store Tabs
// -----------------------------------------------------------------------

function StoreTabs({
  flyers,
  activeStoreSlug,
  onSelect,
}: {
  flyers: Flyer[];
  activeStoreSlug: string | null;
  onSelect: (slug: string) => void;
}) {
  if (flyers.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 mt-4" style={{ scrollbarWidth: 'none' }}>
      {flyers.map((flyer) => {
        const isActive = activeStoreSlug === flyer.storeSlug;
        return (
          <button
            key={flyer.id}
            onClick={() => onSelect(flyer.storeSlug)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              isActive ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={isActive ? { backgroundColor: 'var(--color-primary-500)' } : undefined}
          >
            {flyer.storeName}
          </button>
        );
      })}
    </div>
  );
}

// -----------------------------------------------------------------------
// Authenticated Home
// -----------------------------------------------------------------------

function AuthenticatedHome({ user }: { user: { userId?: string; name?: string; zipCode?: string } }) {
  const zipCode = user?.zipCode || '30132';
  const [activeStoreSlug, setActiveStoreSlug] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement | null>(null);

  const { data: flyersData, loading: flyersLoading } = useQuery<GetCurrentFlyersResponse>(
    GET_CURRENT_FLYERS,
    { variables: { zipCode } }
  );

  const { data: listData } = useQuery<GetMyListWithDealsResponse>(GET_MY_LIST_WITH_DEALS, {
    variables: { userId: user?.userId },
    skip: !user?.userId,
  });

  const flyers: Flyer[] = flyersData?.getCurrentFlyers || [];
  const listItems: ListItem[] = listData?.getMyListWithDeals || [];
  const itemsWithDeals = listItems.filter(
    (item) => item.matchingDeals && item.matchingDeals.length > 0
  );

  // Scroll the carousel to the card whose store matches the clicked tab
  function handleStoreSelect(slug: string) {
    setActiveStoreSlug(slug);
    const idx = flyers.findIndex((f) => f.storeSlug === slug);
    if (idx >= 0 && carouselRef.current) {
      const cardWidth = 176 + 16; // w-44 = 176px + gap-4 = 16px
      carouselRef.current.scrollTo({ left: idx * cardWidth, behavior: 'smooth' });
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f7f8f5' }}>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Hero tagline */}
        <div className="text-center mb-8">
          <h1
            className="text-4xl sm:text-5xl font-black tracking-tight"
            style={{ color: 'var(--color-primary-500)' }}
          >
            Compare. Shop. Save.
          </h1>
          <p className="text-gray-500 mt-2 text-base">
            See all the best grocery deals near {zipCode} this week
          </p>
        </div>

        {/* List deal alert — only shown when list items have matches */}
        {itemsWithDeals.length > 0 && (
          <div
            className="rounded-2xl p-5 mb-8 text-white shadow-md flex items-start gap-4"
            style={{ background: 'linear-gradient(135deg, var(--color-secondary-500), #c44d0e)' }}
          >
            <div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg leading-tight">
                {itemsWithDeals.length} of {listItems.length} items on your list are on sale!
              </p>
              <p className="text-white/85 text-sm mt-1 mb-3">
                Deals matched to your shopping list this week
              </p>
              <Link href="/list">
                <Button
                  size="sm"
                  className="bg-white font-semibold hover:bg-gray-50"
                  style={{ color: 'var(--color-secondary-500)' }}
                >
                  View My List
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* ---- Flyer Carousel (primary content) ---- */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Newspaper className="w-5 h-5" style={{ color: 'var(--color-primary-500)' }} />
              This Week&apos;s Flyers
            </h2>
            <Link href="/flyers">
              <Button variant="outline" size="sm" className="text-sm">
                All Flyers
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>

          <FlyerCarousel
            flyers={flyers}
            loading={flyersLoading}
            activeStoreSlug={activeStoreSlug}
            onStoreChange={setActiveStoreSlug}
            carouselRef={carouselRef}
          />

          {/* Store tabs below carousel */}
          <StoreTabs
            flyers={flyers}
            activeStoreSlug={activeStoreSlug}
            onSelect={handleStoreSelect}
          />
        </section>

        {/* ---- Quick Actions ---- */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* My List */}
            <Link href="/list" className="group block">
              <Card className="h-full p-6 hover:shadow-md transition-all border border-gray-200 group-hover:border-primary-300 rounded-2xl">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: 'var(--color-primary-100)' }}
                >
                  <ShoppingCart className="w-6 h-6" style={{ color: 'var(--color-primary-600)' }} />
                </div>
                <h3 className="font-bold text-gray-900 mb-1">My List</h3>
                <p className="text-sm text-gray-500 mb-3">
                  {listItems.length > 0
                    ? `${listItems.length} item${listItems.length === 1 ? '' : 's'} in your list`
                    : 'Start building your grocery list'}
                </p>
                <span
                  className="text-sm font-semibold flex items-center"
                  style={{ color: 'var(--color-primary-500)' }}
                >
                  Go to List
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Card>
            </Link>

            {/* Browse Deals */}
            <Link href="/deals" className="group block">
              <Card className="h-full p-6 hover:shadow-md transition-all border border-gray-200 rounded-2xl">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: 'var(--color-secondary-100)' }}
                >
                  <Tag className="w-6 h-6" style={{ color: 'var(--color-secondary-600)' }} />
                </div>
                <h3 className="font-bold text-gray-900 mb-1">Browse Deals</h3>
                <p className="text-sm text-gray-500 mb-3">
                  Explore all deals in your area this week
                </p>
                <span
                  className="text-sm font-semibold flex items-center"
                  style={{ color: 'var(--color-secondary-500)' }}
                >
                  View Deals
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Card>
            </Link>

            {/* Compare Prices */}
            <Link href="/comparison" className="group block">
              <Card className="h-full p-6 hover:shadow-md transition-all border border-gray-200 rounded-2xl">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1">Compare Prices</h3>
                <p className="text-sm text-gray-500 mb-3">
                  Find the cheapest store for your list
                </p>
                <span className="text-sm font-semibold text-blue-600 flex items-center">
                  Compare Now
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Card>
            </Link>

          </div>
        </section>

      </main>
    </div>
  );
}

// -----------------------------------------------------------------------
// Landing Page (non-authenticated)
// -----------------------------------------------------------------------

function LandingPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* Hero */}
      <section
        className="pt-24 pb-20 text-white"
        style={{ backgroundColor: '#131313' }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Image
              src="/mygrocart-logo.png"
              alt="MyGroCart"
              width={72}
              height={72}
              className="rounded-2xl shadow-lg"
            />
          </div>

          <h1 className="text-5xl sm:text-6xl font-black tracking-tight mb-4">
            <span style={{ color: 'var(--color-primary-400)' }}>Compare.</span>{' '}
            <span className="text-white">Shop.</span>{' '}
            <span style={{ color: 'var(--color-secondary-400)' }}>Save.</span>
          </h1>

          <p className="text-xl text-gray-300 mb-10 leading-relaxed max-w-2xl mx-auto">
            See all the best grocery deals near you this week, matched to your shopping list.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button
                size="lg"
                className="w-full sm:w-auto px-10 py-3 text-base font-bold rounded-xl text-white shadow-lg"
                style={{ backgroundColor: 'var(--color-primary-500)' }}
              >
                Sign Up Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto px-10 py-3 text-base font-semibold rounded-xl border-gray-600 text-white hover:bg-white/10"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black text-center mb-2" style={{ color: '#131313' }}>
            How It Works
          </h2>
          <p className="text-center text-gray-500 mb-12">
            Three simple steps to save on every grocery run
          </p>

          <div className="grid sm:grid-cols-3 gap-8">

            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ backgroundColor: 'var(--color-primary-100)' }}
              >
                <Newspaper className="w-7 h-7" style={{ color: 'var(--color-primary-500)' }} />
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">Digital Circulars</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Browse this week&apos;s flyers from all major stores near you — all in one place.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ backgroundColor: 'var(--color-secondary-100)' }}
              >
                <ShoppingCart className="w-7 h-7" style={{ color: 'var(--color-secondary-500)' }} />
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">Shopping Lists</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Build your grocery list and we&apos;ll automatically match items to the best deals available.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <DollarSign className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">Price Comparison</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Compare total basket price across stores so you always know where to shop.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section
        className="py-16 text-white"
        style={{ backgroundColor: 'var(--color-primary-500)' }}
      >
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-10 h-10 text-white/80" />
          </div>
          <h2 className="text-3xl font-black mb-3">
            Ready to shop smarter?
          </h2>
          <p className="text-white/80 mb-8 text-lg">
            Free to use. No credit card required.
          </p>
          <Link href="/signup">
            <Button
              size="lg"
              className="px-12 py-3 text-base font-bold bg-white rounded-xl shadow-md hover:bg-gray-50"
              style={{ color: 'var(--color-primary-600)' }}
            >
              Get Started
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: '#131313' }} className="text-white py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">

            <div className="flex items-center gap-3">
              <Image
                src="/mygrocart-logo.png"
                alt="MyGroCart"
                width={36}
                height={36}
                className="rounded-lg"
              />
              <span className="font-bold text-lg">MyGroCart</span>
            </div>

            <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-400">
              <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
              <Link href="/signup" className="hover:text-white transition-colors">Sign Up</Link>
              <Link href="/search" className="hover:text-white transition-colors">Search Deals</Link>
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            </nav>

          </div>
          <div className="border-t border-gray-800 mt-8 pt-6 text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} MyGroCart. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
}

// -----------------------------------------------------------------------
// Page root
// -----------------------------------------------------------------------

export default function Home() {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated && user) {
    return <AuthenticatedHome user={user} />;
  }

  return <LandingPage />;
}
