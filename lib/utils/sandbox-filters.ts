/**
 * Giả lập filter/sort/paginate phía client, match API behavior.
 * Dùng generic để tái sử dụng cho orders, invoices, returnOrders, packings.
 */

interface PaginateResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export function sandboxQuery<T extends Record<string, any>>(
  items: T[],
  params: any = {}
): PaginateResult<T> {
  let filtered = [...items];

  // ── Text search (code, customer.name) ──
  if (params.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.code?.toLowerCase().includes(q) ||
        item.customer?.name?.toLowerCase().includes(q)
    );
  }

  // ── Status filter ──
  if (params.status != null) {
    const statuses = Array.isArray(params.status)
      ? params.status
      : [params.status];
    filtered = filtered.filter((item) => statuses.includes(item.status));
  }
  if (params.statusIds?.length) {
    filtered = filtered.filter((item) =>
      params.statusIds.includes(item.status)
    );
  }

  // ── Branch filter ──
  if (params.branchId) {
    filtered = filtered.filter(
      (item) => item.branchId === Number(params.branchId)
    );
  }

  // ── Customer filter ──
  if (params.customerId) {
    filtered = filtered.filter(
      (item) => item.customerId === Number(params.customerId)
    );
  }

  // ── Date range (fromDate / toDate) ──
  const dateField = params.orderBy === "createdAt" ? "createdAt" : "orderDate";
  if (params.fromDate) {
    const from = new Date(params.fromDate).getTime();
    filtered = filtered.filter(
      (item) => new Date(item[dateField] || item.createdAt).getTime() >= from
    );
  }
  if (params.toDate) {
    const to = new Date(params.toDate).getTime() + 86400000; // inclusive end
    filtered = filtered.filter(
      (item) => new Date(item[dateField] || item.createdAt).getTime() < to
    );
  }

  // ── Sort ──
  const sortField = params.orderBy || "createdAt";
  const sortDir = params.orderDirection === "asc" ? 1 : -1;
  filtered.sort((a, b) => {
    const va = a[sortField] ?? "";
    const vb = b[sortField] ?? "";
    if (va < vb) return -1 * sortDir;
    if (va > vb) return 1 * sortDir;
    return 0;
  });

  // ── Paginate ──
  const total = filtered.length;
  const page = params.page || 1;
  const limit = params.limit || params.pageSize || 15;
  const offset = params.currentItem ?? (page - 1) * limit;
  const data = filtered.slice(offset, offset + limit);

  return { data, total, page, limit };
}
