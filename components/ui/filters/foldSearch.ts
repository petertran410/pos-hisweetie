// So khớp tìm kiếm không phân biệt dấu/hoa thường: "thuong" khớp "Thương".
export const foldSearch = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();
