# My Plant Diaries 🪴

A comprehensive full-stack application for tracking and managing your houseplants. Built with React, TypeScript, Node.js, Express, and SQLite.

## Features

### Plant Management
- **Add & Edit Plants**: Store detailed information about each plant including name, price, delivery fee, purchase location, dates, and status
- **Multiple Views**: Switch between card view (with photos) and list view (table format)
- **Filter & Sort**: Filter by status and purchase location; sort by name, dates, or last watered
- **Plant Status**: Track whether plants are Alive, Dead, Binned, or Given Away

### Event Tracking
- **Calendar View**: Visual calendar for each plant showing all events
- **Event Types**: Water 💧, Trim ✂️, Repot 🪴, Propagate 🌱, Other 📝, New Leaf 🍃
- **Quick Add/Delete**: Click on calendar dates to add or remove events
- **Event History**: View recent events for each type
- **Custom Events**: Support for adding custom event types (extensible)

### Photo Management
- **Profile Photos**: Set a main profile photo for each plant
- **Photo Gallery**: Upload multiple photos to journal plant growth
- **Photo Metadata**: Add captions and dates to photos

### User Experience
- **Responsive Design**: Optimized for mobile, tablet, and desktop
- **Date Formatting**: UK-style dates (e.g., "25, Jun 2025")
- **Currency**: GBP (£) formatting for prices
- **User-Configurable Tags**: Add custom purchase locations
- **Collapsible Information**: Clean, organized interface

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **React Router** for navigation
- **React Calendar** for event tracking
- **React DatePicker** for date inputs
- **Axios** for API calls

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **SQLite** for database (easy to migrate to cloud later)
- **Multer** for file uploads
- **CORS** for cross-origin requests

## Project Structure

```
my-plant-diaries/
├── backend/
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   ├── database.ts      # Database initialization
│   │   ├── types.ts         # TypeScript interfaces
│   │   └── server.ts        # Express app setup
│   ├── uploads/             # Uploaded photos
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API service layer
│   │   ├── utils/           # Helper functions
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   cd my-plant-diaries
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Set up environment variables**
   ```bash
   cd ../backend
   cp .env.example .env
   ```

### Running the Application

1. **Start the backend server** (from `backend` directory)
   ```bash
   npm run dev
   ```
   Server will run on http://localhost:3001

2. **Start the frontend dev server** (from `frontend` directory, in a new terminal)
   ```bash
   npm run dev
   ```
   Application will open on http://localhost:3000

### Building for Production

1. **Build the backend**
   ```bash
   cd backend
   npm run build
   npm start
   ```

2. **Build the frontend**
   ```bash
   cd frontend
   npm run build
   ```
   Built files will be in `frontend/dist`

## Customization

### Changing the Default Plant Placeholder Image

Plants without profile photos will display a placeholder image (currently a 🪴 plant emoji). To customize this:

1. Open `frontend/src/utils/constants.ts`
2. Update the `PLANT_PLACEHOLDER_IMAGE` constant with one of these options:

   **Option A: Use a different image URL**
   ```typescript
   export const PLANT_PLACEHOLDER_IMAGE = '/images/placeholder-plant.png';
   ```

   **Option B: Use an external URL**
   ```typescript
   export const PLANT_PLACEHOLDER_IMAGE = 'https://your-cdn.com/default-plant.jpg';
   ```

   **Option C: Use a different emoji or SVG** (Current default)
   ```typescript
   export const PLANT_PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,...';
   ```

3. If using a local image file, place it in the `frontend/public/images/` directory (create if needed)

## API Endpoints

### Plants
- `GET /api/plants` - Get all plants with last watered date
- `GET /api/plants/:id` - Get single plant
- `POST /api/plants` - Create new plant
- `PUT /api/plants/:id` - Update plant
- `DELETE /api/plants/:id` - Delete plant

### Events
- `GET /api/events/plant/:plantId` - Get all events for a plant
- `POST /api/events` - Create new event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### Photos
- `GET /api/photos/plant/:plantId` - Get all photos for a plant
- `POST /api/photos` - Create photo entry
- `PUT /api/photos/:id` - Update photo metadata
- `DELETE /api/photos/:id` - Delete photo

### Upload
- `POST /api/upload/single` - Upload single photo
- `POST /api/upload/multiple` - Upload multiple photos

### Tags
- `GET /api/tags` - Get all tags
- `POST /api/tags` - Create new tag
- `DELETE /api/tags/:id` - Delete tag

### Event Types
- `GET /api/event-types` - Get all event types
- `POST /api/event-types` - Create custom event type
- `DELETE /api/event-types/:id` - Delete custom event type

## Database Schema

### Plants Table
- id, name, price, delivery_fee, purchased_from, purchased_when, received_when, status, profile_photo

### Plant Events Table
- id, plant_id, event_type, event_date, notes

### Plant Photos Table
- id, plant_id, photo_path, caption, taken_at

### Tags Table
- id, tag_name, tag_type

### Event Types Table
- id, name, emoji, is_custom

## Future Enhancements

- Cloud database integration (PostgreSQL, MongoDB)
- User authentication and multi-user support
- Push notifications for watering reminders
- Plant care tips and recommendations
- Export data to CSV/PDF
- Dark mode
- Mobile app (React Native)
- Integration with plant identification APIs

## License

MIT

## Author

Created for plant lovers who want to keep their green friends healthy and thriving! 🌿
