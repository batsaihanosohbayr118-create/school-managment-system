/** "1250000" → "1,250,000". Decimals, if any, are kept as written. */
export function groupThousands(digits: string): string {
  const [whole, fraction] = digits.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}


export function formatAmountLabel(label: string): string {
  return label.replace(/\d[\d\s,]*(\.\d+)?/, (match) => {
    const digits = match.replace(/[\s,]/g, "");
    const trailingSpace = /\s$/.test(match) ? " " : "";
    return groupThousands(digits) + trailingSpace;
  });
}
