import { Router, Request, Response } from 'express';
import db from '../database';
import { PlantEvent } from '../types';

const router = Router();

// Get all events for a plant
router.get('/plant/:plantId', (req: Request, res: Response) => {
  const { plantId } = req.params;
  const { eventType } = req.query;

  let query = 'SELECT * FROM plant_events WHERE plant_id = ?';
  const params: any[] = [plantId];

  if (eventType) {
    query += ' AND event_type = ?';
    params.push(eventType);
  }

  query += ' ORDER BY event_date DESC';

  db.all(query, params, (err, rows: PlantEvent[]) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get single event
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM plant_events WHERE id = ?', [id], (err, row: PlantEvent) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    res.json(row);
  });
});

// Create new event
router.post('/', (req: Request, res: Response) => {
  const event: PlantEvent = req.body;
  
  // Check for duplicate event on the same day
  const checkQuery = `
    SELECT id FROM plant_events 
    WHERE plant_id = ? AND event_type = ? AND event_date = ?
    LIMIT 1
  `;
  
  db.get(checkQuery, [event.plant_id, event.event_type, event.event_date], (err, existingEvent) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (existingEvent) {
      res.status(409).json({ error: 'An event of this type already exists for this plant on this date' });
      return;
    }
    
    const query = `
      INSERT INTO plant_events (plant_id, event_type, event_date, notes)
      VALUES (?, ?, ?, ?)
    `;

    const params = [
      event.plant_id,
      event.event_type,
      event.event_date,
      event.notes || null
    ];

    db.run(query, params, function(err) {
      if (err) {
        // Handle unique constraint violation
        if (err.message && err.message.includes('UNIQUE constraint failed')) {
          res.status(409).json({ error: 'An event of this type already exists for this plant on this date' });
        } else {
          res.status(500).json({ error: err.message });
        }
        return;
      }
      res.status(201).json({ id: this.lastID, ...event });
    });
  });
});

// Update event
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const event: PlantEvent = req.body;
  
  const query = `
    UPDATE plant_events 
    SET event_type = ?, event_date = ?, notes = ?
    WHERE id = ?
  `;

  const params = [
    event.event_type,
    event.event_date,
    event.notes || null,
    id
  ];

  db.run(query, params, function(err) {
    if (err) {
      // Handle unique constraint violation
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        res.status(409).json({ error: 'An event of this type already exists for this plant on this date' });
      } else {
        res.status(500).json({ error: err.message });
      }
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    res.json({ id, ...event });
  });
});

// Delete event
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  db.run('DELETE FROM plant_events WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    res.json({ message: 'Event deleted successfully' });
  });
});

export default router;
