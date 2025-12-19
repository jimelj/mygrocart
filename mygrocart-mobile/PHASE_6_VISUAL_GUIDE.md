# Phase 6: Visual Guide - UI Components

This document describes the visual appearance of all Phase 6 components for documentation and testing purposes.

---

## 1. PriceFreshnessBadge Component

### Fresh Variant (Green)
```
┌──────────────────────────┐
│ ✓ Updated today          │  ← 16px checkmark icon + 12px text
└──────────────────────────┘
 ↑                         ↑
 8px padding              8px padding

Background: #D1FAE5 (Green 100)
Border: 1px solid #A7F3D0 (Green 200)
Text Color: #047857 (Green 700)
Icon: checkmark-circle (Ionicons)
```

**Triggers:**
- `priceAge` contains "today"
- `priceAge` contains "hour"

---

### Recent Variant (Yellow)
```
┌──────────────────────────┐
│ ⏰ 5 days ago            │  ← 16px clock icon + 12px text
└──────────────────────────┘

Background: #FEF3C7 (Yellow 100)
Border: 1px solid #FDE68A (Yellow 200)
Text Color: #92400E (Yellow 800)
Icon: time (Ionicons)
```

**Triggers:**
- `priceAge` contains "yesterday"
- `priceAge` matches regex `/\d+ day/`

---

### Stale Variant (Gray)
```
┌──────────────────────────┐
│ ⚠ Never updated         │  ← 16px alert icon + 12px text
└──────────────────────────┘

Background: #F3F4F6 (Gray 100)
Border: 1px solid #E5E7EB (Gray 200)
Text Color: #374151 (Gray 700)
Icon: alert-circle (Ionicons)
```

**Triggers:**
- `priceAge` contains "Never"
- `lastPriceUpdate` is null/undefined
- Fallback for any other case

---

## 2. EmptySearchState Component

### Layout
```
┌─────────────────────────────────────────────┐
│                                             │
│              🔍                            │  ← 64px search icon
│          (64px icon)                        │
│                                             │
│     No products found for "organic quinoa"  │  ← 20px heading, bold
│                                             │
│   We don't have this product yet,          │  ← 16px description
│        but you can request it!             │
│                                             │
│   ┌───────────────────────────────────┐   │
│   │ Request "organic quinoa"          │   │  ← 44px height button
│   └───────────────────────────────────┘   │     Green background
│                                             │
│         ⏰ We'll add it within 24 hours    │  ← 16px icon + 14px text
│                                             │
└─────────────────────────────────────────────┘

Width: Full screen - 32px horizontal padding
Colors:
- Icon: #9CA3AF (Gray 400)
- Heading: #111827 (Gray 900)
- Description: #6B7280 (Gray 500)
- Button: #16A34A (Green 600)
- Button Text: #FFFFFF (White)
- Footer Icon: #6B7280 (Gray 500)
- Footer Text: #6B7280 (Gray 500)
```

---

## 3. ProductSearchScreen - Updated Product Card

### Product Card with Price Freshness
```
┌─────────────────────────────────────────────────────────┐
│ [IMG]  Product Name Here                      [+]      │
│ 60x60  Brand Name • 16oz                               │
│        From $3.99 • 2 stores                           │
│        ┌───────────────┐  ┌─────────┐                 │
│        │ ⏰ 5 days ago │  │ Update  │                 │
│        └───────────────┘  └─────────┘                 │
└─────────────────────────────────────────────────────────┘
 ↑                          ↑          ↑
 60x60 image               Badge     Update button
                           (Yellow)   (Blue text, 44x44)

Spacing:
- Card padding: 12px all sides
- Gap between image and text: 12px
- Gap between badge and button: 8px
- Freshness row margin-top: 8px

Badge: Yellow "Recent" variant
Button: Blue text (#2563EB), 44x44 touch target
```

---

## 4. MyRequestsScreen - Request List

### Header
```
┌─────────────────────────────────────────────────────────┐
│  My Product Requests                                    │  ← 28px title
│  3 requests                                             │  ← 14px subtitle
└─────────────────────────────────────────────────────────┘

Background: #FFFFFF
Padding: 16px horizontal, 24px top, 16px bottom
Border bottom: 1px solid #E5E7EB
```

