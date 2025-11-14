import { Router, Request, Response } from 'express';
import db from '../database';
import { Plant, PlantWithLastWatered } from '../types';

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

export default router;
