# Test Fixtures Directory

This directory contains sample images and test fixtures for the CultivAI Pro test suite.

## Image Files

### Plant Images

- **sample-plant.jpg** - 1000x1000 JPG, healthy plant for basic testing
- **sample-trichome.jpg** - 2048x1536 JPG, close-up trichome image for microscope analysis
- **sample-mobile-trichome.jpg** - 1200x900 JPG, mobile phone captured trichome
- **small-image.jpg** - 200x200 JPG, small image for quick processing tests
- **medium-image.jpg** - 1024x1024 JPG, medium-sized image
- **large-image.jpg** - 4000x3000 JPG, large image for performance testing
- **5mb-image.jpg** - ~5MB JPG, large file for upload testing
- **high-quality-image.jpg** - 3000x3000 JPG, high quality with minimal compression
- **low-resolution.jpg** - 300x200 JPG, low resolution image
- **tiny-image.jpg** - 1x1 pixel, minimum size test

### Format Tests

- **sample-image.heic** - HEIC format for conversion testing
- **sample-image.webp** - WebP format for modern format testing

### Invalid Files

- **invalid-file.txt** - Text file to test file type validation
- **malicious.exe** - Fake executable for security testing

## Creating Test Images

To generate test images programmatically:

```bash
# Install ImageMagick
# Then create test images:

# Create a simple plant image
convert -size 1000x1000 xc:green -fill white -gravity center -pointsize 72 -annotate +0+0 "Sample Plant" sample-plant.jpg

# Create trichome image
convert -size 2048x1536 xc:purple -fill yellow -gravity center -pointsize 72 -annotate +0+0 "Trichomes" sample-trichome.jpg

# Create large image
convert -size 4000x3000 gradient:blue-green large-image.jpg

# Create HEIC (requires libheif)
convert sample-plant.jpg sample-image.heic
```

## Using Test Images

In Playwright tests:

```typescript
const imagePath = 'tests/fixtures/sample-plant.jpg';
await page.setInputFiles('input[type="file"]', imagePath);
```

In unit tests:

```typescript
import { createSampleImage } from '@/tests/utils/test-utils';

const imageBuffer = createSampleImage.small;
```

## Image Requirements

### Photo Analysis
- Minimum: 500x500 pixels
- Recommended: 1024x1024 pixels
- Maximum: 10MB
- Formats: JPEG, PNG, HEIC, WebP

### Trichome Analysis
- Minimum: 1000x750 pixels
- Recommended: 2048x1536 pixels
- Maximum: 20MB
- Formats: JPEG, PNG, HEIC

## Best Practices

1. **Use real images when possible** - Synthetic images don't catch all issues
2. **Include edge cases** - Low light, blur, wrong focus
3. **Vary file sizes** - Test with small, medium, and large files
4. **Test all supported formats** - JPEG, PNG, HEIC, WebP
5. **Generate programmatically** for consistency across environments

## Generating Realistic Test Images

For production-like tests, consider using:

- **Plant disease databases** - Use images with known deficiencies
- **Stock photo sites** - License-free plant images
- **Public datasets** - Agricultural image datasets

Example with realistic plant images:

```bash
# Download sample from public dataset
curl -o sample-plant.jpg https://example.com/plant-image.jpg
```

## Test Image Checklist

- [ ] Small image (under 500KB)
- [ ] Medium image (1-5MB)
- [ ] Large image (over 5MB)
- [ ] HEIC format
- [ ] WebP format
- [ ] Low resolution
- [ ] High resolution
- [ ] Different aspect ratios
- [ ] Various lighting conditions
- [ ] Clear focus
- [ ] Blurry focus

## Storage and Versioning

Test images should be:
- Stored in `tests/fixtures/` directory
- Committed to version control
- Have consistent versions across environments
- Documented with their intended use

## CI/CD Considerations

Test images in CI should:
- Be cached to avoid re-downloads
- Have checksums to verify integrity
- Be optimized for fast download
- Have fallbacks for network issues

## Legal Considerations

Ensure all test images:
- Are licensed for use in testing
- Don't contain copyrighted material
- Don't contain personally identifiable information
- Comply with your organization's image usage policy
