// FILE: server/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import router yang ada di folder src/routes
import routes from './src/routes/index.js'; 
import { errorHandler } from './src/middlewares/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.CLIENT_URL
  ].filter(Boolean),
  credentials: true
}));
app.use(express.json());

// Routes Utama (Prefix: /api)
// Request ke /api/gherkin akan diarahkan ke routes
app.use('/api', routes);

// Error Handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server SpecWeave berjalan di port ${PORT}`);
});