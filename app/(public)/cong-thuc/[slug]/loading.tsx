import styles from "../feature.module.css";

export default function Loading() {
  return <main className={styles.main}><section className={`${styles.detail} ${styles.wrap}`} aria-busy="true"><div className={styles.detailHead}><div className={styles.skeleton} /><div className={styles.skeleton} /></div></section></main>;
}
