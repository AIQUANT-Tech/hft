import axios from "axios";

export const formatPrice = (price: string | number): string => {
  const priceNum = typeof price === "string" ? parseFloat(price) : price;
  if (!priceNum || priceNum === 0) return "N/A";

  // ✅ Convert to string without scientific notation
  // This will show full decimals like 0.000000009619
  const priceStr = priceNum.toFixed(20); // Use high precision

  // Remove trailing zeros
  const trimmed = priceStr.replace(/\.?0+$/, "");

  return `₳${trimmed}`;
};

export const generateAvatarUrl = (name: string): string => {
  if (!name) return "";

  // Using DiceBear API - free avatar generator
  // Available styles: adventurer, avataaars, bottts, identicon, initials, etc.
  const style = "initials"; // Clean, professional initials
  const seed = encodeURIComponent(name);

  return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&backgroundColor=3b82f6,06b6d4,8b5cf6`;
};

let cachedAdaPrice: number = 0;
let lastFetchTime = 0;

export async function getAdaPriceCached(): Promise<number> {
  const now = Date.now();
  if (cachedAdaPrice && now - lastFetchTime < 60 * 1000) {
    return cachedAdaPrice;
  }

  const response = await axios.get(
    "https://api.coingecko.com/api/v3/simple/price?ids=cardano&vs_currencies=usd"
  );

  cachedAdaPrice = response.data?.cardano?.usd || 0;
  lastFetchTime = now;
  return cachedAdaPrice;
}
