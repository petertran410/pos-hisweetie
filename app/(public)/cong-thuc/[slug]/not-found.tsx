import Link from "next/link";
import styles from "../feature.module.css";

export default function NotFound() {
  return <main className={styles.main}><section className={`${styles.catalogue} ${styles.wrap}`}><div className={styles.empty}><h3>Không tìm thấy công thức</h3><p>Công thức có thể đã được cập nhật hoặc chưa được công khai.</p><Link className={`${styles.button} ${styles.primary}`} href="/cong-thuc">Về catalogue</Link></div></section></main>;
}
