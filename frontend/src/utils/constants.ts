// Default placeholder for plants without profile photos
// To replace: update the PLANT_PLACEHOLDER_IMAGE constant with your desired image URL or path
export const PLANT_PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y0ZjFkZSIvPgogIDx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIj7wn6q0PC90ZXh0Pgo8L3N2Zz4=';

// Alternative: Use a URL to an image file
// export const PLANT_PLACEHOLDER_IMAGE = '/images/placeholder-plant.png';
// export const PLANT_PLACEHOLDER_IMAGE = 'https://your-cdn.com/placeholder.jpg';

/**
 * Get the display URL for a plant's profile photo
 * @param profilePhoto - The plant's profile_photo field (may be null/undefined)
 * @returns The URL to display (either the actual photo or placeholder)
 */
export const getPlantPhotoUrl = (profilePhoto: string | null | undefined): string => {
  return profilePhoto || PLANT_PLACEHOLDER_IMAGE;
};
