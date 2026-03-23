# MyGroCart Backend Test Suite

This directory contains Jest-based unit and integration tests for the MyGroCart backend.

## Running Tests

```bash
# Run all tests
npm test
# or
pnpm test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npx jest tests/imageQuality.test.js

# Run specific test suite
npx jest tests/imageQuality.test.js -t "Cloudinary URL Transformations"

# Run specific test
npx jest tests/imageQuality.test.js -t "should use quality auto"
```

## Test Files

### imageQuality.test.js

Comprehensive test suite for image quality handling across the flyer processing pipeline.

**Test Coverage: 27 tests**

#### 1. Cloudinary URL Transformations (4 tests)
   - Quality auto (q_auto) transformation
   - Format auto (f_auto) transformation
   - Responsive sizing transforms (800px, 1200px, 1600px)
   - Combined q_auto and f_auto for optimal delivery

#### 2. Flyer Image Quality Tiers (4 tests)
   - **Tier 1:** ≤120 tiles uses zoom level 5 (highest quality)
   - **Tier 2:** 121-300 tiles uses zoom level 4 (medium quality)
   - **Tier 3:** >300 tiles uses zoom level 0 (low-memory mode)
   - Tile count calculation from dimensions

**Implementation Details:**
- Tier 1 (≤120 tiles): Full quality stitching at zoom 5, JPEG 85%
- Tier 2 (121-300 tiles): Medium quality at zoom 4, JPEG 85%
- Tier 3 (>300 tiles): Low-memory individual pages at zoom 0

#### 3. JPEG Quality Settings (4 tests)
   - Stitched images use 85% quality
   - Split pages use 90% quality
   - File size vs quality balance (30-35% savings)
   - High quality maintenance for split pages

**Quality Rationale:**
- 85% quality: Optimal balance for large stitched flyers (~35% smaller than 100%)
- 90% quality: Higher quality for individual page viewing

#### 4. Deal Card Images (7 tests)
   - Deal cards have imageUrl field
   - Missing images handled with null fallback
   - imageUrl format validation (HTTPS, valid extensions)
   - OpenFoodFacts image enrichment integration
   - Multiple deals batch enrichment
   - Partial enrichment failure handling
   - OpenFoodFacts API rate limiting (150ms delay)

**OpenFoodFacts Integration:**
- Endpoint: `https://world.openfoodfacts.org/cgi/search.pl`
- Rate limit: 10 requests/minute (150ms delay between requests)
- Image fields: `image_front_url`, `image_url`, `image_small_url`

#### 5. Image Quality Best Practices (6 tests)
   - JPEG preferred for flyer images (better compression)
   - WebP support for modern browsers
   - Image dimension validation (256-8192px range)
   - Cloudinary upload failure handling with CDN fallback
   - Compression settings for large images
   - Processed image caching (prevents reprocessing)

#### 6. Integration Tests (2 tests)
   - Complete flyer processing workflow with quality checks
   - Concurrent image processing efficiency

## Test Results

```
Test Suites: 1 passed, 1 total
Tests:       27 passed, 27 total
Time:        3.453 s
```

All tests passing with proper mocking of:
- Cloudinary SDK (upload, upload_stream, url)
- Axios HTTP client
- Sequelize models (Deal, Flyer, Store)

## Test Configuration

Tests are configured via `jest.config.js` in the project root.

**Key settings:**
- Test environment: Node.js
- Test timeout: 10 seconds
- Coverage threshold: 70% (branches, functions, lines, statements)
- Setup file: `tests/setup.js`

## Files Tested

- `services/FlyerService.js` - Image download, stitching, quality tiers
- `models/Deal.js` - Deal model with imageUrl field
- `models/Flyer.js` - Flyer model with imageUrls array
- Cloudinary integration - URL transformations and uploads
- OpenFoodFacts API - Product image enrichment

## Implementation Details

### Flyer Quality Tiers

```javascript
const TILE_SIZE = 256;
const MAX_TILES = 120;      // Tier 1 threshold
const MEDIUM_TILES = 300;   // Tier 2 threshold

const totalTiles = Math.ceil(width / TILE_SIZE) * Math.ceil(height / TILE_SIZE);

if (totalTiles <= MAX_TILES) {
  // Tier 1: Full quality at zoom 5
  downloadFlyerImages(flyerPath, cols, rows, zoomLevel: 5);
} else if (totalTiles <= MEDIUM_TILES) {
  // Tier 2: Medium quality at zoom 4
  downloadFlyerMediumQuality(flyerPath, cols, rows);
} else {
  // Tier 3: Low-memory mode at zoom 0
  downloadFlyerPagesLowMemory(flyerPath);
}
```

### JPEG Quality Settings

```javascript
// Stitched flyer images
sharp(buffer).jpeg({ quality: 85 }).toBuffer();

// Split page images
sharp(buffer).jpeg({ quality: 90 }).toBuffer();
```

### Deal Image Enrichment

```javascript
// services/FlyerService.js
async enrichDealsWithImages(deals) {
  for (const deal of deals) {
    const imageUrl = await searchProductImage(deal.productName, deal.productBrand);
    enrichedDeals.push({ ...deal, imageUrl });
    await delay(150); // Rate limiting
  }
}
```

## Writing New Tests

### Test Structure

```javascript
describe('Feature Name', () => {
  let service;

  beforeEach(() => {
    service = new ServiceClass();
    jest.clearAllMocks();
  });

  test('should do something specific', async () => {
    // Arrange
    const mockData = { ... };

    // Act
    const result = await service.method(mockData);

    // Assert
    expect(result).toBeDefined();
    expect(result.property).toBe(expectedValue);
  });
});
```

### Mocking Best Practices

1. **Mock before requiring modules**
   ```javascript
   jest.mock('module-name', () => ({ ... }));
   const Module = require('module-name');
   ```

2. **Use appropriate mock methods**
   - `mockResolvedValue()` - for single async call
   - `mockResolvedValueOnce()` - for sequence of async calls
   - `mockImplementation()` - for custom logic
   - `mockReturnValue()` - for sync calls

3. **Clear mocks between tests**
   ```javascript
   beforeEach(() => {
     jest.clearAllMocks();
   });
   ```

## Coverage Goals

- Unit tests: Test individual functions and methods
- Integration tests: Test interactions between services
- Edge cases: Test error handling and boundary conditions
- Performance: Test rate limiting and concurrency

## Debugging Tests

### Run with verbose output
```bash
npx jest --verbose
```

### Run without silent mode (show console logs)
```bash
npx jest --silent=false
```

### Debug specific test
```bash
node --inspect-brk node_modules/.bin/jest tests/imageQuality.test.js -t "test name"
```

## CI/CD Integration

Tests run automatically on:
- Pull request creation
- Push to main branch
- Pre-deployment checks

Failed tests block deployment.

## Future Test Coverage

- [ ] Deal matching algorithm (utils/DealMatcher.js)
- [ ] Store comparison logic (resolvers/index.js)
- [ ] Shopping list persistence
- [ ] Daily digest notification logic
- [ ] Flyer OCR accuracy testing
- [ ] GraphQL resolver tests
- [ ] Authentication middleware tests
- [ ] Redis caching tests

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Jest Matchers](https://jestjs.io/docs/expect)
- [Jest Mock Functions](https://jestjs.io/docs/mock-functions)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
