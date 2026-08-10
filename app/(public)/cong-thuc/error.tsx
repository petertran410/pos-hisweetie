"use client";

import styles from "./feature.module.css";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className={styles.main}><section className={`${styles.catalogue} ${styles.wrap}`}><div className={styles.error} role="alert"><h3>Không thể tải catalogue</h3><p>Kết nối tới thư viện công thức đang tạm gián đoạn.</p><button className={`${styles.button} ${styles.primary}`} onClick={reset}>Thử lại</button></div></section></main>;
}
