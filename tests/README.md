# CultivAI Pro - Comprehensive Test Suite

A comprehensive testing suite for the CultivAI Pro cannabis cultivation management system, covering photo analysis, trichome analysis, and all related features.

## 📋 Test Coverage Overview

### Test Types

| Type | Location | Description | Coverage |
|------|----------|-------------|----------|
| **Unit Tests** | `tests/unit/` | Individual functions and components | 90%+ |
| **Integration Tests** | `tests/integration/` | API endpoints and database operations | 85%+ |
| **E2E Tests** | `tests/e2e/` | Complete user workflows | 100% critical paths |
| **Visual Tests** | `tests/visual/` | UI screenshots and regression | All major pages |
| **Performance Tests** | `tests/performance/` | Image processing benchmarks | < 10s processing |
| **Security Tests** | `tests/security/` | Input validation and security | All vectors |

### Coverage Areas

✅ **Image Processing**
- Format validation (JPEG, PNG, HEIC, WebP)
- Image compression and optimization
- HEIC conversion
- Image metadata extraction
- Size validation

✅ **Photo Analysis**
- Plant health analysis API
- Image analysis with AI
- Trichome maturity detection
- Harvest readiness calculation
- Nutrient deficiency diagnosis
- Pest and disease detection

✅ **API Endpoints**
- `/api/analyze` - Main analysis endpoint
- `/api/trichome-analysis` - Trichome analysis
- `/api/automation/batch` - Batch processing
- `/api/plants/*` - Plant management
- `/api/settings/*` - Configuration

✅ **Database Operations**
- Plant CRUD operations
- Analysis history
- Strain management
- Batch records

✅ **Workflows**
- Complete photo analysis workflow
- Trichome analysis workflow
- Batch analysis workflow
- Export/import workflows

## 🚀 Getting Started

### Prerequisites

```bash
Node.js >= 18
npm >= 9
```

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Environment Setup

Create `.env.test`:

```env
NODE_ENV=test
DATABASE_URL=file:./test.db
OPENROUTER_API_KEY=test-api-key
LM_STUDIO_URL=http://localhost:1234
PLAYWRIGHT_BASE_URL=http://localhost:3000
```

## 🧪 Running Tests

### Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run with coverage
npm run test:unit -- --coverage

# Run specific test file
npm run test:unit -- image.test.ts

# Watch mode
npm run test:unit -- --watch
```

### Integration Tests

```bash
# Run integration tests
npm run test:integration

# With database setup
npm run test:integration -- --setup-db
```

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run on specific browser
npm run test:e2e -- --project=chromium

# Run headed
npm run test:e2e -- --headed

# Run single test
npm run test:e2e -- photo-analysis-workflow.test.ts
```

### Visual Tests

```bash
# Update visual baselines
npm run test:visual -- --update-snapshots

# Run visual tests
npm run test:visual
```

### Performance Tests

```bash
# Run performance benchmarks
npm run test:performance
```

### Security Tests

```bash
# Run security validation
npm run test:security
```

### Run All Tests

```bash
# Complete test suite
npm test

# With coverage report
npm run test:coverage
```

## 📁 Test Structure

```
tests/
├── setup.ts                  # Jest setup
├── utils/
│   ├── test-utils.ts        # Test utilities & fixtures
│   └── mock-ai.ts          # AI provider mocks
├── unit/
│   ├── image.test.ts       # Image processing tests
│   └── ai-provider-detection.test.ts
├── integration/
│   ├── analyze.test.ts     # /api/analyze tests
│   ├── trichome-analysis.test.ts
│   ├── database.test.ts    # DB operations
│   └── test-helpers.ts     # API test helpers
├── e2e/
│   ├── photo-analysis-workflow.test.ts
│   ├── trichome-analysis-workflow.test.ts
│   └── batch-analysis-workflow.test.ts
├── visual/
│   ├── photo-analysis-ui.test.ts
│   └── trichome-analysis-ui.test.ts
├── performance/
│   └── image-processing.test.ts
├── security/
│   └── validation.test.ts
└── fixtures/
    └── sample-images-readme.md
```

## 🎯 Test Scenarios

### Photo Analysis Tests

**Valid Scenarios**
- ✅ Standard plant photo analysis
- ✅ High-resolution image processing
- ✅ HEIC format conversion
- ✅ Different plant strains
- ✅ Various growth stages
- ✅ With/without environmental data

