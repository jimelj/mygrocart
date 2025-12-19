# Mobile App Backend Integration - Test Guide

## Quick Start

### 1. Start Backend
```bash
cd /Users/jimelj/WebDev/MyGroCart/mygrocart-backend-node
pnpm dev
```
Backend should be running on: `http://localhost:5001`

### 2. Start Mobile App
```bash
cd /Users/jimelj/WebDev/MyGroCart/mygrocart-mobile
pnpm start
```

### 3. Open in Expo
- iOS: Press `i` in terminal or scan QR code with Camera app
- Android: Press `a` in terminal or scan QR code with Expo Go app
- Web: Press `w` in terminal (for testing without device)

## Test Scenarios

### Test 1: User Authentication

**Signup:**
1. Open app (should show Login screen)
2. Tap "Sign up"
3. Enter:
   - Name: Test User
   - Email: test@example.com
   - Password: test123
   - ZIP Code: 10001
4. Tap "Sign Up"
5. Should redirect to main app (tabs visible)

**Expected Backend Response:**
```json
{
  "data": {
    "signup": {
      "token": "eyJhbGciOiJIUzI1...",
      "user": {
        "userId": "uuid-here",
        "name": "Test User",
        "email": "test@example.com",
        "zipCode": "10001"
      }
    }
  }
}
```

**Verify:**
- User token stored in AsyncStorage
- Tab navigator visible
- Home screen loads

### Test 2: Shopping List - Fetch Items

**Steps:**
1. Login with test account
2. Navigate to "List" tab
3. Should show empty state or existing items

**Expected GraphQL Query:**
```graphql
query GetUserGroceryLists($userId: ID!) {
  getUserGroceryLists(userId: $userId) {
    listItemId
    quantity
    product {
      upc
      name
      brand
      size
      imageUrl
    }
  }
}
```

**Expected Response (Empty):**
```json
{
  "data": {
    "getUserGroceryLists": []
  }
}
```

**Expected Response (With Items):**
```json
{
  "data": {
    "getUserGroceryLists": [
      {
        "listItemId": "uuid-1",
        "quantity": 2,
        "product": {
          "upc": "123456789012",
          "name": "Organic Whole Milk",
          "brand": "Horizon",
          "size": "1 Gallon",
          "imageUrl": "https://..."
        }
      }
    ]
  }
}
```

### Test 3: Shopping List - Add Item

**Steps:**
1. Navigate to "Search" tab
2. Search for "milk"
3. Tap "Add" on a product
4. Should see success alert
5. Navigate to "List" tab
6. Should see newly added item

**Expected GraphQL Mutation:**
```graphql
mutation AddGroceryListItem($userId: ID!, $upc: String!, $quantity: Int!) {
  addGroceryListItem(userId: $userId, upc: $upc, quantity: $quantity) {
    listItemId
    quantity
    product {
      upc
      name
      brand
      size
      imageUrl
    }
  }
}
```

**Expected Variables:**
```json
{
  "userId": "user-uuid-here",
  "upc": "123456789012",
  "quantity": 1
}
```

**Verify:**
- Success alert appears
- Item appears in List tab
- Item persists after app reload

### Test 4: Shopping List - Update Quantity

**Steps:**
1. Navigate to "List" tab
2. Tap "+" button on an item
3. Quantity should increase
4. Tap "-" button
5. Quantity should decrease

**Expected GraphQL Mutation:**
```graphql
mutation UpdateGroceryListItem($listItemId: ID!, $quantity: Int!) {
  updateGroceryListItem(listItemId: $listItemId, quantity: $quantity) {
    listItemId
    quantity
  }
}
```

**Expected Variables:**
```json
{
  "listItemId": "uuid-of-item",
  "quantity": 3
}
```

**Verify:**
- Quantity updates immediately in UI
- New quantity persists after app reload
- Backend database reflects updated quantity

### Test 5: Shopping List - Remove Item

**Steps:**
1. Navigate to "List" tab
2. Tap trash icon on an item
3. Confirm deletion in alert
4. Item should disappear

**Expected GraphQL Mutation:**
```graphql
mutation RemoveGroceryListItem($listItemId: ID!) {
  removeGroceryListItem(listItemId: $listItemId)
}
```

