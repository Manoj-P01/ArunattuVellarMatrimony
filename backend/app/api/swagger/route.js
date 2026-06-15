import { NextResponse } from "next/server";
import { getApiDocs } from "../../../lib/swagger";
import spec from "../../../public/swagger.json";

export async function GET() {
  if (process.env.NODE_ENV === "development") {
    try {
      const dynamicSpec = await getApiDocs();
      return NextResponse.json(dynamicSpec);
    } catch (error) {
      console.error("Error generating dynamic swagger spec:", error);
    }
  }
  return NextResponse.json(spec);
}
