/**
 * Cloudinary utility functions for image optimization
 */

/**
 * Add Cloudinary transformations to an image URL for better quality and performance
 * @param {string} url - Original Cloudinary URL
 * @param {Object} options - Transformation options
 * @param {number} options.width - Target width (optional)
 * @param {string} options.quality - Quality setting: 'auto', 'auto:good', 'auto:best', or 1-100
 * @param {string} options.format - Format: 'auto', 'webp', 'jpg', 'png'
 * @returns {string} Transformed URL
 */
function addCloudinaryTransformations(url, options = {}) {
  if (!url || typeof url !== 'string') {
    return url;
  }

  // Only transform Cloudinary URLs
  if (!url.includes('res.cloudinary.com')) {
    return url;
  }

  const {
    width = null,
    quality = 'auto:good',
    format = 'auto'
  } = options;

  // Build transformation string
  const transforms = [];

  // Quality optimization
  if (quality) {
    transforms.push(`q_${quality}`);
  }

  // Format optimization (WebP/AVIF when supported)
  if (format) {
    transforms.push(`f_${format}`);
  }

  // Width constraint (maintains aspect ratio)
  if (width) {
    transforms.push(`w_${width}`);
    transforms.push('c_scale'); // Scale mode
  }

  if (transforms.length === 0) {
    return url;
  }

  const transformString = transforms.join(',');

  // Insert transformations into Cloudinary URL
  // Pattern: https://res.cloudinary.com/{cloud}/image/upload/{existing_transforms?}/{public_id}
  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) {
    return url;
  }

  const beforeUpload = url.substring(0, uploadIndex + 8); // includes '/upload/'
  const afterUpload = url.substring(uploadIndex + 8);

  // Check if there are already transformations
  // If afterUpload starts with a version (v1234567890) or a folder, add our transforms
  return `${beforeUpload}${transformString}/${afterUpload}`;
}

/**
 * Transform an array of image URLs with Cloudinary optimizations
 * @param {string[]} urls - Array of image URLs
 * @param {Object} options - Transformation options
 * @returns {string[]} Array of transformed URLs
 */
function transformImageUrls(urls, options = {}) {
  if (!Array.isArray(urls)) {
    return urls;
  }

  return urls.map(url => addCloudinaryTransformations(url, options));
}

/**
 * Get optimized flyer image URLs with responsive sizing
 * @param {string[]} imageUrls - Original flyer image URLs
 * @returns {string[]} Optimized image URLs
 */
function getOptimizedFlyerUrls(imageUrls) {
  return transformImageUrls(imageUrls, {
    quality: 'auto:good',
    format: 'auto',
    width: 1200 // Good balance of quality and file size for flyers
  });
}

/**
 * Get thumbnail URLs for flyer previews
 * @param {string[]} imageUrls - Original flyer image URLs
 * @returns {string[]} Thumbnail URLs
 */
function getFlyerThumbnailUrls(imageUrls) {
  return transformImageUrls(imageUrls, {
    quality: 'auto',
    format: 'auto',
    width: 300
  });
}

module.exports = {
  addCloudinaryTransformations,
  transformImageUrls,
  getOptimizedFlyerUrls,
  getFlyerThumbnailUrls
};
