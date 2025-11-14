import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const dbPath = process.env.DB_PATH || './database.sqlite';
const csvBasePath = path.join(__dirname, '../../csv/My store-bought plants');

interface UpdateRecord {
  Name: string;
  Date: string;
  Photo: string;
  'Update type': string;
}

interface PlantFolder {
  folderName: string;
  plantName: string;
  csvFile: string | null;
}

// Event type mapping from CSV to database
const eventTypeMapping: { [key: string]: string } = {
  'Water': 'Water',
  'Watering': 'Water',
  'New leaf': 'New Leaf',
  'New leaf unfolded': 'New Leaf',
  'Trim': 'Trim',
  'Trimmed': 'Trim',
  'Repot': 'Repot',
  'Repotted': 'Repot',
  'Propagate': 'Propagate',
  'Propagated': 'Propagate',
  'Pest control': 'Pest Control',
  'Pest Control': 'Pest Control',
  'Root rot': 'Root Rot',
  'Root Rot': 'Root Rot',
  'General update': 'Other',
  'Other': 'Other'
};

function parseDate(dateStr: string): string {
  // Parse dates like "September 20, 2025" to "2025-09-20"
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    console.warn(`Invalid date: ${dateStr}`);
    return new Date().toISOString().split('T')[0];
  }
  return date.toISOString().split('T')[0];
}

function extractPlantName(folderName: string): string {
  // Extract plant name by removing everything after '(' or ' -' (space before dash)
  // "Alocasia amazonica - 12cm" -> "Alocasia amazonica"
  // "Begonia rex-hybride - 12cm" -> "Begonia rex-hybride"
  // "Ficus elastica Tineke (rubber plant) - 9cm" -> "Ficus elastica Tineke"
  
  let name = folderName;
  
  // Remove content in parentheses first
  name = name.replace(/\s*\([^)]*\)/g, '');
  
  // Then split by ' -' (space before dash) and take the first part
  const dashIndex = name.indexOf(' -');
  if (dashIndex !== -1) {
    name = name.substring(0, dashIndex);
  }
  
  return name.trim();
}

function findPlantFolders(): PlantFolder[] {
  const folders: PlantFolder[] = [];
  
  if (!fs.existsSync(csvBasePath)) {
    console.error(`CSV base path does not exist: ${csvBasePath}`);
    return folders;
  }
  
  const items = fs.readdirSync(csvBasePath);
  
  for (const item of items) {
    const itemPath = path.join(csvBasePath, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory() && !item.startsWith('.')) {
      const plantName = extractPlantName(item);
      
      // Find the _all.csv file in this folder
      const folderContents = fs.readdirSync(itemPath);
      const csvFile = folderContents.find(file => file.endsWith('_all.csv'));
      
      if (csvFile) {
        folders.push({
          folderName: item,
          plantName: plantName,
          csvFile: path.join(itemPath, csvFile)
        });
      }
    }
  }
  
  return folders;
}

function getPlantIdByName(db: sqlite3.Database, plantName: string): Promise<number | null> {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT id FROM plants WHERE LOWER(name) = LOWER(?)',
      [plantName],
      (err, row: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? row.id : null);
        }
      }
    );
  });
}

function checkEventExists(
  db: sqlite3.Database,
  plantId: number,
  eventType: string,
  eventDate: string
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT id FROM plant_events WHERE plant_id = ? AND event_type = ? AND event_date = ?',
      [plantId, eventType, eventDate],
      (err, row: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(!!row);
        }
      }
    );
  });
}

function insertEvent(
  db: sqlite3.Database,
  plantId: number,
  eventType: string,
  eventDate: string,
  notes: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO plant_events (plant_id, event_type, event_date, notes) VALUES (?, ?, ?, ?)',
      [plantId, eventType, eventDate, notes],
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

function checkPhotoExists(
  db: sqlite3.Database,
  plantId: number,
  photoPath: string
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT id FROM plant_photos WHERE plant_id = ? AND photo_path LIKE ?',
      [plantId, `%${path.basename(photoPath)}`],
      (err, row: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(!!row);
        }
      }
    );
  });
}

