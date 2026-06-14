import { z } from "zod";

/**
 * Phone values are stored as "COUNTRYCODE|NUMBER", e.g. "+91|9876543210".
 * MobileSchema validates that:
 *  - The value is non-empty
 *  - If it contains "|", the number part is at least 5 digits
 *  - If it is a plain digit string (legacy), it is accepted as-is
 */
export const MobileSchema = z
  .string()
  .min(1, { message: "Mobile number is required" })
  .refine(
    (val) => {
      if (!val) return false;
      if (val.includes("|")) {
        const number = val.split("|").slice(1).join("|");
        return /^\d{5,15}$/.test(number);
      }
      // legacy plain number
      return /^\d{5,15}$/.test(val);
    },
    { message: "Please enter a valid phone number (at least 5 digits)." }
  );
