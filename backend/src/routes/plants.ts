import { Router, Request, Response } from 'express';
import db from '../database';
import { Plant, PlantWithLastWatered, PlantPhoto } from '../types';
import fs from 'fs';
import path from 'path';
import { deletePlantUploadFolder } from '../utils/uploadUtils';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Get all plants with last watered date
router.get('/', authenticateToken, (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const isAdmin = req.user!.isAdmin;
  
  // Admin can see all plants, regular users only see their own
  const query = isAdmin ? `
    SELECT 
      p.*,
      (SELECT event_date 
       FROM plant_events 
       WHERE plant_id = p.id AND event_type = 'Water'
       ORDER BY event_date DESC 
       LIMIT 1) as last_watered
    FROM plants p
    ORDER BY p.name ASC
  ` : `
    SELECT 
      p.*,
      (SELECT event_date 
       FROM plant_events 
       WHERE plant_id = p.id AND event_type = 'Water'
       ORDER BY event_date DESC 
       LIMIT 1) as last_watered
    FROM plants p
    WHERE p.user_id = ? OR p.user_id IS NULL
    ORDER BY p.name ASC
  `;

  db.all(query, isAdmin ? [] : [userId], (err, rows: PlantWithLastWatered[]) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get single plant by ID
router.get('/:id', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  const isAdmin = req.user!.isAdmin;
  
  const query = isAdmin ? `
    SELECT 
      p.*,
      (SELECT event_date 
       FROM plant_events 
       WHERE plant_id = p.id AND event_type = 'Water'
       ORDER BY event_date DESC 
       LIMIT 1) as last_watered
    FROM plants p
    WHERE p.id = ?
  ` : `
    SELECT 
      p.*,
      (SELECT event_date 
       FROM plant_events 
       WHERE plant_id = p.id AND event_type = 'Water'
       ORDER BY event_date DESC 
       LIMIT 1) as last_watered
    FROM plants p
    WHERE p.id = ? AND (p.user_id = ? OR p.user_id IS NULL)
  `;

  db.get(query, isAdmin ? [id] : [id, userId], (err, row: PlantWithLastWatered) => {
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
router.post('/', authenticateToken, (req: Request, res: Response) => {
  const plant: Plant = req.body;
  const userId = req.user!.userId;
  
  // Check if plant with the same name already exists for this user
  db.get('SELECT id FROM plants WHERE name = ? AND user_id = ?', [plant.name, userId], (err, existing: any) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (existing) {
      res.status(409).json({ error: 'A plant with this name already exists' });
      return;
    }
    
    const query = `
      INSERT INTO plants (
        name, alias, price, delivery_fee, purchased_from, 
        purchased_when, received_when, purchase_notes, status, profile_photo, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      userId
    ];

    db.run(query, params, function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          res.status(409).json({ error: 'A plant with this name already exists' });
          return;
        }
        res.status(500).json({ error: err.message });
        return;
      }
      res.status(201).json({ id: this.lastID, ...plant });
    });
  });
});

// Update plant
router.put('/:id', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params;
  const plant: Plant = req.body;
  const userId = req.user!.userId;
  
  // Check if another plant with the same name already exists for this user (excluding current plant)
  db.get('SELECT id FROM plants WHERE name = ? AND id != ? AND user_id = ?', [plant.name, id, userId], (err, existing: any) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (existing) {
      res.status(409).json({ error: 'A plant with this name already exists' });
      return;
    }
    
    const query = `
      UPDATE plants 
      SET name = ?, alias = ?, price = ?, delivery_fee = ?, purchased_from = ?,
          purchased_when = ?, received_when = ?, purchase_notes = ?, status = ?, 
          profile_photo = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
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
      id,
      userId
    ];

    db.run(query, params, function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          res.status(409).json({ error: 'A plant with this name already exists' });
          return;
        }
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
});

// Delete plant
router.delete('/:id', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  
  // Get plant name to delete its folder
  db.get('SELECT name, user_id FROM plants WHERE id = ? AND user_id = ?', [id, userId], (err, plant: any) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!plant) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }

    // Delete the plant's entire upload folder with all photos
    deletePlantUploadFolder(plant.user_id, plant.name);

    // Now delete the plant from the database (CASCADE will delete related records)
    db.run('DELETE FROM plants WHERE id = ? AND user_id = ?', [id, userId], function(err) {
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

export default router;
