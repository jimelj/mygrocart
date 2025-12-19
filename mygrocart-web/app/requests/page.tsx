'use client';

import React from 'react';
import { useQuery } from '@apollo/client/react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { GET_MY_PRODUCT_REQUESTS } from '@/lib/graphql/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Clock } from 'lucide-react';
import Link from 'next/link';

export default function RequestsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated (wait for auth to load first)
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const { data, loading, error } = useQuery<{
    getMyProductRequests: Array<{
      requestId: string;
      productName: string;
      status: string;
      createdAt: string;
      completedAt?: string;
    }>;
  }>(GET_MY_PRODUCT_REQUESTS, {
    skip: !isAuthenticated
  });

  if (!isAuthenticated || !user) {
    return null; // Will redirect
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading your requests...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading requests: {error.message}</p>
          <Button onClick={() => router.push('/list')}>Go to Shopping List</Button>
        </div>
      </div>
    );
  }

  const requests = data?.getMyProductRequests || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays === 1) {
        return 'Yesterday';
      } else if (diffInDays < 7) {
        return `${diffInDays} days ago`;
      } else {
        return date.toLocaleDateString();
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Product Requests</h1>
          <p className="text-gray-600">Track the status of your product requests</p>
        </div>

        {requests.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12">
              <div className="text-center">
                <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No product requests yet
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Request products that aren&apos;t in our catalog and we&apos;ll add them within 24 hours.
                </p>
                <Link href="/list">
                  <Button className="bg-green-600 hover:bg-green-700">
                    Start Shopping
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((request: any) => (
              <Card key={request.requestId}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg mb-1">
                        {request.productName}
                      </h3>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Requested {formatDate(request.createdAt)}
                      </p>
                    </div>

                    <div>
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase border ${getStatusColor(
                          request.status
                        )}`}
                      >
                        {request.status}
                      </span>
                    </div>
                  </div>

                  {request.status === 'completed' && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <Link href="/list">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-600 hover:bg-green-50"
                        >
                          View in Catalog →
                        </Button>
                      </Link>
                    </div>
                  )}

                  {request.status === 'failed' && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm text-red-600">
                        Could not find product. Try a different search term.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-6">
          <Link href="/list">
            <Button variant="outline">← Back to Shopping List</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
