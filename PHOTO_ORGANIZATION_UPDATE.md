# Plant Photo Organization Update

## Overview

The uploads folder now organizes photos by plant. Each plant gets its own subfolder, making it easier to manage and locate photos.

## Structure

```
uploads/
├── alocasia_amazonica_-_12cm/
│   ├── 1234567890-profile.jpg
│   └── 1234567891-photo.jpg
├── anthurium_clarinervium_-_12cm/
│   ├── 1234567892-profile.jpg
│   └── 1234567893-photo.jpg
└── temp/
    └── (temporary CSV import files)
```

## Changes Made

### Backend

1. **New Utility Functions** (`backend/src/utils/uploadUtils.ts`):
   - `sanitizePlantName(plantName)` - Converts plant names to folder-safe names
   - `getPlantUploadFolder(plantName)` - Creates and returns plant-specific folder path
   - `deletePlantUploadFolder(plantName)` - Removes plant folder and all photos
   - `moveToPlantFolder(currentPath, plantName, filename)` - Moves uploaded files to plant folder

2. **Updated Routes**:
   - `upload.ts` - Now requires `plantName` parameter when uploading photos
   - `plants.ts` - Automatically deletes plant folder when deleting a plant
   - `csvImport.ts` - Imports photos into plant-specific folders

### Frontend

1. **Updated API Service** (`frontend/src/services/api.ts`):
   - `uploadAPI.single()` - Now requires plant name parameter
   - `uploadAPI.multiple()` - Now requires plant name parameter

2. **Updated Pages**:
   - `AddPlantPage.tsx` - Validates plant name before upload and passes it to API
   - `PlantDetailPage.tsx` - Passes plant name when uploading photos

## Migration

If you have existing photos in the root uploads folder, run the migration script:

```bash
cd backend
npm run migrate-photos
```

This will:
- Create subfolders for each plant
- Move existing photos to their respective plant folders
- Update database paths automatically

## API Changes

### Upload Endpoints

**Before:**
```typescript
POST /api/upload/single
FormData: { photo: File }

POST /api/upload/multiple
FormData: { photos: File[] }
```

**After:**
```typescript
POST /api/upload/single
FormData: { 
  photo: File,
  plantName: string  // REQUIRED
}

POST /api/upload/multiple
FormData: { 
  photos: File[],
  plantName: string  // REQUIRED
}
```

### Response Format (unchanged)
```json
{
  "filename": "1234567890.jpg",
  "path": "/uploads/plant_name/1234567890.jpg",
  "size": 123456,
  "takenAt": "2023-11-14T10:00:00.000Z"
}
```

## Benefits

1. **Organization**: Photos are grouped by plant, making backups and organization easier
2. **Cleanup**: Deleting a plant automatically removes all its photos
3. **Scalability**: Better performance with many photos as they're distributed across folders
4. **Clarity**: Easy to identify which photos belong to which plant

## Notes

- Folder names are sanitized versions of plant names (lowercase, underscores instead of spaces)
- The `temp/` folder remains for CSV import processing
- All photo paths in the database use the format: `/uploads/plant_name/filename.jpg`
- Profile photos and gallery photos are stored in the same plant folder
