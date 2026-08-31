"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { costPerUnitLabel, formatYield } from "@/lib/public-recipes/format";
import type { PublicRecipe } from "@/lib/public-recipes/types";
import styles from "../feature.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";
const money = (value: number | null) => value == null ? "Chưa cập nhật" : `${new Intl.NumberFormat("vi-VN").format(Math.round(value))} ₫`;
const typeLabel = (type: string) => type === "FINISHED_PRODUCT" ? "Thành phẩm" : "Bán thành phẩm";
const quantity = (value: number) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);

function storageRows(storage: unknown): Array<[string, string]> {
  if (!storage) return [];
  if (typeof storage === "string") return [["Hướng dẫn", storage]];
  if (typeof storage !== "object" || Array.isArray(storage)) return [];
  return Object.entries(storage as Record<string, unknown>).filter(([, value]) => value != null && ["string", "number", "boolean"].includes(typeof value)).map(([key, value]) => [key.replace(/([A-Z])/g, " $1"), String(value)]);
}

export default function DetailClient({ recipe: sourceRecipe }: { recipe: PublicRecipe }) {
  const recipe = { ...sourceRecipe, type: typeLabel(sourceRecipe.type) };
  const images = recipe.media.filter(item => item.type.toLowerCase() === "image").sort((a, b) => a.sortOrder - b.sortOrder);
  const videos = recipe.media.filter(item => item.type.toLowerCase() === "video").sort((a, b) => a.sortOrder - b.sortOrder);
  const visualImages = images.length ? images : recipe.thumbnail ? [{ type: "image", url: recipe.thumbnail, altText: recipe.name, sortOrder: 0 }] : [];
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  useEffect(() => { if (!lightboxOpen) return; const handler = (event: KeyboardEvent) => { if (event.key === "ArrowLeft") setActiveImage(index => (index - 1 + visualImages.length) % visualImages.length); if (event.key === "ArrowRight") setActiveImage(index => (index + 1) % visualImages.length); }; document.addEventListener("keydown", handler); return () => document.removeEventListener("keydown", handler); }, [lightboxOpen, visualImages.length]);
  const share = async () => { try { if (navigator.share) await navigator.share({ title: recipe.name, text: recipe.description || undefined, url: location.href }); else { await navigator.clipboard.writeText(location.href); toast.success("Đã copy đường dẫn công thức."); } } catch (error) { if ((error as DOMException).name !== "AbortError") toast.error("Không thể chia sẻ công thức."); } };
  const download = async (variant: "full" | "guide") => { const id = toast.loading("Đang chuẩn bị tài liệu…"); try { const response = await fetch(`${API_URL}/public/recipes/${encodeURIComponent(recipe.slug)}/pdf?variant=${variant}`); if (!response.ok) throw new Error(); const blob = await response.blob(); saveBlob(blob, `${recipe.slug}-${variant}.pdf`); toast.success("Tài liệu đã sẵn sàng.", { id }); } catch { toast.error("Không thể tải tài liệu. Vui lòng thử lại.", { id }); } finally { setDownloadOpen(false); } };
  const downloadImage = async () => { const image = visualImages[activeImage]; if (!image) return; const id = toast.loading("Đang tải hình ảnh…"); try { const response = await fetch(image.url); if (!response.ok) throw new Error(); saveBlob(await response.blob(), `${recipe.slug}-image-${activeImage + 1}`); toast.success("Đã tải hình ảnh.", { id }); } catch { toast.error("Không thể tải hình ảnh từ nguồn media.", { id }); } finally { setDownloadOpen(false); } };
  const storage = storageRows(recipe.storage);
  const steps = [...recipe.steps].sort((a, b) => a.sortOrder - b.sortOrder);
  return <main className={styles.main}><section className={`${styles.detail} ${styles.wrap}`}><nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/cong-thuc">Catalogue công thức</Link><span>/</span><span aria-current="page">{recipe.name}</span></nav><div className={styles.detailHead}><div className={styles.detailCopy}><div className={styles.chips}><span className={styles.tag}>{recipe.type}</span>{recipe.category && <span className={`${styles.tag} ${styles.tagGold}`}>{recipe.category.name}</span>}</div><h1>{recipe.name}</h1><p>{recipe.description || "Công thức chuẩn hóa dành cho vận hành quầy pha chế."}</p><div className={styles.actions}><div><button className={`${styles.button} ${styles.primary}`} aria-expanded={downloadOpen} onClick={() => setDownloadOpen(value => !value)}>Tải tài liệu</button>{downloadOpen && <div className={styles.infoBox} role="menu"><button className={styles.button} onClick={() => download("full")}>PDF đầy đủ</button><button className={styles.button} onClick={() => download("guide")}>PDF nguyên liệu + hướng dẫn</button><button className={styles.button} onClick={downloadImage} disabled={!visualImages.length}>Tải ảnh đang xem</button></div>}</div><button className={styles.button} onClick={share}>Chia sẻ</button></div>{videos.length > 0 ? <div className={styles.video}>{videos.map(video => <video key={video.url} controls preload="metadata" playsInline aria-label={video.altText || `Video hướng dẫn ${recipe.name}`}><source src={video.url} /></video>)}</div> : <div className={`${styles.video} ${styles.noVideo}`}><strong>Chưa có video hướng dẫn</strong><br /><small>Quy trình từng bước vẫn có đầy đủ bên dưới.</small></div>}</div><div>{visualImages.length ? <><button className={styles.detailImage} onClick={() => setLightboxOpen(true)} aria-label="Mở ảnh công thức trong lightbox"><Image src={visualImages[activeImage].url} alt={visualImages[activeImage].altText || recipe.name} fill sizes="(max-width: 800px) 100vw, 55vw" unoptimized /></button>{visualImages.length > 1 && <div className={styles.gallery}>{visualImages.map((image, index) => <button className={styles.thumb} key={`${image.url}-${index}`} aria-label={`Xem ảnh ${index + 1}`} aria-current={index === activeImage} onClick={() => setActiveImage(index)}><Image src={image.url} alt="" width={160} height={160} unoptimized /></button>)}</div>}</> : <div className={styles.detailImage}><div className={styles.fallback}>Hình ảnh công thức đang được cập nhật</div></div>}</div></div>
    <section className={styles.section}><h2>Thông số pha chế</h2><div className={styles.infoGrid}><div className={styles.infoBox}><small>Sản lượng</small><strong>{formatYield(recipe.yield)}</strong></div><div className={styles.infoBox}><small>Chi phí tổng</small><strong>{money(recipe.totalCost)}</strong></div><div className={styles.infoBox}><small>{costPerUnitLabel(recipe.yield)}</small><strong>{money(recipe.costPerOutputUnit)}</strong></div></div></section>
    <div className={styles.detailColumns}><section><h2>Nguyên liệu</h2>{recipe.ingredients.map((item, index) => <div className={styles.ingredient} key={`${item.name}-${index}`}><span><strong>{item.name}</strong>{item.note && <><br /><small>{item.note}</small></>}</span><span>{quantity(item.quantity)} {item.unit}</span><span>{item.includeInCost ? money(item.lineCost) : "Không tính phí"}</span></div>)}</section><section><h2>Các bước thực hiện</h2><ol className={styles.steps}>{steps.map((step, index) => <li key={`${step.sortOrder}-${index}`}>{step.title && <strong>{step.title}<br /></strong>}{step.content}{step.notes && <div className={styles.note}>{step.notes}</div>}</li>)}</ol></section></div>
    {storage.length > 0 && <section className={styles.section}><h2>Bảo quản &amp; chuyển giao</h2><div className={styles.infoGrid}>{storage.map(([label, value]) => <div className={styles.infoBox} key={label}><small>{label}</small><strong>{value}</strong></div>)}</div></section>}
    {recipe.related.length > 0 && <section className={styles.section}><h2>Công thức liên quan</h2><div className={styles.related}>{recipe.related.map(item => <Link href={`/cong-thuc/${item.slug}`} key={item.slug}><small>{typeLabel(item.type)}</small><strong>{item.name}</strong><small>{item.category?.name || formatYield(item.yield)}</small></Link>)}</div></section>}</section>
    <div className={styles.stickyActions} aria-label="Thao tác nhanh"><button className={`${styles.button} ${styles.primary}`} onClick={() => setDownloadOpen(true)}>Tải tài liệu</button><button className={styles.button} onClick={share}>Chia sẻ</button></div>
    <Dialog.Root open={lightboxOpen} onOpenChange={setLightboxOpen}><Dialog.Portal><Dialog.Overlay className={styles.lightbox}><Dialog.Content className={styles.lightboxStage} aria-describedby={undefined}><Dialog.Title className="sr-only">Bộ ảnh {recipe.name}</Dialog.Title>{visualImages[activeImage] && <Image src={visualImages[activeImage].url} alt={visualImages[activeImage].altText || recipe.name} width={1200} height={900} unoptimized />}<Dialog.Close className={styles.lightboxClose} aria-label="Đóng ảnh">×</Dialog.Close>{visualImages.length > 1 && <><button className={`${styles.lightboxNav} ${styles.lightboxPrev}`} onClick={() => setActiveImage(index => (index - 1 + visualImages.length) % visualImages.length)} aria-label="Ảnh trước">‹</button><button className={`${styles.lightboxNav} ${styles.lightboxNext}`} onClick={() => setActiveImage(index => (index + 1) % visualImages.length)} aria-label="Ảnh tiếp theo">›</button></>}</Dialog.Content></Dialog.Overlay></Dialog.Portal></Dialog.Root></main>;
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
