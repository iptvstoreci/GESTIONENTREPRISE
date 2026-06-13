export const currencySymbols: Record<string, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  CAD: "C$",
  AUD: "A$",
  CHF: "CHF",
  JPY: "¥",
  CNY: "¥",
  XOF: "FCFA",
};

export function formatCurrency(amount: number, currencyCode: string = "EUR"): string {
  const symbol = currencySymbols[currencyCode] || currencyCode;
  const isRightSymbol = !["$", "£", "C$", "A$", "¥"].includes(symbol);
  
  if (isRightSymbol) {
    const space = symbol.length > 1 ? " " : "";
    return `${amount.toLocaleString()}${space}${symbol}`;
  } else {
    return `${symbol}${amount.toLocaleString()}`;
  }
}
