import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { LoginSchema } from "../../../../lib/validations.js";
import { generateAccessToken, generateRefreshToken } from "../../../../lib/auth.js";

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate a user
 *     description: Accepts login credentials and securely returns an Access Token along with an HttpOnly Refresh Token cookie.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type: 
 *                 type: string
 *                 example: email
 *               identifier:
 *                 type: string
 *                 example: user@example.com
 *               otp:
 *                 type: string
 *                 example: 123456
 *     responses:
 *       200:
 *         description: Successfully authenticated
 *       400:
 *         description: Validation error
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const validated = LoginSchema.parse(body);

    // Mock verification of the user based on validated credentials
    const userPayload = {
      id: "usr_123",
      identifier: validated.identifier,
      role: "user"
    };

    const accessToken = generateAccessToken(userPayload);
    const refreshToken = generateRefreshToken(userPayload);

    // Securely deploy the HttpOnly Refresh Token
    const cookieStore = await cookies();
    cookieStore.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: "/",
    });

    return NextResponse.json({ success: true, accessToken });
  } catch (error) {
    if (error.name === "ZodError") {
      return NextResponse.json({ success: false, errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
