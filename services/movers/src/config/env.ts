import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const port = Number(process.env.PORT || 5101);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: port,
  MONGODB_URI:
    process.env.MONGODB_URI || "mongodb://localhost:27017/2go_movers",
  AUTH_API_URL: process.env.AUTH_API_URL || "http://localhost:5000/api/v1",
};
