import { RequestHandler, Router } from "express";
import { CustomerController } from "../controllers/customers.controller";
import { AuthenticatedRequest } from '../types';
import { checkRole } from '../middleware/auth';


const router = Router();


// Define routes for customer API
router.get("/", 
    // checkRole(['superAdmin']),
    CustomerController.getCustomers);
router.get("/:id", CustomerController.getCustomerById);
router.post("/", CustomerController.addCustomer);
router.put("/:id", CustomerController.updateCustomer);
router.delete("/:id", CustomerController.softDeleteCustomer);

export default router;