import styles from "./feature.module.css";

export default function Loading() {
  return <main className={styles.main}><section className={`${styles.catalogue} ${styles.wrap}`} aria-busy="true" aria-label="Đang tải catalogue"><div className={styles.grid}>{Array.from({ length: 6 }, (_, index) => <div className={styles.skeleton} key={index} />)}</div></section></main>;
}
