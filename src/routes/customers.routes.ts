import { RequestHandler, Router } from "express";
import { CustomerController } from "../controllers/customers.controller.js";
import { AuthenticatedRequest } from '../types/index.js';
import { checkRole } from '../middleware/auth.js';


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