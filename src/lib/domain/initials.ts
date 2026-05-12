const WORD_PATTERN = /[\p{L}\p{N}]+/gu;

export function generatePharmacistInitials(firstName: string, lastName: string) {
  const words = `${firstName} ${lastName}`.match(WORD_PATTERN) ?? [];

  return words
    .map((word) => word[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();
}
