import React from "react";
import styles from "./totalClientsCard.module.css";

type Props = {
  /* static for now — props reserved for future use */
};

const TotalClientsCard: React.FC<Props> = () => {
  const total = 547;
  const personal = 396;
  const business = 157;

  // donut math (percentage of circle)
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(
    100,
    Math.round((total / (personal + business + 0)) * 100)
  ); // defensive
  const offset = circumference * (1 - progress / 100);

  return (
    <div className={styles.card}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.icon} aria-hidden></span>
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
                <stop offset="100%" stopColor="#1420FF" stopOpacity="1" />
              </linearGradient>
              <linearGradient id="g2" x1="0" x2="1">
                <stop offset="0%" stopColor="#1420FF" />
                <stop offset="100%" stopColor="#1420FF" />
              </linearGradient>
            </defs>

            {/* background track */}
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
