"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ShoppingCart,
  Tag,
  Newspaper,
  DollarSign,
  Menu,
  X,
  User,
  LogOut,
  Shield,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navigation() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Navigation items - only shown when logged in (logo links to home)
  const navItems = isAuthenticated
    ? [
        { name: "Deals", href: "/deals", icon: Tag },
        { name: "Flyers", href: "/flyers", icon: Newspaper },
        { name: "My List", href: "/list", icon: ShoppingCart },
        { name: "Compare", href: "/comparison", icon: DollarSign },
      ]
    : [];

  // Admin-only navigation items
  const adminItems = [
    { name: "Admin", href: "/admin", icon: Shield },
  ];

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
  };

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="MyGroCart"
              width={40}
              height={40}
              className="h-10 w-10"
              priority
            />
            <span className="text-xl font-bold">
              <span style={{ color: '#2d7a4c' }}>MyGro</span>
              <span style={{ color: '#e67e3c' }}>Cart</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-green-50 text-green-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-green-600" : ""}`} />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Auth Section (Desktop) */}
          <div className="hidden md:flex md:items-center md:gap-2">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="max-w-[120px] truncate">{user?.name || user?.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled className="text-xs text-gray-500">
                    {user?.email}
                  </DropdownMenuItem>
                  {user?.zipCode && (
                    <DropdownMenuItem disabled className="text-xs text-gray-500">
                      ZIP: {user.zipCode}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Profile Settings
                    </Link>
                  </DropdownMenuItem>
                  {/* Admin link - only shown to admins */}
                  {user?.isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer">
                        <Shield className="mr-2 h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" asChild>
                  <Link href="/signup">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden rounded-lg p-2 text-gray-700 hover:bg-gray-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="border-t border-gray-200 py-4 md:hidden">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-colors ${
                      isActive
                        ? "bg-green-50 text-green-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? "text-green-600" : "text-gray-500"}`} />
                    {item.name}
                  </Link>
                );
              })}
              <div className="mt-2 px-4">
                {isAuthenticated ? (
                  <div className="space-y-2">
                    <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4" />
                        <span className="font-medium">Signed in as</span>
                      </div>
                      <div className="text-xs text-gray-500 truncate">{user?.name || user?.email}</div>
                      {user?.zipCode && (
                        <div className="text-xs text-gray-400 mt-1">ZIP: {user.zipCode}</div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      asChild
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Link href="/profile">
                        <User className="mr-2 h-4 w-4" />
                        Profile Settings
                      </Link>
                    </Button>
                    {user?.isAdmin && (
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        asChild
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Link href="/admin">
                          <Shield className="mr-2 h-4 w-4" />
                          Admin Dashboard
                        </Link>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="w-full justify-start text-red-600 hover:text-red-700"
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full" asChild>
                      <Link href="/login">Sign In</Link>
                    </Button>
                    <Button className="w-full bg-green-600 hover:bg-green-700 text-white" asChild>
                      <Link href="/signup">Sign Up</Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
