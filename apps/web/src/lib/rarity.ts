export const rarityOptions: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'Common', label: 'C - Common' },
  { value: 'Uncommon', label: 'U - Uncommon' },
  { value: 'Rare', label: 'R - Rare' },
  { value: 'Double Rare', label: 'RR - Double Rare' },
  { value: 'Triple Rare', label: 'RRR - Triple Rare' },
  { value: 'Prism Rare', label: 'PR - Prism Rare' },
  { value: 'Trainer Rare', label: 'TR - Trainer Rare' },
  { value: 'Super Rare', label: 'SR - Super Rare' },
  { value: 'Hyper Rare', label: 'HR - Hyper Rare' },
  { value: 'Ultra Rare', label: 'UR - Ultra Rare' },
  { value: 'Radiant Rare', label: 'K - Radiant Rare' },
  { value: 'Amazing Rare', label: 'A - Amazing Rare' },
  { value: 'Art Rare', label: 'AR - Art Rare' },
  { value: 'Illustration Rare', label: 'AR - Illustration Rare' },
  { value: 'Special Art Rare', label: 'SAR - Special Art Rare' },
  { value: 'Special Illustration Rare', label: 'SAR - Special Illustration Rare' },
  { value: 'Shiny Rare', label: 'S - Shiny Rare' },
  { value: 'Shiny Super Rare', label: 'SSR - Shiny Super Rare' },
  { value: 'ACE SPEC', label: 'ACE - ACE SPEC' },
  { value: 'Black White Rare', label: 'BWR - Black White Rare' },
  { value: 'Mega Ultra Rare', label: 'MUR - Mega Ultra Rare' },
  { value: 'Mega Attack Rare', label: 'MA - Mega Attack Rare' },
  { value: 'Promo', label: 'PROMO - Promo' },
  { value: 'Unmarked', label: 'Tanpa Tanda' },
  { value: 'Sealed Product', label: 'SEALED - Bukan kartu satuan' },
];

const rarityCodeByValue = new Map(
  rarityOptions.map((option) => [option.value, option.label.split(' - ')[0]]),
);

export function getRarityCode(value?: string) {
  if (!value) return '-';
  return rarityCodeByValue.get(value) || value;
}

export function getRarityLabel(value?: string) {
  if (!value) return '-';
  return rarityOptions.find((option) => option.value === value)?.label || value;
}
