/// <reference path="./types/express.d.ts" />

import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

// Import routes
import authRouter from './routes/auth';
import plantsRouter from './routes/plants';
import eventsRouter from './routes/events';
import photosRouter from './routes/photos';
import uploadRouter from './routes/upload';
import tagsRouter from './routes/tags';
import eventTypesRouter from './routes/eventTypes';
import csvImportRouter from './routes/csvImport';

// Load environment variables
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins during development
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/plants', plantsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/photos', photosRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/event-types', eventTypesRouter);
app.use('/api/csv', csvImportRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'My Plant Diaries API is running' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Access locally: http://localhost:${PORT}`);
  console.log(`Access from network: http://192.168.50.210:${PORT}`);
});

export default app;
