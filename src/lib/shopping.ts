const SHOPPING_KEYWORDS = [
  "buy",
  "shop",
  "shopping",
  "purchase",
  "order",
  "grocery",
  "groceries",
  "store",
  "pick up",
  "pickup",
  "get supplies",
  "supplies",
  "materials",
  "acquire",
  "hardware store",
  "home depot",
  "lowes",
  "walmart",
  "target",
  "amazon",
  "costco",
];

export function isShoppingTask(
  title: string,
  description?: string | null,
): boolean {
  const text = `${title} ${description ?? ""}`.toLowerCase();
  return SHOPPING_KEYWORDS.some((kw) => text.includes(kw));
}

const SHOPPING_DISMISSED_PREFIX = "tq_shop_dismissed_";

export function isShoppingDismissed(taskId: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(`${SHOPPING_DISMISSED_PREFIX}${taskId}`) === "1";
}

export function dismissShopping(taskId: string): void {
  localStorage.setItem(`${SHOPPING_DISMISSED_PREFIX}${taskId}`, "1");
}
