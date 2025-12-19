# MyGroCart Mobile App

React Native mobile application for MyGroCart - Find the best grocery deals near you.

## Tech Stack

- **React Native**: 0.81.5
- **React**: 19.1.0
- **Expo**: ~54.0.20
- **TypeScript**: ~5.9.2
- **Navigation**: React Navigation 7 (Bottom Tabs)
- **GraphQL**: Apollo Client 4.0.9
- **Camera**: expo-camera, expo-barcode-scanner
- **State**: React Context API + Apollo Cache

## Project Structure

```
src/
├── screens/               # All app screens
│   ├── HomeScreen.tsx            # Home dashboard
│   ├── ProductSearchScreen.tsx   # Product search with debouncing
│   ├── BarcodeScannerScreen.tsx  # Barcode scanner with camera
│   ├── ListScreen.tsx            # Shopping list management
│   ├── ProfileScreen.tsx         # User profile
│   └── ComparisonScreen.tsx      # Price comparison view
├── navigation/
│   └── TabNavigator.tsx          # Bottom tab navigation
├── context/
│   └── AuthContext.tsx           # Authentication state management
├── graphql/
│   ├── client.ts                 # Apollo Client setup
│   └── queries.ts                # GraphQL queries and mutations
├── components/                   # Reusable components (empty for now)
└── types/                        # TypeScript type definitions
```

## Features Implemented (Day 4)

### 1. Barcode Scanner Screen
- Camera access with permission handling
- Real-time barcode scanning (UPC-A, UPC-E, EAN-13, EAN-8)
- OpenFoodFacts API integration for product lookup
- Scan overlay with corner guides
- Product details display after scan
- Add to list functionality
- Error handling for denied permissions

