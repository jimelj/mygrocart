import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './components/LandingPage';
import { 
  SEARCH_PRODUCTS, 
  GET_USER_GROCERY_LISTS, 
  COMPARE_PRICES,
  ADD_GROCERY_LIST_ITEM,
  UPDATE_GROCERY_LIST_ITEM,
  REMOVE_GROCERY_LIST_ITEM
} from './graphql/client';
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { ShoppingCart, MapPin, DollarSign, Search, Plus, Minus, Star } from 'lucide-react'
import myGroCartLogo from './assets/mygrocart-logo.png'
import './App.css';

// Login/Signup Component
const AuthForm = ({ showSignup = false, onBack }) => {
  const { signup, login } = useAuth();
  const [isLogin, setIsLogin] = useState(!showSignup);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    travelRadiusMiles: 10
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let result;
      if (isLogin) {
        result = await login(formData.email, formData.password);
      } else {
        result = await signup(formData);
      }

      if (!result.success) {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" onClick={onBack}>
              ← Back
            </Button>
            <img src={myGroCartLogo} alt="MyGroCart" className="w-12 h-12" />
            <div></div>
          </div>
          <CardTitle className="text-2xl font-bold text-green-700">
            {isLogin ? 'Welcome Back' : 'Join MyGroCart'}
          </CardTitle>
          <CardDescription>
            {isLogin ? 'Sign in to your account' : 'Create your account to start saving'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            {!isLogin && (
              <>
                <div>
                  <Input
                    type="text"
                    name="address"
                    placeholder="Address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Input
                    type="text"
                    name="city"
                    placeholder="City"
                    value={formData.city}
                    onChange={handleChange}
                    required
                  />
                  <Input
                    type="text"
                    name="state"
                    placeholder="State"
                    value={formData.state}
                    onChange={handleChange}
                    required
                  />
                  <Input
                    type="text"
                    name="zipCode"
                    placeholder="ZIP"
                    value={formData.zipCode}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Travel Radius (miles)</label>
                  <Input
                    type="number"
                    name="travelRadiusMiles"
                    value={formData.travelRadiusMiles}
                    onChange={handleChange}
                    min="1"
                    max="50"
                    required
                  />
                </div>
              </>
            )}

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Create Account')}
            </Button>
          </form>

          <div className="text-center mt-4">
            <span className="text-sm text-gray-600">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button 
              type="button" 
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-green-600 hover:underline"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Main App Component
const MainApp = () => {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');

  // GraphQL Queries
  const { data: productsData, loading: searchLoading } = useQuery(SEARCH_PRODUCTS, {
    variables: { query: searchQuery },
    skip: !searchQuery
  });

  const { data: groceryListData, refetch: refetchGroceryList } = useQuery(GET_USER_GROCERY_LISTS, {
    variables: { userId: user?.userId },
    skip: !user?.userId
  });

  const { data: priceComparisonData, refetch: refetchPriceComparison } = useQuery(COMPARE_PRICES, {
    variables: { userId: user?.userId },
    skip: !user?.userId || currentView !== 'comparison'
  });

  // GraphQL Mutations
  const [addGroceryListItem] = useMutation(ADD_GROCERY_LIST_ITEM);
  const [updateGroceryListItem] = useMutation(UPDATE_GROCERY_LIST_ITEM);
  const [removeGroceryListItem] = useMutation(REMOVE_GROCERY_LIST_ITEM);

  const handleAddProduct = async (product) => {
    try {
      await addGroceryListItem({
        variables: {
          userId: user.userId,
          upc: product.upc,
          quantity: 1
        }
      });
      refetchGroceryList();
    } catch (error) {
      console.error('Error adding product:', error);
    }
  };

  const handleUpdateQuantity = async (listItemId, quantity) => {
    try {
      if (quantity <= 0) {
        await removeGroceryListItem({
          variables: { listItemId }
        });
      } else {
        await updateGroceryListItem({
          variables: { listItemId, quantity }
        });
      }
      refetchGroceryList();
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  const handleComparePrices = () => {
    setCurrentView('comparison');
    refetchPriceComparison();
  };

  const groceryList = groceryListData?.getUserGroceryLists || [];
  const priceComparison = priceComparisonData?.comparePrices || [];

  if (currentView === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100">
        <header className="bg-white shadow-lg border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <img src={myGroCartLogo} alt="MyGroCart" className="w-10 h-10 rounded-lg shadow-sm" />
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">MyGroCart</h1>
                    <p className="text-xs text-gray-500 -mt-1">Smart Shopping</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-gray-900">Welcome back!</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={logout}
                  className="border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300"
                >
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Smart Supermarket Price Comparison
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Find the best deals on your grocery list across nearby stores
            </p>
            <Button 
              onClick={() => setCurrentView('list')} 
              size="lg"
              className="bg-green-600 hover:bg-green-700"
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Start Shopping List
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <ShoppingCart className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>Smart Lists</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Build your grocery list with UPC scanning and product search</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>Price Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Compare prices across multiple stores in your area</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <MapPin className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>Location-Based</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Find deals at stores within your preferred travel radius</p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  if (currentView === 'list') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-lg border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" onClick={() => setCurrentView('home')} className="text-green-600 hover:text-green-700">
                  ← Back to Home
                </Button>
                <div className="flex items-center space-x-3">
                  <img src={myGroCartLogo} alt="MyGroCart" className="w-8 h-8 rounded-lg shadow-sm" />
                  <h1 className="text-xl font-bold text-gray-900">My Shopping List</h1>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={logout}
                className="border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300"
              >
                Logout
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Search Products</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search for products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {searchLoading && (
                    <div className="text-center py-4">Searching...</div>
                  )}

                  {productsData?.searchProducts && (
                    <div className="mt-4 space-y-2">
                      {productsData.searchProducts.map((product) => (
                        <div key={product.upc} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{product.imageUrl}</span>
                            <div>
                              <h4 className="font-medium">{product.name}</h4>
                              <p className="text-sm text-gray-600">{product.brand} - {product.size}</p>
                            </div>
                          </div>
                          <Button 
                            onClick={() => handleAddProduct(product)}
                            size="sm"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Your Shopping List ({groceryList.length} items)</CardTitle>
                    {groceryList.length > 0 && (
                      <Button onClick={handleComparePrices}>
                        Compare Prices
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {groceryList.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Your shopping list is empty. Search for products to add them!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {groceryList.map((item) => (
                        <div key={item.listItemId} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{item.product?.imageUrl}</span>
                            <div>
                              <h4 className="font-medium">{item.product?.name}</h4>
                              <p className="text-sm text-gray-600">{item.product?.brand} - {item.product?.size}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateQuantity(item.listItemId, item.quantity - 1)}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateQuantity(item.listItemId, item.quantity + 1)}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (currentView === 'comparison') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-lg border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" onClick={() => setCurrentView('list')} className="text-green-600 hover:text-green-700">
                  ← Back to List
                </Button>
                <div className="flex items-center space-x-3">
                  <img src={myGroCartLogo} alt="MyGroCart" className="w-8 h-8 rounded-lg shadow-sm" />
                  <h1 className="text-xl font-bold text-gray-900">Price Comparison</h1>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={logout}
                className="border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300"
              >
                Logout
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Best Prices for Your List</h2>
            <p className="text-gray-600">Comparing {groceryList.length} items across nearby stores</p>
          </div>

          {priceComparison.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-gray-500">No price data available for your items yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {priceComparison.map((comparison, index) => (
                <Card 
                  key={comparison.store.storeId} 
                  className={comparison.isCheapest ? 'ring-2 ring-green-500' : ''}
                >
                  <CardHeader>
                    {comparison.isCheapest && (
                      <Badge className="w-fit mb-2 bg-green-500">Best Deal!</Badge>
                    )}
                    <CardTitle>{comparison.store.chainName}</CardTitle>
                    <CardDescription>
                      {comparison.store.storeName} • {comparison.distance.toFixed(1)} miles
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between">
                        <span>Total Cost:</span>
                        <span className="font-bold">${comparison.totalCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>You Save:</span>
                        <span className="font-bold text-green-600">${comparison.savings.toFixed(2)}</span>
                      </div>
                    </div>
                    <Button className="w-full">Shop Here</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {priceComparison.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Savings Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      ${Math.max(...priceComparison.map(c => c.savings)).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">Total Savings</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {priceComparison.length > 0 ? 
                        Math.round((Math.max(...priceComparison.map(c => c.savings)) / 
                        Math.max(...priceComparison.map(c => c.totalCost))) * 100) : 0}%
                    </div>
                    <div className="text-sm text-gray-600">Percentage Saved</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{priceComparison.length}</div>
                    <div className="text-sm text-gray-600">Stores Compared</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    );
  }
};

// Root App Component with Auth Provider
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const AppContent = () => {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('landing'); // landing, auth, app

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading MyGroCart...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated, show the main app
  if (user) {
    return <MainApp />;
  }

  // Show landing page by default
  if (currentView === 'landing') {
    return (
      <LandingPage 
        onGetStarted={() => setCurrentView('auth-signup')}
        onLogin={() => setCurrentView('auth-login')}
      />
    );
  }

  // Show auth forms
  if (currentView === 'auth-signup') {
    return (
      <AuthForm 
        showSignup={true}
        onBack={() => setCurrentView('landing')}
      />
    );
  }

  if (currentView === 'auth-login') {
    return (
      <AuthForm 
        showSignup={false}
        onBack={() => setCurrentView('landing')}
      />
    );
  }

  return <LandingPage onGetStarted={() => setCurrentView('auth-signup')} onLogin={() => setCurrentView('auth-login')} />;
};

export default App;

