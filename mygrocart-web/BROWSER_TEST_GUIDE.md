# Browser Testing Guide for Shopping List Integration

## Quick Start

### 1. Start Services

```bash
# Terminal 1: Start Backend (Port 5001)
cd mygrocart-backend-node
PORT=5001 NODE_ENV=development JWT_SECRET=pricepal-dev-secret-key-2024 node server.js

# Terminal 2: Start Frontend (Port 3000)
cd mygrocart-web
pnpm dev
```

### 2. Open Browser

Navigate to: `http://localhost:3000`

## Test Scenarios

### Scenario 1: New User Flow

1. **Go to Sign Up page:**
   ```
   http://localhost:3000/signup
   ```

2. **Create account:**
   - Email: `your-email@example.com`
   - Password: `test123456` (minimum 6 characters)
   - Name: `Your Name`
   - ZIP Code: `10001`
   - Click "Sign Up"

3. **Verify redirect:**
   - Should redirect to home page after successful signup
   - Should see your name in the header
   - Should see navigation links (Home, List, Comparison)

### Scenario 2: Shopping List Operations

1. **Navigate to Shopping List:**
   ```
   http://localhost:3000/list
   ```

2. **Search for products:**
   - Type "milk" in the search box
   - Wait for results to appear
   - Should see "Whole Milk - Dairy Best - 1 gallon"

3. **Add product to list:**
   - Click the green "+" button next to the product
   - Product should appear in "Your Shopping List" section
   - Quantity should show "1"

4. **Update quantity:**
   - Click "+" button to increment (1 → 2 → 3)
   - Click "-" button to decrement (3 → 2 → 1)
   - Verify number updates in real-time

5. **Verify persistence:**
   - Refresh the page (F5)
   - List should still show the item
   - Quantity should be preserved
   - This confirms data is saved to database

6. **Remove item:**
   - Click "-" button until quantity reaches 0
   - Item should disappear from list
   - Should see empty state message

### Scenario 3: Multiple Items

1. **Add multiple products:**
   - Search for "milk" → Add "Whole Milk"
   - Search for "bread" → Add any bread product
   - Search for "eggs" → Add any eggs product

2. **Verify list:**
   - All 3 items should appear in "Your Shopping List"
   - Each item should have independent quantity controls
   - Total item count should show "3 items"

3. **Navigate to Price Comparison:**
   - Click "Compare Prices" button
   - Should navigate to `/comparison` page
   - Should show your 3 items with store price comparisons

### Scenario 4: Authentication

1. **Logout:**
   - Click your name in the header
   - Click "Logout"
   - Should redirect to home page
   - Should clear shopping list from view

2. **Access protected page:**
   - Try to navigate to `http://localhost:3000/list`
   - Should automatically redirect to `/login`
   - This confirms authentication is working

3. **Login again:**
   - Enter your email and password
   - Click "Login"
   - Navigate to `/list`
   - Your shopping list should be restored
   - All items should still be there

## Expected UI Elements

### Shopping List Page (`/list`)

**Left Column - Product Search:**
- Search input with magnifying glass icon
- Loading spinner while searching
- Product results with:
  - Product image (emoji)
  - Product name (bold)
  - Brand and size (gray text)
  - Green "+" button to add

**Right Column - Your Shopping List:**
- Header showing item count
- "Compare Prices" button (if list not empty)
- List items with:
  - Product image (emoji)
  - Product name and details
  - Quantity controls (-, number, +)
- Empty state message (if no items)
- "Compare Now" CTA at bottom (if items exist)

### Empty State
```
┌─────────────────────────────────┐
│         🛒 Shopping Cart         │
│   Your shopping list is empty   │
│  Search for products to add     │
│       them to your list         │
└─────────────────────────────────┘
```

### With Items
```
┌─────────────────────────────────┐
│ 🛒 Your Shopping List (2 items) │
│                                 │
│ 🥛 Whole Milk                   │
│    Dairy Best - 1 gallon        │
│    [-] 2 [+]                    │
│                                 │
│ 🍞 White Bread                  │
│    Wonder Bread - 20 oz         │
│    [-] 1 [+]                    │
│                                 │
│  [Compare Prices]               │
└─────────────────────────────────┘
```

## Browser Console Checks

### 1. Open DevTools (F12)

