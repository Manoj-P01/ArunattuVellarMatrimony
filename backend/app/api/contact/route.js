import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const DEFAULT_CONTACT = {
  appName: "AVS Matrimony",
  officeAddress: "AVS Matrimony Head Office, 45, Saffron Bazar Street, Tirunelveli, Tamil Nadu - 627001",
  adminName: "Manoj Kumar",
  phone: "+91 94434 08662",
  whatsapp: "+91 94434 08662",
  email: "support@avsmatrimony.com",
  workingHours: "Monday - Saturday: 9:00 AM - 6:00 PM (Sunday Holiday)",
  aboutText: "AVS Matrimony is the official and trusted matrimonial platform for the Arunattu Vellalar community, bringing families together through secure and verified matchmaking."
};

/**
 * GET /api/contact
 * Dynamically loads and returns official office, contact, and admin details.
 */
export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "contact-config.json");
    if (!fs.existsSync(filePath)) {
      // Auto-create file template if deleted
      fs.writeFileSync(filePath, JSON.stringify(DEFAULT_CONTACT, null, 2), "utf-8");
    }
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const config = JSON.parse(fileContent);
    return NextResponse.json(config);
  } catch (err) {
    console.error("Error reading contact config:", err);
    return NextResponse.json(DEFAULT_CONTACT);
  }
}
