import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DB_PATH || './database.sqlite';

/**
 * Cleanup script to remove orphaned photo records from the database
 * that don't have corresponding physical files
 */
function cleanupOrphanedPhotos() {
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err);
      process.exit(1);
    }
  });

  db.serialize(() => {
    console.log('Starting orphaned photo cleanup...\n');

    // Get all photos
    const query = `SELECT id, photo_path FROM plant_photos`;

    db.all(query, [], (err, rows: any[]) => {
      if (err) {
        console.error('Error fetching photos:', err);
        db.close();
        process.exit(1);
      }

      console.log(`Found ${rows.length} photo records to check\n`);

      const uploadDir = process.env.UPLOAD_DIR || './uploads';
      const orphanedIds: number[] = [];
      let validCount = 0;

      rows.forEach((row) => {
        // Convert database path to physical path
        // Database: /uploads/1/plant_name/filename.jpg
        // Physical: uploads/1/plant_name/filename.jpg
        const relativePath = row.photo_path.startsWith('/') 
          ? row.photo_path.substring(1) 
          : row.photo_path;
        
        const physicalPath = path.join(__dirname, '../../', relativePath);

        if (!fs.existsSync(physicalPath)) {
          console.log(`❌ Orphaned: ${row.photo_path}`);
          orphanedIds.push(row.id);
        } else {
          validCount++;
        }
      });

      console.log('\n' + '='.repeat(60));
      console.log(`✅ Valid photos: ${validCount}`);
      console.log(`❌ Orphaned photos: ${orphanedIds.length}`);
      console.log('='.repeat(60) + '\n');

      if (orphanedIds.length === 0) {
        console.log('No orphaned photos to clean up!');
        db.close();
        return;
      }

      console.log('Deleting orphaned photo records from database...\n');

      // Delete orphaned records
      const deleteStmt = db.prepare('DELETE FROM plant_photos WHERE id = ?');
      
      let deletedCount = 0;
      orphanedIds.forEach((id, index) => {
        deleteStmt.run(id, (err: any) => {
          if (err) {
            console.error(`❌ Error deleting photo ${id}: ${err.message}`);
          } else {
            deletedCount++;
          }

          // Check if we're done
          if (index === orphanedIds.length - 1) {
            deleteStmt.finalize(() => {
              console.log('\n' + '='.repeat(60));
              console.log('Cleanup Complete!');
              console.log('='.repeat(60));
              console.log(`✅ Deleted ${deletedCount} orphaned photo records`);
              console.log('='.repeat(60) + '\n');
              
              db.close();
            });
          }
        });
      });
    });
  });
}

// Run the cleanup
console.log('Orphaned Photo Cleanup Script');
console.log('='.repeat(60));
console.log('This will remove database records for photos that');
console.log('don\'t have corresponding physical files');
console.log('='.repeat(60) + '\n');

cleanupOrphanedPhotos();