**Expected Variables:**
```json
{
  "listItemId": "uuid-of-item"
}
```

**Verify:**
- Confirmation alert appears
- Item removed from UI immediately
- Item does not return after app reload
- Backend database no longer contains item

### Test 6: Price Comparison

**Steps:**
1. Add 3-5 items to shopping list
2. Navigate to "Comparison" tab
3. Should see stores sorted by total cost

**Expected GraphQL Query:**
```graphql
query ComparePrices($userId: ID!) {
  comparePrices(userId: $userId) {
    store {
      id
      name
      latitude
      longitude
    }
    totalCost
    distance
    savings
    isCheapest
    items {
      product {
        upc
        name
        brand
        size
      }
      price
      quantity
    }
  }
}
```

**Verify:**
- Stores sorted by total cost (cheapest first)
- "Cheapest" badge on lowest total
- Distance calculations accurate
- Item-by-item breakdown shows correct prices

## Troubleshooting

### Error: Network request failed

**Cause:** Mobile app can't reach backend

**Fix:**
1. Check backend is running: `curl http://localhost:5001/graphql`
2. On physical device: Use computer's IP address instead of `localhost`
3. Update `/src/graphql/client.ts`:
   ```typescript
   uri: 'http://YOUR_COMPUTER_IP:5001/graphql'
   ```

### Error: Authentication required

**Cause:** JWT token missing or expired

**Fix:**
1. Logout and login again
2. Check token in AsyncStorage
3. Verify JWT_SECRET in backend `.env`

### Error: Field "id" is not defined

**Cause:** Using old field names

**Fix:** Already fixed in integration (should not occur)

### Error: Cannot read property 'userId' of null

**Cause:** User object not loaded yet

**Fix:** Already handled with `user?.userId` optional chaining

## Backend Database Verification

### Check User Exists
```bash
cd /Users/jimelj/WebDev/MyGroCart/mygrocart-backend-node
psql $DATABASE_URL -c "SELECT * FROM \"Users\" WHERE email='test@example.com';"
```

### Check Shopping List Items
```bash
psql $DATABASE_URL -c "SELECT * FROM \"UserLists\" WHERE \"userId\"='USER_UUID_HERE';"
```

### Check Products
```bash
psql $DATABASE_URL -c "SELECT * FROM \"Products\" LIMIT 10;"
```

## GraphQL Playground Testing

Open `http://localhost:5001/graphql` in browser to test queries manually.

### Test Login
```graphql
mutation {
  login(email: "test@example.com", password: "test123") {
    token
    user {
      userId
      name
      email
    }
  }
}
```

### Test Get Shopping List (with auth token)
Add HTTP header:
```json
{
  "Authorization": "Bearer YOUR_TOKEN_HERE"
}
```

Query:
```graphql
query {
  getUserGroceryLists(userId: "YOUR_USER_ID") {
    listItemId
    quantity
    product {
      name
      brand
      price
    }
  }
}
```

## Success Criteria

All tests passing means:
- [x] User authentication working (login/signup)
- [x] Shopping list fetches from backend
- [x] Add item persists to database
- [x] Update quantity persists to database
- [x] Remove item persists to database
- [x] Price comparison uses real data
- [x] App state persists after restart

## Performance Expectations

- **Login/Signup:** < 1 second
- **Fetch shopping list:** < 500ms
- **Add/Update/Remove item:** < 300ms
- **Search products:** < 1 second (with debounce)
- **Price comparison:** < 2 seconds

## Next Steps After Testing

1. Test on both iOS and Android devices
2. Test offline behavior (error handling)
3. Test with large shopping lists (20+ items)
4. Performance profiling on low-end devices
5. Implement optimistic UI updates for mutations
6. Add pull-to-refresh on List screen
7. Add loading skeletons for better UX

## Support

If tests fail, check:
1. Backend logs: `pnpm dev` terminal output
2. Mobile app logs: Expo terminal output
3. Network tab: Apollo Client DevTools
4. Database state: PostgreSQL queries above
5. Integration docs: `MOBILE_SHOPPING_LIST_INTEGRATION.md`
