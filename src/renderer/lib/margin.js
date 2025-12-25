// Margin calculation helpers.
// Kept small + explicit because this drives KPIs, charts, and per-product UI.

export function calcProfit(costPrice, sellingPrice) {
  const cost = Number(costPrice || 0);
  const sell = Number(sellingPrice || 0);
  return sell - cost;
}

export function calcMarginPct(costPrice, sellingPrice) {
  const sell = Number(sellingPrice || 0);
  if (sell <= 0) return 0;
  const profit = calcProfit(costPrice, sellingPrice);
  return (profit / sell) * 100;
}

// "Project margin" should be weighted by revenue (Excel-style summary):
// sum(profit) / sum(revenue) instead of averaging row percentages.
export function calcTotals(products) {
  const items = Array.isArray(products) ? products : [];
  const revenue = items.reduce((acc, p) => acc + Number(p?.sellingPrice || 0), 0);
  const cost = items.reduce((acc, p) => acc + Number(p?.costPrice || 0), 0);
  const profit = revenue - cost;
  const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;
  return { revenue, cost, profit, marginPct };
}


