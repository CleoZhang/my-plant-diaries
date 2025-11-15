# Database Scripts

## Database Restore Script

### Overview
The `restoreDatabase.ts` script performs a complete database restore by:
1. Deleting all existing data (plants, events, photos, tags)
2. Deleting all plant photo folders
3. Resetting all ID counters to start from 1
4. Importing plants from the main CSV file
5. Automatically running the import-updates script to add events and photos

### Usage

From the `backend` directory, run:
```bash
npm run restore-db
```

This will:
- Clear all database tables
- Import `csv/My store-bought plants 26f6def8e669809c9e6fe385db01acc7_all.csv`
- Automatically run `npm run import-updates` to import events and photos

### What it does
1. **Clears all data**: Deletes all plants, events, photos, and tags
2. **Deletes photo folders**: Removes all uploaded photos from the uploads directory
3. **Resets IDs**: Resets autoincrement counters so IDs start from 1
4. **Imports plants**: Reads the main CSV and creates plant records
5. **Imports updates**: Automatically runs the import-updates script

### Requirements
- Main CSV file must exist at: `backend/csv/My store-bought plants 26f6def8e669809c9e6fe385db01acc7_all.csv`
- Update CSV files must be in: `backend/csv/My store-bought plants/[plant folders]`

---

## Plant Updates Import Script

This script imports plant updates (events and photos) from the CSV files in the `backend/csv/My store-bought plants` directory.

## What it does

The script:
1. Scans all folders in `backend/csv/My store-bought plants/`
2. For each folder, extracts the plant name (the part before `(` or `-`)
3. Finds the corresponding plant in the database (case-insensitive match)
4. Reads the `*_all.csv` file which contains update records
5. Imports events (Water, New Leaf, Trim, etc.) into the `plant_events` table
6. Copies photos to the uploads folder and adds records to `plant_photos` table
7. Skips duplicates (won't import the same event or photo twice)

## CSV Format

The CSV files should have the following columns:
- **Name**: Description of the update (e.g., "Watering", "New leaf unfolded")
- **Date**: Date in format "Month DD, YYYY" (e.g., "September 20, 2025")
- **Photo**: URL-encoded path to photo (e.g., "Begonia%20maculata%20-%2012cm/IMG_7212.jpeg")
- **Update type**: Type of event (Water, New leaf, Trim, Repot, etc.)

## Event Type Mapping

The script maps CSV update types to database event types:
- `Water` / `Watering` → `Water`
- `New leaf` / `New leaf unfolded` → `New Leaf`
- `Trim` / `Trimmed` → `Trim`
- `Repot` / `Repotted` → `Repot`
- `Propagate` / `Propagated` → `Propagate`
- `Pest control` / `Pest Control` → `Pest Control`
- `Root rot` / `Root Rot` → `Root Rot`
- `General update` / `Other` → `Other`

## Running the Script

```bash
cd backend
npm run import-updates
```

## Output

The script will output:
- Number of plant folders found
- For each plant:
  - Plant name extracted from folder
  - Whether plant was found in database
  - Number of update records found
  - Number of events added vs. skipped (duplicates)
  - Number of photos added vs. skipped (duplicates)

## Photos

Photos are copied from the CSV folders to:
```
/uploads/{plant_name_lowercase_with_underscores}/{photo_filename}
```

For example:
- Source: `backend/csv/My store-bought plants/Begonia maculata - 12cm/IMG_7212.jpeg`
- Destination: `/uploads/begonia_maculata/IMG_7212.jpeg`

## Notes

- The script is safe to run multiple times - it won't create duplicates
- Plants not found in the database will be skipped with an error message
- Photos that don't exist at the specified path will be skipped with a warning
- All dates are converted to ISO format (YYYY-MM-DD) for storage
