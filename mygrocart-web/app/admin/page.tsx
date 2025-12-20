"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  RefreshCw,
  Database,
  ShoppingCart,
  Store,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  CircleDot,
  ArrowLeft,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  GET_ADMIN_STATS,
  GET_PROCESSING_JOBS,
  GET_ALL_FLYERS,
} from "@/lib/graphql/queries";
import { TRIGGER_FLYER_FETCH } from "@/lib/graphql/mutations";
import Link from "next/link";

// TypeScript Interfaces
interface StoreCount {
  storeName: string;
  count: number;
}

interface AdminStats {
  totalFlyers: number;
  totalDeals: number;
  activeStores: number;
  processingJobs: number;
  lastRefreshTime?: string;
  flyersByStore: StoreCount[];
  dealsByStore: StoreCount[];
}

interface ProcessingJob {
  id: string;
  type: string;
  zipCode: string;
  status: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

interface Flyer {
  id: string;
  storeName: string;
  storeSlug: string;
  flyerName: string;
  zipCode: string;
  imageUrls: string[];
  validFrom: string;
  validTo: string;
  status: string;
  dealCount: number;
  processedAt?: string;
}

interface AdminStatsResponse {
  getAdminStats: AdminStats;
}

interface ProcessingJobsResponse {
  getProcessingJobs: ProcessingJob[];
}

interface FlyersResponse {
  getAllFlyers: {
    flyers: Flyer[];
    totalCount: number;
  };
}

interface FlyerFetchResponse {
  triggerFlyerFetch: {
    jobId: string;
    status: string;
    message: string;
    flyersFound: number;
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // State
  const [zipCode, setZipCode] = useState("");
  const [zipError, setZipError] = useState("");
  const [fetchStatus, setFetchStatus] = useState<{
    state: "idle" | "loading" | "success" | "error";
    message?: string;
  }>({ state: "idle" });
  const [jobStatusFilter, setJobStatusFilter] = useState<string | undefined>(undefined);
  const [flyerZipFilter, setFlyerZipFilter] = useState<string | undefined>(undefined);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login?returnUrl=/admin");
    }
  }, [authLoading, isAuthenticated, router]);

  // GraphQL Queries
  const {
    loading: statsLoading,
    data: statsData,
    error: statsError,
    refetch: refetchStats,
  } = useQuery<AdminStatsResponse>(GET_ADMIN_STATS, {
    pollInterval: autoRefresh ? 5000 : 0,
    skip: !isAuthenticated,
  });

  const {
    loading: jobsLoading,
    data: jobsData,
    error: jobsError,
    refetch: refetchJobs,
  } = useQuery<ProcessingJobsResponse>(GET_PROCESSING_JOBS, {
    variables: { status: jobStatusFilter, limit: 50 },
    pollInterval: autoRefresh ? 5000 : 0,
    skip: !isAuthenticated,
  });

  const {
    loading: flyersLoading,
    data: flyersData,
    error: flyersError,
    refetch: refetchFlyers,
  } = useQuery<FlyersResponse>(GET_ALL_FLYERS, {
    variables: { zipCode: flyerZipFilter, limit: 50, offset: 0 },
    pollInterval: autoRefresh ? 10000 : 0,
    skip: !isAuthenticated,
  });

  // GraphQL Mutations
  const [triggerFlyerFetch, { loading: fetchingFlyers }] =
    useMutation<FlyerFetchResponse>(TRIGGER_FLYER_FETCH);

  // Data extraction
  const stats = statsData?.getAdminStats;
  const jobs = jobsData?.getProcessingJobs || [];
  const flyers = flyersData?.getAllFlyers.flyers || [];
  const flyerTotalCount = flyersData?.getAllFlyers.totalCount || 0;

  // Get unique ZIP codes from flyers for filter
  const uniqueZipCodes = Array.from(new Set(flyers.map((f) => f.zipCode))).sort();

  // Handlers
  const validateZipCode = (zip: string): boolean => {
    if (zip.length !== 5) {
      setZipError("ZIP code must be 5 digits");
      return false;
    }
    if (!/^\d{5}$/.test(zip)) {
      setZipError("ZIP code must contain only numbers");
      return false;
    }
    setZipError("");
    return true;
  };

  const handleZipCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setZipCode(value);
    if (value.length > 0) {
      validateZipCode(value);
    } else {
      setZipError("");
    }
  };

  const handleFetchFlyers = async () => {
    if (!validateZipCode(zipCode)) {
      return;
    }

    setFetchStatus({ state: "loading", message: "Fetching flyers..." });

    try {
      const result = await triggerFlyerFetch({
        variables: { zipCode },
      });

      const response = result.data?.triggerFlyerFetch;

      if (response) {
        setFetchStatus({
          state: "success",
          message: `Success: ${response.flyersFound} flyers found`,
        });

        // Refresh all data
        setTimeout(() => {
          refetchStats();
          refetchJobs();
          refetchFlyers();
        }, 1000);

        // Reset status after 5 seconds
        setTimeout(() => {
          setFetchStatus({ state: "idle" });
        }, 5000);
      }
    } catch (err: any) {
      console.error("Failed to fetch flyers:", err);
      setFetchStatus({
        state: "error",
        message: err.message || "Failed to fetch flyers",
      });

      // Reset status after 5 seconds
      setTimeout(() => {
        setFetchStatus({ state: "idle" });
      }, 5000);
    }
  };

  const handleRefreshAll = () => {
    refetchStats();
    refetchJobs();
    refetchFlyers();
  };

  // Status badge components
  const getJobStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; icon: any }> = {
      queued: {
        className: "bg-gray-100 text-gray-700",
        icon: <CircleDot className="h-3 w-3 mr-1" />,
      },
      processing: {
        className: "bg-blue-100 text-blue-700",
        icon: <Loader2 className="h-3 w-3 mr-1 animate-spin" />,
      },
      completed: {
        className: "bg-green-100 text-green-700",
        icon: <CheckCircle2 className="h-3 w-3 mr-1" />,
      },
      failed: {
        className: "bg-red-100 text-red-700",
        icon: <XCircle className="h-3 w-3 mr-1" />,
      },
    };

    const variant = variants[status] || variants.queued;

    return (
      <Badge className={`${variant.className} flex items-center w-fit`}>
        {variant.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getFlyerStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-gray-100 text-gray-700",
      processing: "bg-blue-100 text-blue-700",
      completed: "bg-green-100 text-green-700",
      failed: "bg-red-100 text-red-700",
    };

    return (
      <Badge className={variants[status] || variants.pending}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateRange = (from: string, to: string) => {
    if (!from || !to) return "No dates";

    const fromDate = new Date(from);
    const toDate = new Date(to);

    // Check if dates are valid
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return "No dates";
    }

    return `${fromDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} - ${toDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })}`;
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 mx-auto animate-spin text-green-600" />
          <p className="mt-4 text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-center justify-center">
              <XCircle className="h-6 w-6 text-red-600" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <Alert variant="destructive">
              <AlertDescription>
                You must be signed in to access the admin dashboard.
              </AlertDescription>
            </Alert>
            <div className="mt-6">
              <Button asChild className="bg-green-600 hover:bg-green-700">
                <Link href="/login?returnUrl=/admin">Sign In</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not an admin
  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-center justify-center">
              <XCircle className="h-6 w-6 text-red-600" />
              Admin Access Required
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <Alert variant="destructive">
              <AlertDescription>
                This page is only accessible to administrators.
              </AlertDescription>
            </Alert>
            <div className="mt-6">
              <Button asChild className="bg-green-600 hover:bg-green-700">
                <Link href="/">Go Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900">
              <LayoutDashboard className="h-8 w-8 text-green-600" />
              Admin Dashboard
            </h1>
            <p className="mt-2 text-gray-500">
              Manage flyers, deals, and processing jobs
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRefreshAll}
              disabled={statsLoading || jobsLoading || flyersLoading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${
                  statsLoading || jobsLoading || flyersLoading ? "animate-spin" : ""
                }`}
              />
              Refresh
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back Home
              </Link>
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Flyers</CardTitle>
              <FileText className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.totalFlyers || 0}</div>
                  <p className="text-xs text-gray-500">All flyers in database</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Deals</CardTitle>
              <ShoppingCart className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-green-600">
                    {stats?.totalDeals || 0}
                  </div>
                  <p className="text-xs text-gray-500">Deals extracted</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Stores</CardTitle>
              <Store className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.activeStores || 0}</div>
                  <p className="text-xs text-gray-500">Stores with flyers</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processing</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-blue-600">
                    {stats?.processingJobs || 0}
                  </div>
                  <p className="text-xs text-gray-500">Jobs in queue</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Flyer Fetching Panel */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Fetch New Flyers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1 max-w-xs">
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                  id="zipCode"
                  type="text"
                  placeholder="08857"
                  value={zipCode}
                  onChange={handleZipCodeChange}
                  maxLength={5}
                  className={zipError ? "border-red-500" : ""}
                />
                {zipError && (
                  <p className="mt-1 text-sm text-red-600">{zipError}</p>
                )}
              </div>

              <Button
                onClick={handleFetchFlyers}
                disabled={fetchingFlyers || fetchStatus.state === "loading" || !zipCode || !!zipError}
                className="bg-green-600 hover:bg-green-700"
              >
                {fetchingFlyers || fetchStatus.state === "loading" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  "Fetch Flyers"
                )}
              </Button>
            </div>

            {/* Status Message */}
            {fetchStatus.state !== "idle" && (
              <div className="mt-4">
                {fetchStatus.state === "loading" && (
                  <Alert className="border-blue-200 bg-blue-50">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <AlertDescription className="ml-2 text-blue-700">
                      {fetchStatus.message}
                    </AlertDescription>
                  </Alert>
                )}
                {fetchStatus.state === "success" && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="ml-2 text-green-700">
                      {fetchStatus.message}
                    </AlertDescription>
                  </Alert>
                )}
                {fetchStatus.state === "error" && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription className="ml-2">
                      {fetchStatus.message}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Processing Jobs Table */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Processing Jobs</CardTitle>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="jobFilter" className="text-sm">
                    Filter:
                  </Label>
                  <select
                    id="jobFilter"
                    value={jobStatusFilter || "all"}
                    onChange={(e) =>
                      setJobStatusFilter(e.target.value === "all" ? undefined : e.target.value)
                    }
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
                  >
                    <option value="all">All</option>
                    <option value="queued">Queued</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="auto-refresh-jobs"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-2 focus:ring-green-600"
                  />
                  <label htmlFor="auto-refresh-jobs" className="text-sm text-gray-700">
                    Auto-refresh
                  </label>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {jobsError && (
              <Alert variant="destructive" className="mb-4">
                <XCircle className="h-4 w-4" />
                <AlertDescription className="ml-2">
                  Failed to load processing jobs: {jobsError.message}
                </AlertDescription>
              </Alert>
            )}

            {jobsLoading && jobs.length === 0 ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <div className="py-12 text-center">
                <Database className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  No jobs found
                </h3>
                <p className="mt-2 text-gray-500">
                  {jobStatusFilter
                    ? "No jobs match the selected filter"
                    : "Fetch flyers to create processing jobs"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>ZIP Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="font-mono text-xs">
                          {job.id.substring(0, 8)}...
                        </TableCell>
                        <TableCell className="capitalize">{job.type}</TableCell>
                        <TableCell>{job.zipCode}</TableCell>
                        <TableCell>{getJobStatusBadge(job.status)}</TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {getRelativeTime(job.createdAt)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatDate(job.completedAt)}
                        </TableCell>
                        <TableCell>
                          {job.errorMessage ? (
                            <span className="text-xs text-red-600">
                              {job.errorMessage.substring(0, 30)}
                              {job.errorMessage.length > 30 ? "..." : ""}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Flyers Table */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Active Flyers ({flyerTotalCount})</CardTitle>
              <div className="flex items-center gap-2">
                <Label htmlFor="flyerFilter" className="text-sm">
                  Filter:
                </Label>
                <select
                  id="flyerFilter"
                  value={flyerZipFilter || "all"}
                  onChange={(e) =>
                    setFlyerZipFilter(e.target.value === "all" ? undefined : e.target.value)
                  }
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
                >
                  <option value="all">All ZIP Codes</option>
                  {uniqueZipCodes.map((zip) => (
                    <option key={zip} value={zip}>
                      {zip}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {flyersError && (
              <Alert variant="destructive" className="mb-4">
                <XCircle className="h-4 w-4" />
                <AlertDescription className="ml-2">
                  Failed to load flyers: {flyersError.message}
                </AlertDescription>
              </Alert>
            )}

            {flyersLoading && flyers.length === 0 ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : flyers.length === 0 ? (
              <div className="py-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  No flyers found
                </h3>
                <p className="mt-2 text-gray-500">
                  {flyerZipFilter
                    ? "No flyers found for this ZIP code"
                    : "Fetch flyers for a ZIP code to get started"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Store</TableHead>
                      <TableHead>Flyer Name</TableHead>
                      <TableHead>ZIP Code</TableHead>
                      <TableHead>Valid Dates</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Deals</TableHead>
                      <TableHead>Processed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {flyers.map((flyer) => (
                      <TableRow key={flyer.id}>
                        <TableCell className="font-medium">{flyer.storeName}</TableCell>
                        <TableCell>{flyer.flyerName}</TableCell>
                        <TableCell>{flyer.zipCode}</TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatDateRange(flyer.validFrom, flyer.validTo)}
                        </TableCell>
                        <TableCell>{getFlyerStatusBadge(flyer.status)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {flyer.dealCount} deals
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatDate(flyer.processedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deals by Store Chart */}
        {stats && stats.dealsByStore.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Deals by Store</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.dealsByStore
                  .sort((a, b) => b.count - a.count)
                  .map((store) => {
                    const maxCount = Math.max(...stats.dealsByStore.map((s) => s.count));
                    const percentage = (store.count / maxCount) * 100;

                    return (
                      <div key={store.storeName}>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">
                            {store.storeName}
                          </span>
                          <span className="text-sm text-gray-500">
                            {store.count} deals
                          </span>
                        </div>
                        <div className="h-6 w-full overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full bg-green-600 transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
