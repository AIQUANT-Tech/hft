// src/utils/encryption.util.ts

import crypto from "crypto";
import environment from "../config/environment.js";

export class EncryptionUtil {
  private static readonly ALGORITHM = "aes-256-gcm";

  // ✅ Get master key as Buffer (ensure 32 bytes)
  private static getMasterKeyBuffer(): Buffer {
    const key = environment.ENCRYPTION_KEY;

    if (!key) {
      throw new Error("❌ ENCRYPTION_KEY environment variable is not set!");
    }

    // If it's a 64-character hex string, convert it
    if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
      return Buffer.from(key, "hex");
    }

    // Otherwise, hash it to ensure exactly 32 bytes
    return crypto.createHash("sha256").update(key).digest();
  }

  // ✅ Encrypt with owner-specific key
  static encrypt(text: string, ownerAddress: string): string {
    try {
      // Derive key from master key + owner address
      const derivedKey = this.deriveKey(ownerAddress);

      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.ALGORITHM, derivedKey, iv);

      let encrypted = cipher.update(text, "utf8", "hex");
      encrypted += cipher.final("hex");

      const authTag = cipher.getAuthTag();

      // Format: iv:authTag:encryptedData
      return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
    } catch (error) {
      console.error("❌ Encryption error:", error);
      throw error;
    }
  }

  // ✅ Decrypt with owner-specific key (REQUIRED)
  static decrypt(encryptedData: string, ownerAddress: string): string {
    try {
      const parts = encryptedData.split(":");
      if (parts.length !== 3) {
        throw new Error("Invalid encrypted data format");
      }

      const [ivHex, authTagHex, encrypted] = parts;

      // ✅ ALWAYS use owner address to derive key
      const derivedKey = this.deriveKey(ownerAddress);

      const iv = Buffer.from(ivHex, "hex");
      const authTag = Buffer.from(authTagHex, "hex");

      const decipher = crypto.createDecipheriv(this.ALGORITHM, derivedKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error: any) {
      console.error("❌ Decryption error:", error.message);
      throw error;
    }
  }

  // ✅ Derive encryption key from master key + owner address
  private static deriveKey(ownerAddress: string): Buffer {
    try {
      const masterKeyBuffer = this.getMasterKeyBuffer();

      // Use PBKDF2 to derive a unique key for this owner
      return crypto.pbkdf2Sync(
        masterKeyBuffer,
        ownerAddress, // Owner address as salt
        100000, // Iterations
        32, // Key length (32 bytes for AES-256)
        "sha256"
      );
    } catch (error) {
      console.error("❌ Key derivation error:", error);
      throw error;
    }
  }
}
