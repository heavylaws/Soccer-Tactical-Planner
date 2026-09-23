// CoachTactics Authoritative Drill REST API Router
import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/authMiddleware.ts';
import {
  defaultDrillService,
  NotFoundError,
  ForbiddenError,
  ValidationError,
  DrillService,
} from './drillService.ts';

export function createDrillRouter(service: DrillService = defaultDrillService): Router {
  const router = Router();

  // All drill operations require authenticated server identity
  router.use(requireAuth);

  // GET /api/drills - List all authorized drills for the current user
  router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const drills = await service.getDrillsForUser(req.user!);
      res.json({
        success: true,
        count: drills.length,
        drills,
      });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to retrieve drills' });
    }
  });

  // GET /api/drills/:id - Retrieve single drill
  router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const drill = await service.getDrillById(req.params.id, req.user!);
      res.json({ success: true, drill });
    } catch (err: any) {
      if (err instanceof NotFoundError) {
        return res.status(404).json({ success: false, error: err.message });
      }
      res.status(500).json({ success: false, error: 'Failed to retrieve drill' });
    }
  });

  // POST /api/drills - Create a new tactical drill
  router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const created = await service.createDrill(req.body, req.user!);
      res.status(201).json({
        success: true,
        drill: created,
      });
    } catch (err: any) {
      if (err instanceof ValidationError) {
        return res.status(422).json({
          success: false,
          error: err.message,
          details: err.details,
        });
      }
      res.status(500).json({ success: false, error: 'Failed to create drill' });
    }
  });

  // PATCH /api/drills/:id - Update an existing tactical drill
  router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await service.updateDrill(req.params.id, req.body, req.user!);
      res.json({
        success: true,
        drill: updated,
      });
    } catch (err: any) {
      if (err instanceof NotFoundError) {
        return res.status(404).json({ success: false, error: err.message });
      }
      if (err instanceof ForbiddenError) {
        return res.status(403).json({ success: false, error: err.message });
      }
      if (err instanceof ValidationError) {
        return res.status(422).json({
          success: false,
          error: err.message,
          details: err.details,
        });
      }
      res.status(500).json({ success: false, error: 'Failed to update drill' });
    }
  });

  // PUT /api/drills/:id - Alias for PATCH
  router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await service.updateDrill(req.params.id, req.body, req.user!);
      res.json({
        success: true,
        drill: updated,
      });
    } catch (err: any) {
      if (err instanceof NotFoundError) {
        return res.status(404).json({ success: false, error: err.message });
      }
      if (err instanceof ForbiddenError) {
        return res.status(403).json({ success: false, error: err.message });
      }
      if (err instanceof ValidationError) {
        return res.status(422).json({
          success: false,
          error: err.message,
          details: err.details,
        });
      }
      res.status(500).json({ success: false, error: 'Failed to update drill' });
    }
  });

  // DELETE /api/drills/:id - Delete an existing tactical drill
  router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      await service.deleteDrill(req.params.id, req.user!);
      res.json({ success: true, message: 'Drill deleted successfully' });
    } catch (err: any) {
      if (err instanceof NotFoundError) {
        return res.status(404).json({ success: false, error: err.message });
      }
      if (err instanceof ForbiddenError) {
        return res.status(403).json({ success: false, error: err.message });
      }
      res.status(500).json({ success: false, error: 'Failed to delete drill' });
    }
  });

  // POST /api/drills/migrate - Migrate legacy localStorage drills
  router.post('/migrate', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const rawDrills = req.body?.drills || req.body;
      const result = await service.migrateLegacyDrills(rawDrills, req.user!);
      res.json({
        success: true,
        imported: result.imported,
        failed: result.failed,
        drills: result.drills,
      });
    } catch (err: any) {
      if (err instanceof ValidationError) {
        return res.status(422).json({ success: false, error: err.message });
      }
      res.status(500).json({ success: false, error: 'Failed to migrate drills' });
    }
  });

  return router;
}

export const drillRouter = createDrillRouter();
