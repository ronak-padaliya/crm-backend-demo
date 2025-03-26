import { Router, Request, Response, NextFunction } from "express";
// import { app, upload } from '../app';
import { AuthenticatedRequest } from '../types';
import { SalesCardController } from "../controllers/salesCards.controller";
import { body } from 'express-validator';
import { checkRole } from '../middleware/auth';
import multer from "multer";
const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.get("/",
    // checkRole(['superAdmin']),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await SalesCardController.getSalesCards(req, res, next);
            return next();
        } catch (error) {
            next(error);
        }
    }
);
router.get("/:id", 
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            await SalesCardController.getSalesCardById(req, res, next);
            return next();
        } catch (error) {
            next(error);
        }
    }
);
router.post("/", 
    (req: Request, res: Response, next: NextFunction) => SalesCardController.addSalesCard(req, res, next)
);
router.put("/:id", 
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await SalesCardController.updateSalesCard(req, res, next);
        } catch (error) {
            next(error);
        }
    }
);

router.put("/:id", upload.single('image_url'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        await SalesCardController.updateSalesCardForOrderConfirmed(req, res, next);
    } catch (error) {
        next(error);
    }
});
router.post("/approve/:notificationId", checkRole(["admin", "supervisor"]), async (req: Request, res: Response, next: NextFunction) => {
    try {
        await SalesCardController.approveSalesCard(req, res, next);
    } catch (error) {
        next(error);
    }
});
router.post("/reject/:notificationId", checkRole(["admin", "supervisor"]), async (req: Request, res: Response, next: NextFunction) => {
    try {
        await SalesCardController.rejectSalesCard(req, res, next);
    } catch (error) {
        next(error);
    }
});

router.delete("/:id", SalesCardController.softDeleteSalesCard);
// Route to get the latest sales card, accepts query parameters: page, limit, customerPhone, customerEmail
router.get("/latest/:customerPhone", SalesCardController.getLatestSalesCard);

// router.post('/filtered', 
//     body('page').isNumeric().optional(),
//     body('limit').isNumeric().optional(),
//     body('email').optional().custom(value => value === '' || value === undefined || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)),
//     body('firstName').optional().custom(value => value === '' || value === undefined || typeof value === 'string'),
//     body('lastName').optional().custom(value => value === '' || value === undefined || typeof value === 'string'),
//     body('phone').optional().custom(value => value === '' || value === undefined || typeof value === 'string'),
//     SalesCardController.getFilteredSalesCards
//   );

export default router;
