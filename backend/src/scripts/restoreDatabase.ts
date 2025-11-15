import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { getPlantUploadFolder, deletePlantUploadFolder } from '../utils/uploadUtils';

const dbPath = process.env.DB_PATH || './database.sqlite';
const csvPath = path.join(__dirname, '../../notion-csv/My store-bought plants 26f6def8e669809c9e6fe385db01acc7_all.csv');
const csvBasePath = path.join(__dirname, '../../notion-csv/My store-bought plants');

interface PlantCSVRow {
  Plant?: string;
  plant?: string;
  Alias?: string;
  alias?: string;
  Price?: string;
  price?: string;
  'Delivery fee'?: string;
  delivery_fee?: string;
  'Purchased from'?: string;
  purchased_from?: string;
  'Purchased when'?: string;
  purchased_when?: string;
  'Received when'?: string;
  received_when?: string;
  'Purchase notes'?: string;
  purchase_notes?: string;
  Status?: string;
  status?: string;
  'Files & media'?: string;
  'files & media'?: string;
  'Last water date'?: string;
  last_water_date?: string;
}

// Helper function to parse date from CSV format
function parseDate(dateStr: string | undefined): string | null {
  if (!dateStr || dateStr.trim() === '') {
    return null;
  }

  let date: Date;
  
  // Check if it's in DD-MMM-YY format (e.g., "27-Oct-25")
  const shortDateMatch = dateStr.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/);
  if (shortDateMatch) {
    const [, day, monthStr, year] = shortDateMatch;
    const monthMap: { [key: string]: number } = {
      'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
      'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
    };
    const month = monthMap[monthStr.toLowerCase()];
    // Assume 20XX for years 00-99
    const fullYear = 2000 + parseInt(year);
    date = new Date(fullYear, month, parseInt(day));
  } else if (dateStr.match(/^[A-Za-z]{3}-\d{1,2}$/)) {
    // Check if it's in MMM-DD format (e.g., "Oct-27") without year
    // This is ambiguous but appears in the "Last water date" column
    // Assume current year (2025)
    const [monthStr, day] = dateStr.split('-');
    const monthMap: { [key: string]: number } = {
      'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
      'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
    };
    const month = monthMap[monthStr.toLowerCase()];
    const fullYear = 2025; // Current year
    date = new Date(fullYear, month, parseInt(day));
  } else {
    // Try parsing as regular date format
    date = new Date(dateStr);
  }

  if (isNaN(date.getTime())) {
    return null;
  }

  // Use local date components to avoid timezone conversion issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper function to parse price from CSV format
function parsePrice(priceStr: string | undefined): number | null {
  if (!priceStr) return null;
  const cleaned = priceStr.replace(/[£$,]/g, '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

// Helper function to extract first image from Files & media column
function extractFirstImage(filesMediaStr: string | undefined): string | null {
  if (!filesMediaStr) return null;
  
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic'];
  const files = filesMediaStr.split(',').map(f => f.trim());
  
  for (const file of files) {
    const lowerFile = file.toLowerCase();
    if (imageExtensions.some(ext => lowerFile.endsWith(ext))) {
      // Extract just the filename, removing any path
      const filename = file.split('/').pop() || file;
      return filename;
    }
  }
  
  return null;
}

// Helper function to copy image from Notion CSV folder to uploads folder
function copyImageFromNotionCsvFolder(imageName: string, plantName: string): string | null {
  if (!imageName) return null;
  
  const sourcePath = path.join(__dirname, '../../notion-csv/My store-bought plants', imageName);
  
  if (!fs.existsSync(sourcePath)) {
    console.warn(`  ⚠ Image not found: ${sourcePath}`);
    return null;
  }
  
  const timestamp = Date.now();
  const ext = path.extname(imageName);
  const baseName = path.basename(imageName, ext);
  const newFilename = `csv_import_${timestamp}_${baseName}${ext}`;
  
  const plantFolder = getPlantUploadFolder(plantName);
  const destPath = path.join(plantFolder, newFilename);
  
  try {
    fs.copyFileSync(sourcePath, destPath);
    const plantNameForPath = plantName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '');
    return `/uploads/${plantNameForPath}/${newFilename}`;
  } catch (error) {
    console.warn(`  ⚠ Failed to copy image: ${error}`);
    return null;
  }
}

function clearAllData(db: sqlite3.Database): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('\n🗑️  Clearing all existing data...');
    
    db.serialize(() => {
      // Get all plants to delete their folders
      db.all('SELECT id, name FROM plants', [], (err, plants: any[]) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Delete all plant folders with their photos
        plants.forEach((plant) => {
          if (plant.name) {
            deletePlantUploadFolder(plant.name);
          }
        });
        
        console.log(`  ✓ Deleted ${plants.length} plant folders`);
        
        // Delete all data from tables
        db.run('DELETE FROM plant_events', (err) => {
          if (err) {
            reject(err);
            return;
          }
          
          db.run('DELETE FROM plant_photos', (err) => {
            if (err) {
              reject(err);
              return;
            }
            
            db.run('DELETE FROM plants', (err) => {
              if (err) {
                reject(err);
                return;
              }
              
              db.run('DELETE FROM tags', (err) => {
                if (err) {
                  reject(err);
                  return;
                }
                
                // Reset autoincrement counters
                db.run('DELETE FROM sqlite_sequence WHERE name IN (?, ?, ?, ?)', 
                  ['plants', 'plant_events', 'plant_photos', 'tags'], 
                  (err) => {
                    if (err) {
                      console.warn('  ⚠ Could not reset ID sequences:', err);
                    }
                    console.log('  ✓ All data cleared and ID counters reset');
                    resolve();
                  }
                );
              });
            });
          });
        });
      });
    });
  });
}

