import dotenv from "dotenv";
import jwt from "jsonwebtoken";

// Load .env from backend root
dotenv.config({ path: ".env" });

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not loaded");
}

const token = jwt.sign(
  {
    user_id: "dev-admin",
    role: "admin",
  },
  process.env.JWT_SECRET,
  { expiresIn: "1h" }
);

console.log(token);
