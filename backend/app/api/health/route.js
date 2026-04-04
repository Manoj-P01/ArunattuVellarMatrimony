import { NextResponse } from "next/server";

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Returns the health status of the API
 *     description: Returns a simple JSON response confirming the API is running correctly.
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 service:
 *                   type: string
 *                   example: avs-matrimony-api
 *                 framework:
 *                   type: string
 *                   example: next
 */
export async function GET() {
  return NextResponse.json({ ok: true, service: "avs-matrimony-api", framework: "next" });
}
