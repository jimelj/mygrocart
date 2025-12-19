"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { User, MapPin, Mail, LogOut, Settings, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import Link from "next/link";

const UPDATE_TRAVEL_RADIUS = gql`
  mutation UpdateTravelRadius($travelRadiusMiles: Int!) {
    updateTravelRadius(travelRadiusMiles: $travelRadiusMiles) {
      userId
      travelRadiusMiles
    }
  }
`;

export default function ProfilePage() {
  const { user, isAuthenticated, logout, setUser } = useAuth();
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isEditingRadius, setIsEditingRadius] = useState(false);
  const [updateTravelRadius, { loading: updatingRadius }] = useMutation(UPDATE_TRAVEL_RADIUS);

  const handleRadiusChange = async (newRadius: string) => {
    try {
      const { data } = await updateTravelRadius({
        variables: {
          travelRadiusMiles: parseInt(newRadius)
        }
      });

      // Update user state with new travel radius
      if (data?.updateTravelRadius && user) {
        setUser({
          ...user,
          travelRadiusMiles: data.updateTravelRadius.travelRadiusMiles
        });
      }

      setIsEditingRadius(false);
    } catch (error) {
      console.error("Error updating travel radius:", error);
    }
  };

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <Alert>
            <AlertDescription className="text-center">
              <p className="mb-4">Please sign in to view your profile</p>
              <Link href="/login?returnUrl=/profile">
                <Button className="bg-green-600 hover:bg-green-700">
                  Sign In
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <User className="h-8 w-8 text-green-600" />
                My Profile
              </h1>
              <p className="mt-2 text-gray-500">
                Manage your account settings and preferences
              </p>
            </div>
            <Link href="/">
              <Button variant="outline">
                Back to Home
              </Button>
            </Link>
          </div>
        </div>

        {/* Logout Confirmation */}
        {showLogoutConfirm && (
          <div className="mb-6">
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <p className="text-yellow-900">Are you sure you want to log out?</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowLogoutConfirm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="bg-red-600 hover:bg-red-700"
                      onClick={handleLogout}
                    >
                      Yes, Log Out
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        <div className="space-y-6">
          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-green-600" />
                Account Information
              </CardTitle>
              <CardDescription>Your personal details and account settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Name */}
              {user.name && (
                <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Full Name</p>
                      <p className="text-base font-semibold text-gray-900">{user.name}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email Address</p>
                    <p className="text-base font-semibold text-gray-900">{user.email}</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Verified
                </Badge>
              </div>

              {/* User ID */}
              <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">User ID</p>
                    <p className="text-base font-mono text-gray-700">{user.userId}</p>
                  </div>
                </div>
              </div>

              {/* Admin Badge */}
              {user.isAdmin && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Settings className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Account Type</p>
                      <Badge className="mt-1 bg-purple-600 hover:bg-purple-700">
                        Administrator
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-green-600" />
                Location Settings
              </CardTitle>
              <CardDescription>Manage your location preferences for store searches</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* ZIP Code */}
              {user.zipCode && (
                <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">ZIP Code</p>
                      <p className="text-base font-semibold text-gray-900">{user.zipCode}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Change
                  </Button>
                </div>
              )}

              {/* Address */}
              {user.address && (
                <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Address</p>
                      <p className="text-base font-semibold text-gray-900">
                        {user.address}
                        {user.city && user.state && (
                          <span className="text-gray-500">
                            {", "}{user.city}, {user.state}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Travel Radius */}
              {user.travelRadiusMiles && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Travel Radius</p>
                      {isEditingRadius ? (
                        <div className="mt-2 flex items-center gap-3">
                          <Select
                            defaultValue={user.travelRadiusMiles.toString()}
                            onValueChange={handleRadiusChange}
                            disabled={updatingRadius}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Select radius" />
                            </SelectTrigger>
                            <SelectContent>
                              {[5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((miles) => (
                                <SelectItem key={miles} value={miles.toString()}>
                                  {miles} miles
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditingRadius(false)}
                            disabled={updatingRadius}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <p className="text-base font-semibold text-gray-900">
                            {user.travelRadiusMiles} miles
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Stores within this radius will be included in price comparisons
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  {!isEditingRadius && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingRadius(true)}
                    >
                      Adjust
                    </Button>
                  )}
                </div>
              )}

              {/* Coordinates (for debugging) */}
              {user.latitude && user.longitude && (
                <div className="mt-4 rounded-lg bg-gray-50 p-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">Location Coordinates</p>
                  <p className="font-mono text-sm text-gray-600">
                    {user.latitude.toFixed(6)}, {user.longitude.toFixed(6)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-green-600" />
                Quick Actions
              </CardTitle>
              <CardDescription>Navigate to your shopping features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/list">
                <Button className="w-full justify-start bg-white hover:bg-gray-50 text-gray-900 border border-gray-200" variant="outline">
                  <ShoppingCart className="mr-3 h-5 w-5 text-green-600" />
                  View Shopping List
                </Button>
              </Link>
              <Link href="/search">
                <Button className="w-full justify-start bg-white hover:bg-gray-50 text-gray-900 border border-gray-200" variant="outline">
                  <Settings className="mr-3 h-5 w-5 text-blue-600" />
                  Search Products
                </Button>
              </Link>
              <Link href="/comparison">
                <Button className="w-full justify-start bg-white hover:bg-gray-50 text-gray-900 border border-gray-200" variant="outline">
                  <MapPin className="mr-3 h-5 w-5 text-purple-600" />
                  Compare Prices
                </Button>
              </Link>
              {user.isAdmin && (
                <Link href="/admin">
                  <Button className="w-full justify-start bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200" variant="outline">
                    <Settings className="mr-3 h-5 w-5 text-purple-600" />
                    Admin Dashboard
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-900">Account Actions</CardTitle>
              <CardDescription className="text-red-700">
                Manage your account security and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                onClick={() => setShowLogoutConfirm(true)}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log Out
              </Button>
              <p className="text-center text-xs text-gray-500">
                Need help? Contact support at support@mygrocart.com
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
