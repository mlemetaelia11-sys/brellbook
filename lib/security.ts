import crypto from "crypto";
export function randomToken(){return crypto.randomBytes(32).toString("hex")}
export function hashToken(token:string){return crypto.createHash("sha256").update(token).digest("hex")}
export function safePhone(phone:string){return phone.replace(/[^\d+]/g,"").trim()}