**Key Features:**
- Green corner guides (#16A34A) for scan area
- Product info: name, brand, size, UPC
- Success/error states with icons
- "Scan Another" or "View List" options after adding

### 2. Product Search Screen
- Search input with debouncing (500ms delay)
- GraphQL `searchProducts` query integration
- Scrollable product grid with cards
- Product cards show: image, name, brand, size
- Add to list button on each card
- Empty states:
  - Before search: "Search for Products"
  - While typing (< 3 chars): "Keep Typing..."
  - No results: "No Products Found"
- Loading states with spinner
- Clear search button (X icon)

**Design Details:**
- Search bar: 48px height, gray background
- Product cards: white background, 12px border-radius
- Add button: green icon (#16A34A)
- Image placeholder: gray cube icon for missing images

### 3. Navigation
- Bottom tab navigation with 5 tabs:
  1. **Home** - Dashboard with quick actions
  2. **Search** - Product search
  3. **Scanner** - Barcode scanner (no header)
  4. **List** - Shopping list
  5. **Profile** - User profile
- Active tab color: Green 600 (#16A34A)
- Inactive tab color: Gray 400 (#9CA3AF)
- Icons from `@expo/vector-icons` (Ionicons)

### 4. Home Screen
- Personalized greeting with user name
- Three action cards:
  - **Scan Barcode** (primary green card)
  - **Search Products** (secondary white card)
  - **My Shopping List** (secondary white card)
- "How it works" section with 3 steps
- Follows DESIGN_SYSTEM.md specifications

### 5. Shopping List Screen
- Displays user's grocery list items
- Quantity controls (increment/decrement)
- Remove item with confirmation dialog
- Product images with placeholder fallback
- "Compare Prices" button when list has items
- Empty state: "Your list is empty"
- Loading and error states

### 6. Profile Screen
- User info display (name, email, avatar)
- Settings menu items:
  - Location Settings
  - Notifications
  - Payment Methods
- About section:
  - Help & Support
  - Terms & Conditions
  - Privacy Policy
  - Version (1.0.0)
- Logout with confirmation
- Not logged in state

### 7. Price Comparison Screen
- Displays stores sorted by total cost
- Cheapest store badge
- Distance from user location
- Total cost per store
- Savings calculation
- Store ranking (#1, #2, etc.)
- View details button (placeholder)

### 8. Authentication Context
- JWT token management
- AsyncStorage for persistence
- Login/logout functionality
- User state management
- Loading states

## Setup Instructions

### Prerequisites
- Node.js 18+ and pnpm 10.4.1+
- Expo Go app on your phone (iOS/Android)
- Backend server running on `http://localhost:5000`

### Installation

1. Install dependencies:
```bash
pnpm install
```

2. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Start the development server:
```bash
pnpm dev
# or
pnpm start
```

4. Open Expo Go on your phone and scan the QR code

### Testing Barcode Scanner

To test barcode scanning:
1. Navigate to the Scanner tab
2. Allow camera permissions
3. Point camera at a product barcode (UPC/EAN)
4. The app will fetch product info from OpenFoodFacts
5. Add the product to your list

**Supported barcode formats:**
- UPC-A (12 digits)
- UPC-E (6-8 digits)
- EAN-13 (13 digits)
- EAN-8 (8 digits)

### Testing Product Search

1. Navigate to the Search tab
2. Type a product name (minimum 3 characters)
3. Results will appear after 500ms debounce
4. Tap the green "+" icon to add to list

## Environment Variables

```env
EXPO_PUBLIC_GRAPHQL_ENDPOINT=http://localhost:5000/graphql
```

**Important:** For physical devices, replace `localhost` with your computer's IP address:
```env
EXPO_PUBLIC_GRAPHQL_ENDPOINT=http://192.168.1.100:5000/graphql
```

To find your IP:
- **macOS/Linux**: `ifconfig | grep inet`
- **Windows**: `ipconfig`

## GraphQL Integration

All GraphQL queries/mutations are defined in `src/graphql/queries.ts`:

**Queries:**
- `SEARCH_PRODUCTS` - Search for products
- `GET_USER_GROCERY_LISTS` - Get user's shopping list
- `COMPARE_PRICES` - Compare prices across stores

**Mutations:**
- `SIGNUP` - Create new user account
- `LOGIN` - Authenticate user
- `ADD_GROCERY_LIST_ITEM` - Add product to list
- `UPDATE_GROCERY_LIST_ITEM` - Update quantity
- `REMOVE_GROCERY_LIST_ITEM` - Remove from list

Apollo Client configuration includes:
- Auth link (Bearer token injection)
- In-memory cache
- Error handling

## Design System Compliance

All screens follow `/Users/jimelj/WebDev/MyGroCart/DESIGN_SYSTEM.md`:

**Colors:**
- Primary Green: #16A34A
- Red: #DC2626
- Gray scale: #111827 (text) to #F9FAFB (background)

**Typography:**
- Regular text: 16px
- Headings: 24-28px bold
- Small text: 12-14px

**Spacing:**
- Card padding: 16-20px
- Button height: 44px minimum (touch-friendly)
- Border radius: 8-12px

**Accessibility:**
- WCAG 2.1 AA contrast ratios
- 44x44px minimum touch targets
- Screen reader support (future enhancement)

## Known Issues

1. **Login/Signup Flow:** Not yet implemented. Currently using mock user from context.
2. **Backend Connection:** Requires backend server running. Update `EXPO_PUBLIC_GRAPHQL_ENDPOINT` for physical devices.
3. **OpenFoodFacts API:** Some products may not be in their database. Returns "Product Not Found" error.
4. **Camera Permissions:** Must be granted on first use. App handles denied state gracefully.

## Next Steps (Future Development)

1. **Authentication Screens:**
   - Login screen
   - Signup screen
   - Forgot password

2. **Enhanced Features:**
   - Store detail view
   - Product detail view
   - Map view for stores
   - Price history charts
   - Push notifications

3. **Offline Support:**
   - Apollo cache persistence
   - Offline queue for mutations
   - Sync on reconnect

4. **Performance:**
   - Image lazy loading
   - List virtualization
   - Optimistic UI updates

## Troubleshooting

### Metro bundler errors
```bash
# Clear cache
pnpm start --clear
```

### Camera not working
- Check permissions in device settings
- Restart Expo Go app
- Ensure physical device (camera doesn't work in simulator)

### GraphQL errors
- Verify backend is running on port 5000
- Check `EXPO_PUBLIC_GRAPHQL_ENDPOINT` in `.env`
- For physical devices, use computer's IP instead of localhost

### Build errors
```bash
# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## Development Notes

- **Hot Reload:** Enabled by default. Changes reflect immediately.
- **TypeScript:** Strict mode enabled. Run `tsc --noEmit` to check types.
- **Debugging:** Use React Native Debugger or Chrome DevTools.
- **Icons:** Using Ionicons from `@expo/vector-icons`.

## Contributing

Follow the project's coding standards:
1. Use TypeScript for all new files
2. Follow DESIGN_SYSTEM.md for UI/UX
3. Add error handling for all API calls
4. Include loading states for async operations
5. Test on both iOS and Android

## License

Private - MyGroCart Project