**Edge Cases**
- ⚠️ Very small images (< 500x500)
- ⚠️ Very large images (> 10MB)
- ⚠️ Corrupted image data
- ⚠️ Unsupported formats
- ⚠️ Missing required fields
- ⚠️ Invalid environmental data

**Error Scenarios**
- ❌ AI provider unavailable
- ❌ Network timeout
- ❌ Rate limit exceeded
- ❌ Invalid input data
- ❌ Database errors

### Trichome Analysis Tests

**Valid Scenarios**
- ✅ Microscope images (USB)
- ✅ Mobile phone macro images
- ✅ Clear/cloudy/amber trichomes
- ✅ Different magnification levels
- ✅ Harvest readiness calculation

**Device Tests**
- ✅ USB Microscope (100x-1000x)
- ✅ Mobile Phone (50x-400x)
- ✅ Webcam (not recommended)

### Batch Analysis Tests

**Workflows**
- ✅ Create batch
- ✅ Schedule batch
- ✅ Monitor progress
- ✅ Handle failures
- ✅ Export results
- ✅ Retry failed analyses

## 📊 Coverage Requirements

### Minimum Coverage Thresholds

| Metric | Requirement |
|--------|-------------|
| **Lines** | 80% |
| **Functions** | 80% |
| **Branches** | 80% |
| **Statements** | 80% |

### Critical Files (90%+ coverage required)

- `src/lib/image.ts` - Image processing
- `src/lib/ai-provider-detection.ts` - AI integration
- `src/app/api/analyze/route.ts` - Main analysis
- `src/app/api/trichome-analysis/route.ts` - Trichome analysis

## 🛠️ Test Utilities

### Mock Data

```typescript
import {
  mockAIResponses,
  createTestPlant,
  createTestStrain,
  createValidImageDataUrl
} from '@/tests/utils/test-utils';
```

### Image Fixtures

```typescript
import { createSampleImage } from '@/tests/utils/test-utils';

// Small image
const smallImage = createSampleImage.small;

// HEIC format
const heicImage = createSampleImage.heic;

// Custom size
const customImage = createValidImageDataUrl('jpeg', 1024, 1024);
```

### Mock AI Providers

```typescript
import { createMockProvider } from '@/tests/utils/mock-ai';

// Create mock provider
const mockProvider = createMockProvider('openrouter', {
  shouldFail: false,
  responseDelay: 100
});
```

### Database Helpers

```typescript
import { setupTestDb, teardownTestDb } from '@/tests/utils/test-utils';

beforeAll(async () => {
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});
```

## 🔍 Debugging Tests

### Unit Tests

```bash
# Debug with Node
npm run test:unit -- --inspect-brk

# Debug specific test
npm run test:unit -- image.test.ts --verbose
```

### E2E Tests

```bash
# Headed mode
npm run test:e2e -- --headed

# Slow motion
npm run test:e2e -- --slowMo=1000

# Debug on failure
npm run test:e2e -- --debug-on-failure
```

### Visual Tests

```bash
# Update snapshots
npm run test:visual -- --update-snapshots

# View report
npx playwright show-report
```

## 📈 Continuous Integration

### GitHub Actions

Tests run automatically on:
- `push` to `master` or `dev`
- `pull_request`

### CI Workflow

```yaml
1. Unit Tests (Jest)
   ↓
2. Integration Tests
   ↓
3. E2E Tests (Playwright)
   ↓
4. Visual Tests
   ↓
5. Performance Tests
   ↓
6. Security Tests
   ↓
7. Coverage Report
```

### Artifacts

CI produces:
- Test reports (HTML/JSON/JUnit)
- Coverage reports
- Screenshots on failure
- Videos of E2E tests

## 🎨 Visual Testing

### Screenshot Baseline

Baseline screenshots stored in:
```
tests/
├── visual/
│   ├── baselines/
│   │   ├── photo-analysis/
│   │   └── trichome-analysis/
│   └── __screenshots__/
```

### Updating Baselines

```bash
# After intentional UI changes
npm run test:visual -- --update-snapshots
```

### Visual Diff

Tests use pixel diff with:
- Max 100 pixel difference
- Max 2% pixel ratio difference

## ⚡ Performance Testing

### Benchmarks

