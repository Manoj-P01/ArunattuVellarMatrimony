import { NextResponse } from "next/server";
import { SAMPLE_NOTIFICATIONS } from "../../../lib/sampleData.js";

export async function GET() {
  return NextResponse.json(SAMPLE_NOTIFICATIONS);
}
