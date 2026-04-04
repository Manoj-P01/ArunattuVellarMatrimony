import { z } from "zod";

export const MobileSchema = z
  .string()
  .min(1, { message: "Mobile number is required" })
  .regex(/^\d+$/, { message: "Mobile number must only contain numeric digits." });