| Operation | Max Time |
|-----------|----------|
| Small image processing | 2s |
| Medium image processing | 5s |
| Large image processing | 10s |
| HEIC conversion | 5s |
| API response | 3s |
| E2E workflow | 30s |

### Memory Limits

- Image processing: < 100MB increase
- Page memory: < 500MB
- CI total: < 2GB

## 🔒 Security Testing

### Test Vectors

- XSS prevention
- SQL injection
- CSRF protection
- File upload validation
- Rate limiting
- Input sanitization
- Auth bypass attempts

## 📝 Writing New Tests

### Unit Test Template

```typescript
describe('Feature Name', () => {
  test('should do something', async () => {
    // Arrange
    const input = createTestInput();

    // Act
    const result = await functionUnderTest(input);

    // Assert
    expect(result).toBe(expectedValue);
  });
});
```

### E2E Test Template

```typescript
test('user workflow description', async ({ page }) => {
  // Navigate
  await page.goto('/');

  // Interact
  await page.click('[selector]');
  await page.fill('[input]', 'value');

  // Verify
  await expect(page.locator('[result]')).toBeVisible();
});
```

### Integration Test Template

```typescript
test('API endpoint behavior', async () => {
  const response = await fetch('/api/endpoint', {
    method: 'POST',
    body: JSON.stringify(testData)
  });

  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.success).toBe(true);
});
```

## 🐛 Common Issues

### Flaky Tests

**Solutions:**
- Use `await expect()` for async operations
- Add proper waits for network requests
- Mock external dependencies
- Use `test.step()` for better debugging

### Timeouts

**Increase timeout:**
```typescript
test('slow operation', async ({ page }) => {
  test.setTimeout(60000);
  // test code
});
```

### Memory Leaks

**Prevent:**
- Close browser contexts
- Clear mocks between tests
- Use `await page.close()`

## 📚 Best Practices

1. **Test Behavior, Not Implementation**
   - Focus on what, not how
   - Test user outcomes
   - Avoid testing internal functions

2. **Use Meaningful Descriptions**
   - Describe the scenario
   - Include expected outcome
   - Make tests self-documenting

3. **Keep Tests Independent**
   - No test dependencies
   - Clean up after each test
   - Use fresh data

4. **Mock External Services**
   - AI providers
   - Database
   - File system
   - Network calls

5. **Test Edge Cases**
   - Empty inputs
   - Very large/small values
   - Error conditions
   - Boundary values

6. **Maintain Testability**
   - Use data-testid attributes
   - Avoid CSS selectors when possible
   - Keep selectors stable

## 📊 Reports

### Coverage Report

```bash
# Generate HTML report
npm run test:coverage -- --coverageReporters=html

# View report
open coverage/lcov-report/index.html
```

### JUnit XML

Reports at:
- `coverage/junit.xml` - Unit tests
- `test-results/e2e-results.xml` - E2E tests

### HTML Reports

```bash
# Playwright report
npx playwright show-report

# Open in browser
open playwright-report/index.html
```

## 🤝 Contributing

### Before Submitting PR

1. Run full test suite: `npm test`
2. Update coverage: 80%+ minimum
3. Add tests for new features
4. Update documentation
5. Visual tests pass

### Test Checklist

- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] E2E workflows tested
- [ ] Visual tests updated
- [ ] Coverage meets threshold
- [ ] No security vulnerabilities
- [ ] Performance benchmarks pass

## 📖 Additional Resources

- [Jest Documentation](https://jestjs.io/docs)
- [Playwright Documentation](https://playwright.dev/docs)
- [Testing Library](https://testing-library.com/docs)
- [Testing Best Practices](https://kentcdodds.com/blog/common-testing-mistakes)

## 🎓 Learning Resources

### Recommended Reading

1. **Testing JavaScript Applications** by Kent C. Dodds
2. **Frontend Testing** by Paul Everitt
3. **Playwright for Modern Web Testing**

### Tutorials

- [Jest Unit Testing Tutorial](https://jestjs.io/docs/tutorial-async)
- [Playwright E2E Testing Guide](https://playwright.dev/docs/intro)
- [React Testing Best Practices](https://testing-library.com/docs/react-testing-library/intro/)

## 📞 Support

For test-related questions:
- GitHub Issues: Create an issue with `test` label
- Documentation: Check this README
- Slack: #testing channel

---

**Remember**: Good tests are maintainable, reliable, and provide value. Focus on testing user journeys and critical paths!