---

### Request Card - Pending
```
┌─────────────────────────────────────────────────────────┐
│  Organic Quinoa                          ┌──────────┐  │
│  Requested Nov 6, 2023                   │ pending  │  │
│                                          └──────────┘  │
└─────────────────────────────────────────────────────────┘
   ↑                                        ↑
   Product name (16px, bold)               Status badge
   Request date (14px, gray)               (Yellow)

Status Badge Colors:
Background: #FEF3C7 (Yellow 100)
Text: #92400E (Yellow 800)
```

---

### Request Card - Processing
```
┌─────────────────────────────────────────────────────────┐
│  Almond Milk                           ┌────────────┐  │
│  Requested Nov 5, 2023                 │ processing │  │
│                                        └────────────┘  │
└─────────────────────────────────────────────────────────┘

Status Badge Colors:
Background: #DBEAFE (Blue 100)
Text: #1E40AF (Blue 700)
```

---

### Request Card - Completed
```
┌─────────────────────────────────────────────────────────┐
│  Greek Yogurt                          ┌───────────┐   │
│  Requested Nov 3, 2023                 │ completed │   │
│  Completed Nov 4, 2023                 └───────────┘   │
└─────────────────────────────────────────────────────────┘
   ↑
   Completion date (12px, green)

Status Badge Colors:
Background: #D1FAE5 (Green 100)
Text: #047857 (Green 700)
```

---

### Request Card - Failed
```
┌─────────────────────────────────────────────────────────┐
│  Obscure Brand Product                ┌─────────┐      │
│  Requested Nov 1, 2023                │ failed  │      │
│                                       └─────────┘      │
└─────────────────────────────────────────────────────────┘

Status Badge Colors:
Background: #FEE2E2 (Red 100)
Text: #991B1B (Red 800)
```

---

### Empty State
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    📄                                  │  ← 64px icon
│               (64px document icon)                      │
│                                                         │
│              No Requests Yet                           │  ← 20px heading
│                                                         │
│       Search for products and request items            │  ← 16px text
│         that aren't in our database yet.               │
│                                                         │
└─────────────────────────────────────────────────────────┘

Icon: document-text-outline (Ionicons)
Icon Color: #9CA3AF (Gray 400)
Heading: #111827 (Gray 900)
Text: #6B7280 (Gray 500)
```

---

## 5. Bottom Tab Navigation

### Tab Bar Layout
```
┌────┬────┬────┬────┬────┬────┐
│Home│Srch│Scan│List│Reqs│Prof│  ← 6 tabs
└────┴────┴────┴────┴────┴────┘
  ↑    ↑    ↑    ↑    ↑    ↑
 home  🔍   📷   📋   📄   👤
 icon search barcode list doc person

Active Tab (Example: Requests)
┌────┬────┬────┬────┬──────┬────┐
│    │    │    │    │ 📄  │    │  ← Green icon
│    │    │    │    │Reqs  │    │  ← Green text
└────┴────┴────┴────┴──────┴────┘
                       ↑
                  Active: #16A34A

Inactive Tabs: #9CA3AF (Gray 400)
Tab Bar Height: 64px
Icon Size: 24px
Label Size: 12px, font-weight: 600
```

**Tab Order:**
1. Home (home/home-outline)
2. Search (search/search-outline)
3. Scanner (barcode/barcode-outline)
4. My List (list/list-outline)
5. **Requests** (document-text/document-text-outline) ← NEW
6. Profile (person/person-outline)

---

## 6. Interaction States

### Button States

**Normal (Request Button)**
```
┌─────────────────────────────┐
│ Request "organic quinoa"    │
└─────────────────────────────┘
Background: #16A34A (Green 600)
Text: #FFFFFF (White)
```

**Loading (Request Button)**
```
┌─────────────────────────────┐
│ Requesting...               │
└─────────────────────────────┘
Background: #9CA3AF (Gray 400)
Text: #FFFFFF (White)
Button: Disabled
```

**Pressed (Update Button)**
```
Update  ← Opacity: 0.7
```

---

### Alert Dialogs

**Success Alert (iOS Style)**
```
┌─────────────────────────────┐
│    Request Submitted        │
│                             │
│ Product "organic quinoa"    │
│ requested! We'll add it     │
│ within 24 hours.            │
│                             │
│          [OK]               │
└─────────────────────────────┘
```

**Error Alert (iOS Style)**
```
┌─────────────────────────────┐
│          Error              │
│                             │
│ Failed to submit request.   │
│ Please try again.           │
│                             │
│          [OK]               │
└─────────────────────────────┘
```

---

## 7. Loading States

### ProductSearchScreen Loading
```
┌─────────────────────────────────────┐
│                                     │
│         ⟳ (Spinning green)         │  ← ActivityIndicator
│                                     │
│      Searching stores...           │  ← 16px text
│                                     │
│  This may take 5-10 seconds        │  ← 14px subtext
│  while we check Target and         │
│  ShopRite                          │
│                                     │
└─────────────────────────────────────┘

