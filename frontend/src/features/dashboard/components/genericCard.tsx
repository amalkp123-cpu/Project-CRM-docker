import React from "react";
import styles from "./totalClientsCard.module.css";

type Props = {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
};

const GenericCard: React.FC<Props> = () => {
  return (
    <div className={styles.card}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.icon} aria-hidden></span>
          <h3 className={styles.title}>Dashboard Card</h3>
        </div>
      </header>

      <div className={styles.body}></div>
    </div>
  );
};

export default GenericCard;
