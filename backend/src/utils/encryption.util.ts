// src/utils/encryption.util.ts
import CryptoJS from "crypto-js";
import config from "../config/environment.js";

export class EncryptionUtil {
  private static getPassphrase(): string {
    const passphrase = config.PASSPHRASE;
    if (!passphrase) {
      throw new Error("PASSPHRASE not configured in environment");
    }
    return passphrase;
  }

  /*************  ✨ Windsurf Command ⭐  *************/
  /**
   * Encrypts a private key using the configured passphrase.
   * @param privateKey the private key to encrypt
   * @returns the encrypted private key as a string
   */
  /*******  f6822683-588e-4989-b69b-327fc52ecb1e  *******/ static encrypt(
    privateKey: string
  ): string {
    const passphrase = this.getPassphrase();
    return CryptoJS.AES.encrypt(privateKey, passphrase).toString();
  }

  static decrypt(encryptedPrivateKey: string): string {
    const passphrase = this.getPassphrase();
    const bytes = CryptoJS.AES.decrypt(encryptedPrivateKey, passphrase);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
}
