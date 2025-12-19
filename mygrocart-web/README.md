# MyGroCart Web - Next.js Frontend

This is the Next.js 15 frontend for MyGroCart, a grocery price comparison application.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **UI Components:** ShadCN UI + Radix UI
- **GraphQL Client:** Apollo Client 4
- **Icons:** Lucide React
- **Package Manager:** pnpm

## Project Structure

```
mygrocart-web/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout with fonts and metadata
│   ├── page.tsx           # Landing page
│   ├── search/            # Product search page
│   └── admin/             # Admin dashboard
├── components/
│   └── ui/                # ShadCN UI components
│       ├── button.tsx
│       ├── card.tsx
│       └── input.tsx
├── lib/
│   ├── graphql/
│   │   ├── client.ts      # Apollo Client setup
│   │   └── queries.ts     # GraphQL queries and mutations
│   └── utils.ts           # Utility functions (cn, etc.)
└── public/                # Static assets
```

## Getting Started

### Prerequisites

- Node.js 18+ or 20+
- pnpm 10.4.1+
- Backend GraphQL API running at `http://localhost:5000/graphql`

### Installation

```bash
# Install dependencies
pnpm install

# Create environment file
cp .env.example .env.local

# Start development server
pnpm dev
```

The app will be available at `http://localhost:3000`.

### Environment Variables

Create a `.env.local` file with:

```
NEXT_PUBLIC_GRAPHQL_ENDPOINT=http://localhost:5000/graphql
```

## Available Scripts

- `pnpm dev` - Start development server (http://localhost:3000)
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## Design System

This project follows the MyGroCart Design System (see `../DESIGN_SYSTEM.md`):

### Colors

- **Primary:** Green 600 (`#16A34A`) - Primary actions, savings
- **Accent:** Red 600 (`#DC2626`) - Alerts, Blue 500 (`#3B82F6`) - Links
- **Neutral:** Gray scale (50-900)

### Typography

- **Headings:** Inter Bold
- **Body:** Inter Regular
- **Prices/Numbers:** JetBrains Mono

## GraphQL Integration

### Apollo Client

The Apollo Client is configured for Next.js App Router with RSC support:

```typescript
// lib/graphql/client.ts
import { getClient } from '@/lib/graphql/client';

const { data } = await getClient().query({
  query: SEARCH_PRODUCTS,
  variables: { query: 'milk' }
});
```

### Available Queries

- `SEARCH_PRODUCTS` - Search for products
- `GET_USER_GROCERY_LISTS` - Get user's shopping list
- `COMPARE_PRICES` - Compare prices across stores

### Available Mutations

- `SIGNUP` / `LOGIN` - User authentication
- `ADD_GROCERY_LIST_ITEM` - Add item to list
- `UPDATE_GROCERY_LIST_ITEM` - Update quantity
- `REMOVE_GROCERY_LIST_ITEM` - Remove item from list

## Pages

### Landing Page (`/`)

- Hero section with gradient background
- Features section explaining how the app works
- Links to search and admin pages

### Product Search (`/search`)

Coming soon:
- Debounced search input (300ms delay)
- Product grid (responsive)
- Skeleton loading states
- Add to list functionality

### Admin Dashboard (`/admin`)

Coming soon:
- Store request management
- Scraping job monitoring
- Real-time updates

## Development Guidelines

### Adding New Components

1. Create component in `components/` or `components/ui/`
2. Follow ShadCN UI patterns for consistency
3. Use design system colors and spacing
4. Ensure responsive design (mobile-first)

### Styling Guidelines

- Use Tailwind CSS utility classes
- Follow design system spacing (4px base unit)
- Ensure WCAG 2.1 AA contrast ratios
- Test on mobile, tablet, and desktop breakpoints

## Troubleshooting

### Port 3000 already in use

```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
pnpm dev -- -p 3001
```

### GraphQL connection errors

Ensure the backend is running at `http://localhost:5000/graphql`:

```bash
cd ../mygrocart-backend-node
pnpm dev
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Apollo Client Documentation](https://www.apollographql.com/docs/react/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [ShadCN UI](https://ui.shadcn.com/)

## License

Private project - All rights reserved
