import { Router, Request, Response } from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import db from '../database';
import { Plant } from '../types';
import { getPlantUploadFolder, sanitizePlantName, deletePlantUploadFolder } from '../utils/uploadUtils';

const router = Router();

// Configure multer for CSV file upload
const upload = multer({
  dest: path.join(__dirname, '../../uploads/temp'),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// Helper function to parse date from CSV format
function parseDate(dateStr: string | undefined): string | null {
  if (!dateStr || !dateStr.trim()) return null;
  
  try {
    // Handle formats like "June 12, 2025" or "Oct 10" (without year)
    let dateWithYear = dateStr.trim();
    
    // If the date doesn't contain a year (no 4-digit number), add current year
    if (!/\d{4}/.test(dateWithYear)) {
      const currentYear = new Date().getFullYear();
      dateWithYear = `${dateWithYear}, ${currentYear}`;
    }
    
    const date = new Date(dateWithYear);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
    }
  } catch (e) {
    console.error('Failed to parse date:', dateStr);
  }
  
  return null;
}

// Helper function to parse price from CSV format
function parsePrice(priceStr: string | undefined): number | null {
  if (!priceStr || !priceStr.trim()) return null;
  
  // Remove currency symbols and parse
  const cleaned = priceStr.replace(/[£$€,]/g, '').trim();
  const price = parseFloat(cleaned);
  
  return isNaN(price) ? null : price;
}

// Helper function to find first image from Files & media column
function extractFirstImage(filesMediaStr: string | undefined): string | null {
  if (!filesMediaStr || !filesMediaStr.trim()) return null;
  
  // Split by comma to handle multiple files
  const files = filesMediaStr.split(',').map(f => f.trim());
  
  // Get the first file
  const firstFile = files[0];
  
  // Decode URL encoding and extract filename
  const decoded = decodeURIComponent(firstFile);
  
  // Extract just the filename (remove folder path)
  const filename = decoded.split('/').pop();
  
  return filename || null;
}

// Helper function to copy image from CSV folder to uploads folder
function copyImageFromCsvFolder(imageName: string, plantName: string): string | null {
  if (!imageName) return null;
  
  const sourcePath = path.join(__dirname, '../../csv/My store-bought plants', imageName);
  
  // Check if source file exists
  if (!fs.existsSync(sourcePath)) {
    console.warn(`Image not found: ${sourcePath}`);
    return null;
  }
  
  // Generate unique filename to avoid conflicts
  const timestamp = Date.now();
  const ext = path.extname(imageName);
  const baseName = path.basename(imageName, ext);
  const newFilename = `csv_import_${timestamp}_${baseName}${ext}`;
  
  // Get or create plant-specific upload folder
  const plantFolder = getPlantUploadFolder(plantName);
  const destPath = path.join(plantFolder, newFilename);
  
  try {
    // Copy the file
    fs.copyFileSync(sourcePath, destPath);
    console.log(`Copied image: ${imageName} -> ${newFilename}`);
    
    // Return the relative path for database storage
    const sanitized = sanitizePlantName(plantName);
    return `/uploads/${sanitized}/${newFilename}`;
  } catch (error) {
    console.error(`Failed to copy image ${imageName}:`, error);
    return null;
  }
}

// Import CSV endpoint
router.post('/import', upload.single('csv'), async (req: Request, res: Response) => {
  const file = req.file;
  const clearExisting = req.body.clearExisting === 'true';
  
  if (!file) {
    res.status(400).json({ error: 'No CSV file uploaded' });
    return;
  }
  
  const results: any[] = [];
  const errors: string[] = [];
  let successCount = 0;
  let errorCount = 0;
  
  try {
    // If clearExisting is true, delete all existing plants first
    if (clearExisting) {
      await new Promise<void>((resolve, reject) => {
        // First, get all plants to delete their folders
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
          
          // Delete all plants (CASCADE will handle related records)
          db.run('DELETE FROM plants', [], (err) => {
            if (err) {
              reject(err);
            } else {
              console.log('Cleared all existing plants');
              resolve();
            }
          });
        });
      });
    }
    
    // Read and parse CSV file
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(file.path, { encoding: 'utf8' })
        .pipe(csv({ skipLines: 0, mapHeaders: ({ header }) => header.trim() }))
        .on('data', (data) => {
          results.push(data);
        })
        .on('end', () => resolve())
        .on('error', (error) => reject(error));
    });
    
    // Process each row and insert into database
    for (const row of results) {
      try {
        // Map CSV columns to Plant interface
        const plantName = row['Plant'] || row['plant'] || '';
        
        if (!plantName.trim()) {
          errors.push(`Skipped row with empty plant name`);
          errorCount++;
          continue;
        }
        
        // Extract first image and copy it to uploads folder
        const firstImage = extractFirstImage(row['Files & media'] || row['files & media']);
        let profilePhoto: string | null = null;
        
        if (firstImage) {
          profilePhoto = copyImageFromCsvFolder(firstImage, plantName);
        }
        
        const plant: Plant = {
          name: plantName,
          alias: row['Alias'] || row['alias'] || undefined,
          price: parsePrice(row['Price'] || row['price']) || undefined,
          delivery_fee: parsePrice(row['Delivery fee'] || row['delivery_fee']) || undefined,
          purchased_from: row['Purchased from'] || row['purchased_from'] || undefined,
          purchased_when: parseDate(row['Purchased when'] || row['purchased_when']) || undefined,
          received_when: parseDate(row['Recieved when'] || row['received_when'] || row['Received when']) || undefined,
          purchase_notes: row['Notes'] || row['notes'] || undefined,
          status: (row['Status'] || row['status'] || 'Alive') as Plant['status'],
          profile_photo: profilePhoto || undefined,
        };
        
        // Insert plant into database
        await new Promise<void>((resolve, reject) => {
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
              reject(err);
            } else {
              // If there's a last water date, create a water event
              const lastWaterDate = parseDate(row['Last water date'] || row['last_water_date']);
              
              if (lastWaterDate && this.lastID) {
                const eventQuery = `
                  INSERT INTO plant_events (plant_id, event_type, event_date)
                  VALUES (?, 'Water', ?)
                `;
                
                db.run(eventQuery, [this.lastID, lastWaterDate], (eventErr) => {
                  if (eventErr) {
                    console.warn(`Failed to add water event for plant ${plant.name}:`, eventErr);
                  }
                  resolve();
                });
              } else {
                resolve();
              }
            }
          });
        });
        
        successCount++;
      } catch (error: any) {
        errors.push(`Failed to import "${row['Plant'] || 'unknown'}": ${error.message}`);
        errorCount++;
      }
    }
    
    // Clean up uploaded CSV file
    fs.unlinkSync(file.path);
    
    res.json({
      success: true,
      message: `CSV import completed`,
      stats: {
        total: results.length,
        success: successCount,
        errors: errorCount,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
    
  } catch (error: any) {
    // Clean up uploaded file
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    
    res.status(500).json({ 
      error: 'Failed to process CSV file', 
      message: error.message 
    });
  }
});

export default router;