function importMainCSV(db: sqlite3.Database): Promise<{ success: number; errors: string[] }> {
  return new Promise((resolve, reject) => {
    console.log('\n📥 Importing main CSV file...');
    
    if (!fs.existsSync(csvPath)) {
      reject(new Error(`CSV file not found: ${csvPath}`));
      return;
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const rows: PlantCSVRow[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });
    
    console.log(`  Found ${rows.length} plants to import`);
    
    let successCount = 0;
    const errors: string[] = [];
    
    const processRow = (index: number) => {
      if (index >= rows.length) {
        resolve({ success: successCount, errors });
        return;
      }
      
      const row = rows[index];
      const plantName = row.Plant || row.plant || '';
      
      if (!plantName.trim()) {
        errors.push(`Row ${index + 1}: Empty plant name`);
        processRow(index + 1);
        return;
      }
      
      // Extract first image and copy it to uploads folder
      const firstImage = extractFirstImage(row['Files & media'] || row['files & media']);
      let profilePhoto: string | null = null;
      
      if (firstImage) {
        profilePhoto = copyImageFromNotionCsvFolder(firstImage, plantName);
      }
      
      const plant = {
        name: plantName,
        alias: row.Alias || row.alias || null,
        price: parsePrice(row.Price || row.price),
        delivery_fee: parsePrice(row['Delivery fee'] || row.delivery_fee),
        purchased_from: row['Purchased from'] || row.purchased_from || null,
        purchased_when: parseDate(row['Purchased when'] || row.purchased_when),
        received_when: parseDate(row['Received when'] || row.received_when),
        purchase_notes: row['Purchase notes'] || row.purchase_notes || null,
        status: row.Status || row.status || 'Alive',
        profile_photo: profilePhoto,
      };
      
      // Add tag if purchased_from is provided
      if (plant.purchased_from) {
        db.get('SELECT id FROM tags WHERE tag_name = ?', [plant.purchased_from], (err, existing: any) => {
          if (!existing) {
            db.run('INSERT INTO tags (tag_name, tag_type) VALUES (?, ?)', 
              [plant.purchased_from, 'purchased_from'], 
              (err) => {
                if (err) {
                  console.warn(`  ⚠ Failed to add tag "${plant.purchased_from}":`, err);
                }
              }
            );
          }
        });
      }
      
      // Insert plant
      const query = `
        INSERT INTO plants (
          name, alias, price, delivery_fee, purchased_from, 
          purchased_when, received_when, purchase_notes, status, profile_photo
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        plant.name,
        plant.alias,
        plant.price,
        plant.delivery_fee,
        plant.purchased_from,
        plant.purchased_when,
        plant.received_when,
        plant.purchase_notes,
        plant.status,
        plant.profile_photo,
      ];
      
      db.run(query, params, function(err) {
        if (err) {
          errors.push(`${plantName}: ${err.message}`);
          processRow(index + 1);
          return;
        }
        
        // If there's a last water date, create a water event
        const lastWaterDate = parseDate(row['Last water date'] || row.last_water_date);
        
        if (lastWaterDate && this.lastID) {
          const eventQuery = `
            INSERT INTO plant_events (plant_id, event_type, event_date)
            VALUES (?, 'Water', ?)
          `;
          
          db.run(eventQuery, [this.lastID, lastWaterDate], (eventErr) => {
            if (eventErr && !eventErr.message?.includes('UNIQUE constraint failed')) {
              console.warn(`  ⚠ Failed to add water event for ${plantName}:`, eventErr);
            }
            successCount++;
            processRow(index + 1);
          });
        } else {
          successCount++;
          processRow(index + 1);
        }
      });
    };
    
    processRow(0);
  });
}

async function main() {
  console.log('🔄 Database Restore Script');
  console.log('==========================\n');
  console.log(`Database: ${dbPath}`);
  console.log(`Main CSV: ${csvPath}`);
  console.log(`Updates folder: ${csvBasePath}`);
  
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Error opening database:', err);
      process.exit(1);
    }
  });
  
  try {
    // Step 1: Clear all data
    await clearAllData(db);
    
    // Step 2: Import main CSV
    const result = await importMainCSV(db);
    console.log(`  ✓ Successfully imported ${result.success} plants`);
    
    if (result.errors.length > 0) {
      console.log(`  ⚠ ${result.errors.length} errors occurred:`);
      result.errors.slice(0, 5).forEach(err => console.log(`    - ${err}`));
      if (result.errors.length > 5) {
        console.log(`    ... and ${result.errors.length - 5} more errors`);
      }
    }
    
    // Close database
    db.close();
    
    console.log('\n✅ Database restore completed!');
    console.log('\n📝 Next step: Run "npm run import-updates" to import plant events and photos');
    
  } catch (error) {
    console.error('\n❌ Error during restore:', error);
    db.close();
    process.exit(1);
  }
}

// Run the script
main();
