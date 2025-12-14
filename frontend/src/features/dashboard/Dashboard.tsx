import styles from "./Dashboard.module.css";
import TotalClientsCard from "./components/TotalClientsCard";
import GenericCard from "./components/genericCard";

const Dashboard = () => {
  return (
    <>
      <div className={styles.dashboard}>
        <section className={styles.dashSection}>
          <div className={styles.dashCard}>
            <TotalClientsCard />
          </div>
          <div className={styles.dashCard}>
            <GenericCard />
          </div>
        </section>
        <section className={styles.dashSection}>
          <div className={styles.dashCard}>
            <GenericCard />
          </div>
        </section>
        <section className={styles.dashSection}>
          <div className={styles.dashCard}>
            <GenericCard />
          </div>
        </section>
      </div>
    </>
  );
};

export default Dashboard;
