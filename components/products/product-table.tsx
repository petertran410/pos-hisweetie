// components/products/product-table.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { MoreVertical, Plus, Settings } from "lucide-react";
import { useState } from "react";

export function ProductTable() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "code",
    "name",
    "category",
    "retailPrice",
    "stock",
    "actions",
  ]);

  const { data, isLoading } = useQuery({
    queryKey: ["products", page, pageSize],
    queryFn: () => productsApi.getAll({ page, limit: pageSize }),
  });

  const columns: ColumnDef<Product>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
        />
      ),
    },
    {
      accessorKey: "code",
      header: "Mã hàng",
      visible: visibleColumns.includes("code"),
    },
    {
      accessorKey: "name",
      header: "Tên hàng",
      visible: visibleColumns.includes("name"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <img
            src={row.original.image || "/placeholder.png"}
            alt=""
            className="w-10 h-10 rounded object-cover"
          />
          <span>{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: "category.name",
      header: "Nhóm hàng",
      visible: visibleColumns.includes("category"),
    },
    {
      accessorKey: "retailPrice",
      header: "Giá bán",
      visible: visibleColumns.includes("retailPrice"),
      cell: ({ row }) => formatCurrency(row.original.retailPrice),
    },
    {
      accessorKey: "stockQuantity",
      header: "Tồn kho",
      visible: visibleColumns.includes("stock"),
      cell: ({ row }) => {
        const stock = row.original.stockQuantity;
        const min = row.original.minStockAlert;
        return (
          <span className={stock <= min ? "text-red-500" : ""}>{stock}</span>
        );
      },
    },
    {
      id: "actions",
      header: "Thao tác",
      visible: visibleColumns.includes("actions"),
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleViewDetail(row.original)}>
              Xem chi tiết
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEdit(row.original)}>
              Chỉnh sửa
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDelete(row.original)}
              className="text-red-600">
              Xóa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ].filter((col) => col.visible !== false);

  return (
    <div className="p-6 space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Thêm sản phẩm
          </Button>

          {selectedRows.length > 0 && (
            <>
              <Button variant="outline">Xuất Excel</Button>
              <Button variant="outline" className="text-red-600">
                Xóa ({selectedRows.length})
              </Button>
            </>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Tùy chỉnh cột
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {ALL_COLUMNS.map((col) => (
              <DropdownMenuCheckboxItem
                key={col.id}
                checked={visibleColumns.includes(col.id)}
                onCheckedChange={(checked) => {
                  setVisibleColumns((prev) =>
                    checked
                      ? [...prev, col.id]
                      : prev.filter((id) => id !== col.id)
                  );
                }}>
                {col.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <DataTable
          columns={columns}
          data={data?.data || []}
          onRowClick={handleViewDetail}
        />
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Hiển thị</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(val) => setPageSize(+val)}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[15, 20, 30, 50, 100].map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            trên {data?.total || 0} sản phẩm
          </span>
        </div>

        <Pagination
          currentPage={page}
          totalPages={Math.ceil((data?.total || 0) / pageSize)}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
