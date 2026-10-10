export function itemLabel(item) {
  if (!item) return 'Item';
  const name = item.variant?.product?.name ?? item.productName ?? item.name ?? 'Item';
  const size = item.variant?.size ?? item.size;
  return size ? `${name} (${size === 'ONE_SIZE' ? 'One size' : size})` : name;
}
