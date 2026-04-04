import { z } from "zod";

export const ProfileSchema = z.object({
  mobile_number: z
    .string()
    .min(1, { message: "Mobile number is required" })
    .regex(/^\d+$/, { message: "Mobile number must only contain numeric digits." }),
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().email("Invalid email format").optional(),
  type: z.enum(["bride", "groom"], { invalid_type_error: "Type must be bride or groom" }).optional(),
});

export const LoginSchema = z.object({
  type: z.enum(["email", "mobile"], { required_error: "Login type is required" }),
  identifier: z.string().min(1, { message: "Identifier is required" }),
  otp: z.string().length(6, "OTP must be exactly 6 digits").optional()
});
