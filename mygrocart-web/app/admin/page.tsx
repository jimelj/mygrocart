"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  RefreshCw,
  Plus,
  Database,
  Store,
  TrendingUp,
  Lock,
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
import { GET_SCRAPING_JOBS, CREATE_SCRAPING_JOB } from "@/lib/graphql/queries";
import Link from "next/link";

interface ScrapingJob {
  jobId: string;
  upc: string;
  zipCode: string;
  storeIds?: string[];
  userId?: string;
  status: string;
  priority: string;
  results?: string;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined
  );
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login?returnUrl=/admin");
    }
  }, [authLoading, isAuthenticated, router]);

  const { loading, data, error, refetch } = useQuery(GET_SCRAPING_JOBS, {
    variables: {
      status: statusFilter,
      limit: 50,
    },
    pollInterval: autoRefresh ? 5000 : 0, // Refresh every 5 seconds
    skip: !isAuthenticated, // Skip query if not authenticated
  });

  const [createJob, { loading: creatingJob }] =
    useMutation(CREATE_SCRAPING_JOB);

  const jobs: ScrapingJob[] = (data as any)?.getScrapingJobs || [];

  // Calculate stats
  const stats = {
    totalJobs: jobs.length,
    pending: jobs.filter((j) => j.status === "pending").length,
    running: jobs.filter((j) => j.status === "running").length,
    completed: jobs.filter((j) => j.status === "complete").length,
    failed: jobs.filter((j) => j.status === "failed").length,
  };

  const handleCreateJob = async () => {
    try {
      await createJob({
        variables: {
          upc: "123456789012", // Demo UPC
          zipCode: "10001", // Demo ZIP
          priority: "normal",
        },
        refetchQueries: [{ query: GET_SCRAPING_JOBS }],
      });
      alert("Scraping job created successfully!");
    } catch (err) {
      console.error("Failed to create job:", err);
      alert("Failed to create scraping job");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "bg-gray-100 text-gray-700",
      running: "bg-blue-100 text-blue-700",
      complete: "bg-green-100 text-green-700",
      failed: "bg-red-100 text-red-700",
    };

    return (
      <Badge
        className={
          variants[status as keyof typeof variants] || "bg-gray-100 text-gray-700"
        }
      >
        {status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      high: "bg-red-50 text-red-700 border-red-200",
      normal: "bg-gray-50 text-gray-700 border-gray-200",
      low: "bg-gray-50 text-gray-500 border-gray-200",
    };

    return (
      <Badge
        variant="outline"
        className={
          variants[priority as keyof typeof variants] ||
          "bg-gray-50 text-gray-700"
        }
      >
        {priority}
      </Badge>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Skeleton className="mx-auto h-12 w-12 rounded-full" />
          <Skeleton className="mx-auto mt-4 h-4 w-32" />
        </div>
      </div>
    );
  }

  // Show access denied if not authenticated (before redirect)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-center justify-center">
              <Lock className="h-6 w-6 text-red-600" />
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900">
              <LayoutDashboard className="h-8 w-8 text-primary-600" />
              Admin Dashboard
            </h1>
            <p className="mt-2 text-gray-500">
              Monitor scraping jobs and system statistics
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={loading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button onClick={handleCreateJob} disabled={creatingJob}>
              <Plus className="mr-2 h-4 w-4" />
              New Job
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              <Database className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalJobs}</div>
              <p className="text-xs text-gray-500">All scraping jobs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Running</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.running}
              </div>
              <p className="text-xs text-gray-500">Currently processing</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Store className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.completed}
              </div>
              <p className="text-xs text-gray-500">Successfully finished</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <RefreshCw className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.failed}
              </div>
              <p className="text-xs text-gray-500">Errors encountered</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Controls */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Filter:</span>
            <select
              value={statusFilter || "all"}
              onChange={(e) =>
                setStatusFilter(e.target.value === "all" ? undefined : e.target.value)
              }
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="running">Running</option>
              <option value="complete">Complete</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="auto-refresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-2 focus:ring-primary-600"
            />
            <label htmlFor="auto-refresh" className="text-sm text-gray-700">
              Auto-refresh (5s)
            </label>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            <p className="font-medium">Error loading jobs</p>
            <p className="mt-1 text-sm">{error.message}</p>
          </div>
        )}

        {/* Jobs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Scraping Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && jobs.length === 0 ? (
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
                  {statusFilter
                    ? "No jobs match the selected filter"
                    : "Create a new scraping job to get started"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job ID</TableHead>
                      <TableHead>UPC</TableHead>
                      <TableHead>ZIP Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.jobId}>
                        <TableCell className="font-mono text-xs">
                          {job.jobId.substring(0, 8)}...
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {job.upc}
                        </TableCell>
                        <TableCell>{job.zipCode}</TableCell>
                        <TableCell>{getStatusBadge(job.status)}</TableCell>
                        <TableCell>{getPriorityBadge(job.priority)}</TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatDate(job.createdAt)}
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
      </div>
    </div>
  );
}
