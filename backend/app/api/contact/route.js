import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const DEFAULT_CONTACT = {
  appName: "AVS Matrimony",
  officeAddress: "ஆறுநாட்டு வேளாளர் தலைமை சங்கம், 1-2, சன்னதி வீதி, திருவானைக்காவல், திருச்சி - 620005",
  adminName: "Manoj Kumar",
  phone: "+91 96296 61778",
  whatsapp: "+91 96296 61778",
  email: "avsmatrimony26@gmail.com",
  workingHours: "Monday - Saturday: 9:00 AM - 6:00 PM (Sunday Holiday)",
  aboutText: "AVS Matrimony is the official and trusted matrimonial platform for the Arunattu Vellalar community, bringing families together through secure and verified matchmaking.",
  superAdminMobileNumbers: [
    "+91 9629661777"
  ]
};

/**
 * GET /api/contact
 * Dynamically loads and returns official office, contact, and admin details.
 */
export async function GET() {
  let config = { ...DEFAULT_CONTACT };
  try {
    const filePath = path.join(process.cwd(), "contact-config.json");
    if (!fs.existsSync(filePath)) {
      // Auto-create file template if deleted
      fs.writeFileSync(filePath, JSON.stringify(DEFAULT_CONTACT, null, 2), "utf-8");
    }
    const fileContent = fs.readFileSync(filePath, "utf-8");
    config = JSON.parse(fileContent);
  } catch (err) {
    console.error("Error reading contact config:", err);
  }

  // Fetch active admins from DB
  try {
    const svc = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data: admins, error } = await svc
      .from("admin_details")
      .select("name, email, mobile, whatsapp")
      .eq("status", "active")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching admin details from DB:", error);
      config.admins = [];
    } else {
      config.admins = admins || [];
    }
  } catch (dbErr) {
    console.error("Error initializing Supabase client in contact route:", dbErr);
    config.admins = [];
  }

  return NextResponse.json(config);
}
