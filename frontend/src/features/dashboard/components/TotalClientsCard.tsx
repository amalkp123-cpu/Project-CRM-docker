import { useEffect, useState } from "react";
import styles from "./totalClientsCard.module.css";

const API_URL = import.meta.env.VITE_API_URL || "";

interface Counts {
  personalClients: number;
  businessClients: number;
  totalClients: number;
}

const TotalClientsCard = () => {
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${API_URL}/api/dashboard/counts`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((r) => r.json())
      .then(setCounts)
      .catch(() => {
        /* silent fail; dashboard must not crash */
      });
  }, []);

  const personal = counts?.personalClients ?? 0;
  const business = counts?.businessClients ?? 0;
  const total = counts?.totalClients ?? 0;

  /* donut math */
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress =
    personal + business > 0
      ? Math.round((total / (personal + business)) * 100)
      : 0;
  const offset = circumference * (1 - progress / 100);

  return (
    <div className={styles.card}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.icon} aria-hidden />
          <h3 className={styles.title}>Total Clients</h3>
        </div>
      </header>

      <div className={styles.body}>
        <div className={styles.donutWrap} aria-hidden>
          <svg
            className={styles.donut}
            width="140"
            height="140"
            viewBox="0 0 140 140"
          >
            <defs>
              <linearGradient id="g1" x1="0" x2="1">
                <stop offset="0%" stopColor="#1420FF" />
                <stop offset="100%" stopColor="#1420FF" />
              </linearGradient>
              <linearGradient id="g2" x1="0" x2="1">
                <stop offset="0%" stopColor="#E5E7EB" />
                <stop offset="100%" stopColor="#E5E7EB" />
              </linearGradient>
            </defs>

            <g transform="translate(70,70)">
              <circle
                r={radius}
                stroke="url(#g2)"
                strokeWidth="4"
                fill="none"
              />
              <circle
                r={radius}
                stroke="url(#g1)"
                strokeWidth="4"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform="rotate(-90)"
              />
            </g>
          </svg>

          <div className={styles.donutLabel}>
            <div className={styles.totalNumber}>{total}</div>
            <div className={styles.totalText}>Total</div>
          </div>
        </div>

        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <span className={styles.dotDark} />
            <div className={styles.legendText}>
              <div className={styles.legendTitle}>Personal Clients</div>
              <div className={styles.legendValue}>{personal}</div>
            </div>
          </div>

          <div className={styles.legendItem}>
            <span className={styles.dotLight} />
            <div className={styles.legendText}>
              <div className={styles.legendTitle}>Business Clients</div>
              <div className={styles.legendValue}>{business}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TotalClientsCard;
