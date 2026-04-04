import { NextResponse } from "next/server";
import { SAMPLE_PROFILES } from "../../../lib/sampleData.js";
import { ProfileSchema } from "../../../lib/validations.js";

/**
 * @swagger
 * /api/profiles:
 *   get:
 *     summary: Get all profiles
 *     description: Returns a list of sample profiles
 *     responses:
 *       200:
 *         description: Success
 */
export async function GET() {
  return NextResponse.json(SAMPLE_PROFILES);
}

/**
 * @swagger
 * /api/profiles:
 *   post:
 *     summary: Create or update a profile
 *     description: Accepts profile details and enforces that mobile_number strictly numeric format.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mobile_number
 *             properties:
 *               mobile_number:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Profile processed successfully
 *       400:
 *         description: Validation error
 */
export async function POST(request) {
  try {
    const body = await request.json();
    
    // Trigger Zod validation
    const validatedData = ProfileSchema.parse(body);

    // Validation passes if we reach here
    return NextResponse.json({ success: true, profile: validatedData }, { status: 201 });
  } catch (error) {
    if (error.name === "ZodError") {
      return NextResponse.json({ success: false, errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
