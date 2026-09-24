"use client";

import { FileText, Link2 } from "lucide-react";
import type { Product } from "@/lib/api/products";

interface ProductPublicationTabProps {
  product: Product;
}

const formatPublicationDate = (value?: string) => {
  if (!value) return "-";
  const datePart = value.slice(0, 10);
  const [year, month, day] = datePart.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
};

export function ProductPublicationTab({
  product,
}: ProductPublicationTabProps) {
  const documents = product.documents ?? [];

  return (
    <div className="space-y-4">
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">
          Thông tin công bố
        </h4>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
          <div className="min-w-0">
            <dt className="text-xs text-gray-500">Nhà công bố</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900 break-words">
              {product.publicationLocation?.publisher || "-"}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-gray-500">Ngày công bố</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">
              {formatPublicationDate(product.publicationDate)}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-gray-500">Link công bố</dt>
            <dd className="mt-1 text-sm font-medium">
              {product.publicationLink ? (
                <a
                  href={product.publicationLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-full items-start gap-1 text-brand hover:underline">
                  <Link2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="break-all">{product.publicationLink}</span>
                </a>
              ) : (
                <span className="text-gray-900">-</span>
              )}
            </dd>
          </div>
        </dl>
      </div>

      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">
          File công bố
        </h4>
        {documents.length > 0 ? (
          <ul className="space-y-2">
            {documents.map((document, index) => {
              const name =
                document.originalName ||
                document.url.split("/").pop() ||
                `Tài liệu ${index + 1}`;

              return (
                <li
                  key={document.id || `${document.url}-${index}`}
                  className="flex min-w-0 items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                  <a
                    href={document.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 break-all text-brand hover:underline"
                    title={name}>
                    {name}
                  </a>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">-</p>
        )}
      </div>
    </div>
  );
}
