// components/products/unit-attribute-form.tsx
"use client";

export function UnitAttributeForm({ unit, attributes, onSave, onCancel }) {
  const [localUnit, setLocalUnit] = useState(unit);
  const [localAttrs, setLocalAttrs] = useState(attributes);
  const [showNewUnit, setShowNewUnit] = useState(false);
  const [newAttribute, setNewAttribute] = useState({ name: "", value: "" });

  const handleAddAttribute = () => {
    if (newAttribute.name && newAttribute.value) {
      setLocalAttrs([
        ...localAttrs,
        {
          id: Date.now(),
          ...newAttribute,
        },
      ]);
      setNewAttribute({ name: "", value: "" });
    }
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Quản lý đơn vị tính và thuộc tính</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Unit Section */}
          <div>
            <Label className="mb-2 block">Đơn vị tính</Label>
            <div className="flex items-center gap-2">
              <Select value={localUnit} onValueChange={setLocalUnit}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Chọn đơn vị" />
                </SelectTrigger>
                <SelectContent>
                  {/* Load units from API */}
                  <SelectItem value="cái">Cái</SelectItem>
                  <SelectItem value="hộp">Hộp</SelectItem>
                  <SelectItem value="thùng">Thùng</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewUnit(true)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Attributes Section */}
          <div>
            <Label className="mb-2 block">Thuộc tính</Label>

            {/* Existing Attributes */}
            {localAttrs.map((attr, idx) => (
              <div key={attr.id} className="flex items-center gap-2 mb-2">
                <span className="flex-1 text-sm">
                  {attr.attributeName}: {attr.attributeValue}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setLocalAttrs(localAttrs.filter((_, i) => i !== idx))
                  }>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {/* Add New Attribute */}
            <div className="flex items-center gap-2 mt-4">
              <Select
                value={newAttribute.name}
                onValueChange={(name) =>
                  setNewAttribute((prev) => ({ ...prev, name }))
                }>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Chọn thuộc tính" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Màu sắc">Màu sắc</SelectItem>
                  <SelectItem value="Kích thước">Kích thước</SelectItem>
                  <SelectItem value="Chất liệu">Chất liệu</SelectItem>
                  {/* Add "Tạo mới" option */}
                  <SelectSeparator />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      /* Show create attribute form */
                    }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Tạo thuộc tính mới
                  </Button>
                </SelectContent>
              </Select>

              <Input
                placeholder="Giá trị"
                value={newAttribute.value}
                onChange={(e) =>
                  setNewAttribute((prev) => ({
                    ...prev,
                    value: e.target.value,
                  }))
                }
              />

              <Button type="button" onClick={handleAddAttribute}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Hủy
          </Button>
          <Button onClick={() => onSave(localUnit, localAttrs)}>Xong</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