### 2. Check Network Tab
- Filter by "graphql"
- Should see POST requests to `http://localhost:5001/graphql`
- Check request headers for `Authorization: Bearer <token>`
- Check response data for successful operations

### 3. Check Console Tab
- Should have no errors (red messages)
- May see info logs (blue messages) - this is normal

### 4. Check Application Tab (Storage)
- Go to Application → Local Storage → `http://localhost:3000`
- Should see:
  - `auth_token`: JWT token string
  - `auth_user`: JSON string with user data

## Common Issues & Solutions

### Issue: "Authentication required" error
**Solution:**
1. Check localStorage has `auth_token`
2. Try logging in again
3. Check backend is running on port 5001

### Issue: Products not appearing in search
**Solution:**
1. Backend is using sample data (6 products)
2. Try searching: "milk", "bread", "eggs", "chicken", "cheese", "pasta"
3. Real products will come from scrapers in Phase 2

### Issue: Items not persisting after refresh
**Solution:**
1. Check backend logs for database errors
2. Verify PostgreSQL is running: `psql -U postgres -d mygrocart -c "SELECT * FROM \"UserLists\""`
3. Check backend environment variables are set correctly

### Issue: Port 5001 already in use
**Solution:**
```bash
# Find and kill process
lsof -ti :5001 | xargs kill -9

# Restart backend
PORT=5001 NODE_ENV=development JWT_SECRET=pricepal-dev-secret-key-2024 node server.js
```

### Issue: Next.js build errors
**Solution:**
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
pnpm install

# Restart dev server
pnpm dev
```

## GraphQL Playground Testing

### 1. Open GraphQL Playground
```
http://localhost:5001/graphql
```

### 2. Test Query (No Auth Required)
```graphql
query {
  searchProducts(query: "milk") {
    upc
    name
    brand
    size
  }
}
```

### 3. Test Authenticated Query
```graphql
# First, set HTTP Headers:
{
  "Authorization": "Bearer YOUR_JWT_TOKEN_HERE"
}

# Then run query:
query {
  getUserGroceryLists(userId: "YOUR_USER_ID") {
    listItemId
    quantity
    product {
      name
      brand
    }
  }
}
```

### 4. Test Mutation
```graphql
# HTTP Headers:
{
  "Authorization": "Bearer YOUR_JWT_TOKEN_HERE"
}

# Mutation:
mutation {
  addGroceryListItem(
    userId: "YOUR_USER_ID"
    upc: "123456789013"
    quantity: 1
  ) {
    listItemId
    quantity
    product {
      name
      brand
    }
  }
}
```

## Performance Benchmarks

### Expected Response Times
- Product search: < 100ms
- Add item: < 200ms
- Update quantity: < 100ms
- Remove item: < 100ms
- Fetch list: < 100ms

### If response times are slow:
1. Check database connection
2. Check backend logs for errors
3. Verify PostgreSQL indexes are created
4. Check network latency in DevTools

## Screenshots to Take

### For Documentation:

1. **Home Page** (`/`)
   - Landing page with hero section
   - "Get Started" button
   - Navigation header

2. **Signup Page** (`/signup`)
   - Signup form
   - Email, password, name, ZIP code fields

3. **Login Page** (`/login`)
   - Login form
   - Email and password fields

4. **Shopping List - Empty** (`/list`)
   - Empty state with cart icon
   - Search box

5. **Shopping List - Search Results** (`/list`)
   - Search for "milk"
   - Results showing products

6. **Shopping List - With Items** (`/list`)
   - Multiple items in list
   - Quantity controls visible
   - "Compare Prices" button

7. **Shopping List - DevTools** (`/list`)
   - Network tab showing GraphQL requests
   - Console tab (no errors)
   - Application tab showing localStorage

8. **Price Comparison** (`/comparison`)
   - Store comparison results
   - Total costs per store
   - Savings calculations

## Success Criteria

✅ All test scenarios pass
✅ No errors in browser console
✅ GraphQL requests succeed (200 status)
✅ Data persists after page refresh
✅ Authentication redirects work
✅ UI updates in real-time
✅ Loading states appear correctly
✅ Empty states display properly

---

**Last Updated:** 2025-11-01
**Status:** Ready for testing
**Backend:** http://localhost:5001
**Frontend:** http://localhost:3000
