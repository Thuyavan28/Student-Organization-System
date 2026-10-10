// All amounts are integer paise.
export function applyPercentDiscount(amount, percent) {
  const discount = Math.round((amount * (percent || 0)) / 100);
  return { discount, final: amount - discount };
}

export function sumBy(items, pick) {
  return items.reduce((total, item) => total + pick(item), 0);
}
