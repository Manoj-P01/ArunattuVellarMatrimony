import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createSwaggerSpec } from "next-swagger-doc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  console.log("Generating Swagger spec...");
  
  const spec = createSwaggerSpec({
    apiFolder: "app/api",
    definition: {
      openapi: "3.0.0",
      info: {
        title: "AVS Matrimony API",
        version: "1.0.0",
      },
      components: {
        securitySchemes: {
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
      security: [],
    },
  });

  const outputPath = path.join(__dirname, "../public/swagger.json");
  const publicDir = path.dirname(outputPath);
  
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(spec, null, 2), "utf-8");
  console.log("Swagger spec successfully written to public/swagger.json");
} catch (error) {
  console.error("Failed to generate Swagger spec:", error);
  process.exit(1);
}