Spinner Color: #16A34A (Green 600)
```

### MyRequestsScreen Loading
```
┌─────────────────────────────────────┐
│                                     │
│         ⟳ (Spinning green)         │
│                                     │
│      Loading requests...           │
│                                     │
└─────────────────────────────────────┘
```

---

## 8. Responsive Behavior

### Portrait Mode (Mobile)
- Full width cards
- Single column layout
- 16px horizontal padding

### Landscape Mode (Mobile)
- Same layout (no changes)
- Maintains single column for consistency

### Tablet (iPad)
- Same layout (could be enhanced in Phase 7)
- Potential: 2-column grid for requests

---

## 9. Touch Feedback

### Buttons
- **Press:** Opacity reduces to 0.7
- **Release:** Returns to opacity 1.0
- **Duration:** 150ms animation

### Cards
- **Press:** Background lightens slightly (optional)
- **Release:** Returns to normal
- Not implemented in Phase 6 (future enhancement)

---

## 10. Accessibility Features

### Screen Reader Labels

**Request Button:**
```
accessibilityLabel="Request organic quinoa"
accessibilityRole="button"
accessibilityState={{ disabled: false }}
```

**Update Button:**
```
accessibilityLabel="Request price update"
accessibilityRole="button"
```

**Status Badge (Non-interactive):**
```
accessibilityRole="text"
accessibilityLabel="Status: pending"
```

### Focus Order
1. Search input
2. Product cards (top to bottom)
3. Price freshness badge (focusable, reads text)
4. Update button (if present)
5. Add button

---

## Color Reference

### Primary Colors
```
Green 600: #16A34A  (Primary buttons, active states)
Blue 600:  #2563EB  (Links, Update button text)
Red 600:   #DC2626  (Errors, failed status)
```

### Semantic Colors
```
Fresh (Green):
  Background: #D1FAE5 (Green 100)
  Border: #A7F3D0 (Green 200)
  Text: #047857 (Green 700)

Recent (Yellow):
  Background: #FEF3C7 (Yellow 100)
  Border: #FDE68A (Yellow 200)
  Text: #92400E (Yellow 800)

Stale (Gray):
  Background: #F3F4F6 (Gray 100)
  Border: #E5E7EB (Gray 200)
  Text: #374151 (Gray 700)

Processing (Blue):
  Background: #DBEAFE (Blue 100)
  Text: #1E40AF (Blue 700)

Failed (Red):
  Background: #FEE2E2 (Red 100)
  Text: #991B1B (Red 800)
```

### Neutral Colors
```
Gray 50:  #F9FAFB  (Screen background)
Gray 100: #F3F4F6  (Card background, borders)
Gray 200: #E5E7EB  (Dividers)
Gray 400: #9CA3AF  (Icons, inactive states)
Gray 500: #6B7280  (Secondary text)
Gray 700: #374151  (Primary text)
Gray 900: #111827  (Headings)
White:    #FFFFFF  (Card background, button text)
```

---

## Summary

This visual guide documents all Phase 6 UI components with exact:
- Dimensions (px)
- Colors (hex codes)
- Spacing (px)
- Typography (px, weight)
- States (normal, hover, loading)
- Icons (Ionicons names)
- Accessibility (labels, roles)

Use this guide for:
- ✅ Design reviews
- ✅ QA testing
- ✅ Documentation
- ✅ Future enhancements

All measurements are in **logical pixels** (not physical pixels) as per React Native standard.
