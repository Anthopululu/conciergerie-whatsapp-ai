// Health check endpoint pour monitoring production

import { Request, Response } from 'express';
import { dbQueries } from './database';

export function healthCheck(req: Request, res: Response) {
  try {
    // Vérifier que la base de données est accessible
    const conciergeries = dbQueries.getAllConciergeries();
    
    // Vérifier que la base de données répond
    if (!conciergeries || conciergeries.length === undefined) {
      return res.status(503).json({
        status: 'unhealthy',
        database: 'unavailable',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}


