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
