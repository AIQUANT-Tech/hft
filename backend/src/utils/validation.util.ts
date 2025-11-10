// src/utils/validation.util.ts

export class ValidationUtil {
  static validateAddress(address: string): string {
    try {
      // Basic Cardano address validation
      if (!address.startsWith("addr")) {
        throw new Error("Invalid preprod address - must start with addr_test1");
      }

      if (address.length < 50) {
        throw new Error("Invalid address length");
      }

      return address;
    } catch (error: any) {
      throw new Error(`Invalid Cardano address: ${error.message}`);
    }
  }

  static validateMnemonic(mnemonic: string): void {
    const words = mnemonic.trim().split(/\s+/);
    if (words.length !== 24 && words.length !== 15 && words.length !== 12) {
      throw new Error("Mnemonic must be 12, 15, or 24 words");
    }
  }

  static sanitizePathComponent(component: string): string {
    return component.replace(/[^a-zA-Z0-9_-]/g, "_");
  }
}
