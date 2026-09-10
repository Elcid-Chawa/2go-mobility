import { Router } from "express";
import { PaymentController } from "./payment.controller";
import { authenticate } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { z } from "zod";
import { PaymentMethod } from "../../constants/tripStatus";

const router = Router();

router.use(authenticate);

router.post(
  "/:id/payment",
  validate(
    z.object({
      body: z.object({
        method: z.nativeEnum(PaymentMethod).optional(),
      }),
      params: z.object({ id: z.string().min(1) }),
    }),
  ),
  PaymentController.recordPayment,
);
router.get("/:id/payment", PaymentController.getPayment);

export default router;
