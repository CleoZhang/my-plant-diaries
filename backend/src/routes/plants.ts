import { Router, Request, Response } from 'express';
import db from '../database';
import { Plant, PlantWithLastWatered, PlantPhoto } from '../types';
import fs from 'fs';
import path from 'path';

const router = Router();

// Get all plants with last watered date
router.get('/', (req: Request, res: Response) => {
  const query = `
    SELECT 
      p.*,
      (SELECT event_date 
       FROM plant_events 
       WHERE plant_id = p.id AND event_type = 'Water'
       ORDER BY event_date DESC 
       LIMIT 1) as last_watered
    FROM plants p
    ORDER BY p.name ASC
  `;

  db.all(query, [], (err, rows: PlantWithLastWatered[]) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get single plant by ID
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  const query = `
    SELECT 
      p.*,
      (SELECT event_date 
       FROM plant_events 
       WHERE plant_id = p.id AND event_type = 'Water'
       ORDER BY event_date DESC 
       LIMIT 1) as last_watered
    FROM plants p
    WHERE p.id = ?
  `;

  db.get(query, [id], (err, row: PlantWithLastWatered) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }
    res.json(row);
  });
});

// Create new plant
router.post('/', (req: Request, res: Response) => {
  const plant: Plant = req.body;
  
  const query = `
    INSERT INTO plants (
      name, alias, price, delivery_fee, purchased_from, 
      purchased_when, received_when, purchase_notes, status, profile_photo
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    plant.name,
    plant.alias || null,
    plant.price || null,
    plant.delivery_fee || null,
    plant.purchased_from || null,
    plant.purchased_when || null,
    plant.received_when || null,
    plant.purchase_notes || null,
    plant.status || 'Alive',
    plant.profile_photo || null
  ];

  db.run(query, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.status(201).json({ id: this.lastID, ...plant });
  });
});

// Update plant
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const plant: Plant = req.body;
  
  const query = `
    UPDATE plants 
    SET name = ?, alias = ?, price = ?, delivery_fee = ?, purchased_from = ?,
        purchased_when = ?, received_when = ?, purchase_notes = ?, status = ?, 
        profile_photo = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  const params = [
    plant.name,
    plant.alias || null,
    plant.price || null,
    plant.delivery_fee || null,
    plant.purchased_from || null,
    plant.purchased_when || null,
    plant.received_when || null,
    plant.purchase_notes || null,
    plant.status || 'Alive',
    plant.profile_photo || null,
    id
  ];

  db.run(query, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }
    res.json({ id, ...plant });
  });
});

// Delete plant
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  // First, get all photos associated with this plant
  db.all('SELECT * FROM plant_photos WHERE plant_id = ?', [id], (err, photos: PlantPhoto[]) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    // Delete the physical photo files from uploads folder
    photos.forEach((photo) => {
      const filePath = path.join(__dirname, '../../uploads', path.basename(photo.photo_path));
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`Deleted photo file: ${filePath}`);
        } catch (error) {
          console.error(`Failed to delete photo file: ${filePath}`, error);
        }
      }
    });

    // Get the profile photo if it exists
    db.get('SELECT profile_photo FROM plants WHERE id = ?', [id], (err, plant: any) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      // Delete the profile photo file if it exists
      if (plant && plant.profile_photo) {
        const profilePhotoPath = path.join(__dirname, '../../uploads', path.basename(plant.profile_photo));
        if (fs.existsSync(profilePhotoPath)) {
          try {
            fs.unlinkSync(profilePhotoPath);
            console.log(`Deleted profile photo file: ${profilePhotoPath}`);
          } catch (error) {
            console.error(`Failed to delete profile photo file: ${profilePhotoPath}`, error);
          }
        }
      }

      // Now delete the plant from the database (CASCADE will delete related records)
      db.run('DELETE FROM plants WHERE id = ?', [id], function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        if (this.changes === 0) {
          res.status(404).json({ error: 'Plant not found' });
          return;
        }
        res.json({ message: 'Plant deleted successfully' });
      });
    });
  });
});

export default router;
