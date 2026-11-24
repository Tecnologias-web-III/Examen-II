import "dotenv/config";
import grpc from "@grpc/grpc-js";
import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET || "clave-demo-cambiese-en-produccion";

export function createToken(username) {
  return jwt.sign({ sub: username, role: "admin" }, secret, { algorithm: "HS256", expiresIn: "1h" });
}

// Devuelve true si el token es valido; si no, responde UNAUTHENTICATED y devuelve false
export function requireAuth(call, callback) {
  const raw = call.metadata.get("authorization")[0];
  const token = typeof raw === "string" && raw.startsWith("Bearer ") ? raw.slice(7) : null;
  if (!token) {
    callback({ code: grpc.status.UNAUTHENTICATED, message: "Se requiere authorization: Bearer <token>" });
    return false;
  }
  try {
    call.user = jwt.verify(token, secret, { algorithms: ["HS256"] });
    return true;
  } catch {
    callback({ code: grpc.status.UNAUTHENTICATED, message: "El token JWT es invalido o expiro" });
    return false;
  }
}