function insertPhoto(
  db: sqlite3.Database,
  plantId: number,
  photoPath: string,
  takenAt: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO plant_photos (plant_id, photo_path, taken_at) VALUES (?, ?, ?)',
      [plantId, photoPath, takenAt],
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

async function processPlantFolder(db: sqlite3.Database, folder: PlantFolder): Promise<void> {
  console.log(`\nProcessing: ${folder.folderName}`);
  console.log(`  Extracted plant name: ${folder.plantName}`);
  
  // Find plant in database
  const plantId = await getPlantIdByName(db, folder.plantName);
  
  if (!plantId) {
    console.log(`  ❌ Plant not found in database: ${folder.plantName}`);
    return;
  }
  
  console.log(`  ✓ Found plant ID: ${plantId}`);
  
  // Read CSV file
  if (!folder.csvFile) {
    console.log(`  ❌ No CSV file found`);
    return;
  }
  
  const csvContent = fs.readFileSync(folder.csvFile, 'utf-8');
  const records: UpdateRecord[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
  
  console.log(`  Found ${records.length} update records`);
  
  let eventsAdded = 0;
  let photosAdded = 0;
  let eventsSkipped = 0;
  let photosSkipped = 0;
  
  for (const record of records) {
    const eventDate = parseDate(record.Date);
    const updateType = record['Update type'] || 'Other';
    const eventType = eventTypeMapping[updateType] || 'Other';
    
    // Check if event already exists
    const eventExists = await checkEventExists(db, plantId, eventType, eventDate);
    
    if (!eventExists) {
      try {
        await insertEvent(db, plantId, eventType, eventDate, record.Name || '');
        eventsAdded++;
      } catch (err) {
        console.log(`    ⚠ Failed to insert event: ${eventType} on ${eventDate} - ${err}`);
      }
    } else {
      eventsSkipped++;
    }
    
    // Process photo if exists
    if (record.Photo && record.Photo.trim()) {
      // Decode URL-encoded path
      const decodedPhotoPath = decodeURIComponent(record.Photo);
      const photoFileName = path.basename(decodedPhotoPath);
      const photoPath = path.join(csvBasePath, folder.folderName, photoFileName);
      
      if (fs.existsSync(photoPath)) {
        // Check if photo already exists
        const photoExists = await checkPhotoExists(db, plantId, photoPath);
        
        if (!photoExists) {
          // Copy photo to uploads folder
          const plantNameForPath = folder.plantName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '');
          const uploadsDir = path.join(__dirname, '../../uploads', plantNameForPath);
          
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          
          const targetPhotoPath = path.join(uploadsDir, photoFileName);
          fs.copyFileSync(photoPath, targetPhotoPath);
          
          // Insert photo record
          const relativePath = `/uploads/${plantNameForPath}/${photoFileName}`;
          await insertPhoto(db, plantId, relativePath, new Date(eventDate).toISOString());
          photosAdded++;
        } else {
          photosSkipped++;
        }
      } else {
        console.log(`    ⚠ Photo not found: ${photoPath}`);
      }
    }
  }
  
  console.log(`  ✓ Events added: ${eventsAdded}, skipped: ${eventsSkipped}`);
  console.log(`  ✓ Photos added: ${photosAdded}, skipped: ${photosSkipped}`);
}

async function main() {
  console.log('Starting plant updates import...');
  console.log(`CSV base path: ${csvBasePath}`);
  
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err);
      process.exit(1);
    }
  });
  
  try {
    const folders = findPlantFolders();
    console.log(`\nFound ${folders.length} plant folders with CSV files`);
    
    for (const folder of folders) {
      await processPlantFolder(db, folder);
    }
    
    console.log('\n✓ Import completed successfully!');
  } catch (error) {
    console.error('Error during import:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run the script
main();
