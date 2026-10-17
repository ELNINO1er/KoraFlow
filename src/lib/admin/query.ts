export type AdminSearchParams = Record<string, string | string[] | undefined>;
export const ADMIN_PAGE_SIZE = 25;

export function queryValue(params: AdminSearchParams, key: string): string {
  const value = params[key];
  return (typeof value === "string" ? value : "").trim().slice(0, 200);
}

export function parseAdminQuery(params: AdminSearchParams) {
  const rawPage = queryValue(params, "page");
  const page = /^\d+$/.test(rawPage) ? Number(rawPage) : 1;
  return {
    q: queryValue(params, "q"),
    status: queryValue(params, "status"),
    sort: queryValue(params, "sort") === "oldest" ? "asc" as const : "desc" as const,
    page: Number.isSafeInteger(page) && page > 0 ? Math.min(page, 100_000) : 1,
    actor: queryValue(params, "actor"),
    organization: queryValue(params, "organization"),
    action: queryValue(params, "action"),
    from: validDate(queryValue(params, "from")),
    to: validDate(queryValue(params, "to")),
  };
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : "";
}

export type AdminQuery = ReturnType<typeof parseAdminQuery>;

export function pagination(total: number, requestedPage: number) {
  const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const page = Math.min(requestedPage, pages);
  return { total, pages, page, skip: (page - 1) * ADMIN_PAGE_SIZE, take: ADMIN_PAGE_SIZE };
}

export function adminPageHref(path: string, params: AdminSearchParams, page: number) {
  const query = new URLSearchParams();
  for (const key of ["q", "status", "sort", "actor", "organization", "action", "from", "to"]) {
    const value = queryValue(params, key);
    if (value) query.set(key, value);
  }
  query.set("page", String(page));
  return `${path}?${query}`;
}
