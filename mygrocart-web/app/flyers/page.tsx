"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@apollo/client/react';
import { useAuth } from '@/lib/auth-context';
import { GET_CURRENT_FLYERS } from '@/lib/graphql/queries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Newspaper, MapPin, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';

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

export default function FlyersPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [selectedFlyer, setSelectedFlyer] = useState<Flyer | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const transformRef = useRef<ReactZoomPanPinchRef>(null);

  const zipCode = user?.zipCode || '07001';

  const { data, loading, error } = useQuery<GetCurrentFlyersResponse>(GET_CURRENT_FLYERS, {
    variables: { zipCode },
    skip: !isAuthenticated || !user,
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

  const flyers: Flyer[] = data?.getCurrentFlyers || [];

  const handleNextPage = () => {
    if (selectedFlyer && currentPage < selectedFlyer.imageUrls.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleSelectFlyer = (flyer: Flyer) => {
    setSelectedFlyer(flyer);
    setCurrentPage(0);
  };

  // Reset zoom when changing pages
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    transformRef.current?.resetTransform();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Newspaper className="w-6 h-6 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Weekly Flyers</h1>
          </div>
          <p className="text-gray-600 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            {flyers.length} flyers available in {zipCode}
          </p>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading flyers...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600 font-medium">Error loading flyers: {error.message}</p>
          </div>
        )}

        {/* Flyer Viewer */}
        {selectedFlyer ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setSelectedFlyer(null)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to All Flyers
              </Button>
              <div className="text-lg font-semibold">
                {selectedFlyer.storeName} - {selectedFlyer.flyerName}
              </div>
              <div className="text-gray-600">
                Page {currentPage + 1} of {selectedFlyer.imageUrls.length}
              </div>
            </div>

            {/* Image Viewer with Zoom */}
            <Card className="overflow-hidden">
              <CardContent className="p-0 relative">
                {/* Zoom Controls */}
                <div className="absolute top-4 right-4 z-20 flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="bg-white/90 hover:bg-white"
                    onClick={() => transformRef.current?.zoomIn()}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="bg-white/90 hover:bg-white"
                    onClick={() => transformRef.current?.zoomOut()}
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="bg-white/90 hover:bg-white"
                    onClick={() => transformRef.current?.resetTransform()}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>

                {/* Zoomable Image */}
                <TransformWrapper
                  ref={transformRef}
                  initialScale={1.5}
                  minScale={0.5}
                  maxScale={5}
                  centerOnInit
                  wheel={{ step: 0.15 }}
                  doubleClick={{ mode: "toggle", step: 2 }}
                  pinch={{ step: 5 }}
                >
                  <TransformComponent
                    wrapperStyle={{ width: '100%', height: '80vh' }}
                    contentStyle={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                  >
                    {selectedFlyer.imageUrls[currentPage] && (
                      <img
                        src={selectedFlyer.imageUrls[currentPage]}
                        alt={`${selectedFlyer.storeName} flyer page ${currentPage + 1}`}
                        style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
                      />
                    )}
                  </TransformComponent>
                </TransformWrapper>

                {/* Zoom hint */}
                <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-500 bg-white/80 px-3 py-1 rounded-full">
                  Pinch or scroll to zoom, drag to pan
                </p>

                {/* Navigation Arrows */}
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white z-10"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 0}
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white z-10"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === selectedFlyer.imageUrls.length - 1}
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
              </CardContent>
            </Card>

            {/* Page Thumbnails */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {selectedFlyer.imageUrls.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePageChange(idx)}
                  className={`flex-shrink-0 w-16 h-20 rounded border-2 overflow-hidden ${
                    currentPage === idx ? 'border-green-600' : 'border-gray-200'
                  }`}
                >
                  <Image
                    src={url}
                    alt={`Page ${idx + 1}`}
                    width={64}
                    height={80}
                    className="object-cover w-full h-full"
                  />
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Flyer List */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {flyers.map((flyer) => (
              <Card
                key={flyer.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleSelectFlyer(flyer)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{flyer.storeName}</CardTitle>
                  <p className="text-sm text-gray-500">{flyer.flyerName}</p>
                </CardHeader>
                <CardContent>
                  {flyer.imageUrls?.[0] && (
                    <div className="relative w-full h-48 mb-4 rounded overflow-hidden">
                      <Image
                        src={flyer.imageUrls[0]}
                        alt={`${flyer.storeName} flyer cover`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>{flyer.imageUrls?.length || 0} pages</span>
                    <span>{flyer.status}</span>
                  </div>
                  <Button className="w-full mt-4 bg-green-600 hover:bg-green-700">
                    View Flyer
                  </Button>
                </CardContent>
              </Card>
            ))}

            {!loading && flyers.length === 0 && (
              <div className="col-span-full bg-white rounded-lg p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 relative">
                  <Newspaper className="w-16 h-16 text-blue-200" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Welcome to MyGroCart! 🎉
                </h3>
                <p className="text-gray-600 mb-2">
                  We&apos;re setting up your personalized deals experience.
                </p>
                <p className="text-gray-600 mb-2">
                  Currently fetching the latest weekly flyers for ZIP code <strong>{zipCode}</strong>.
                </p>
                <p className="text-gray-500 text-sm mb-6">
                  This usually takes less than a minute. Please refresh in a moment!
                </p>
                <Button
                  onClick={() => window.location.reload()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Refresh Page
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
