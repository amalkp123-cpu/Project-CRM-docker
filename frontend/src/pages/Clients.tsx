// Clients.tsx
import { useState } from "react";
import styles from "./Home.module.css";
import PersonalTable from "../features/personal/components/PersonalTable";

// icons
import { IoSearchSharp } from "react-icons/io5";
import { FaSortAmountDownAlt } from "react-icons/fa";

const Clients = () => {
  const [search, setSearch] = useState("");

  return (
    <div className={styles.home}>
      <div className={styles.tableSection}>
        <div className={styles.tableSectionHeader}>
          <div className={styles.tableTabs}>
            <div className={styles.active}>Personal Clients</div>
            <div>Business Clients</div>
          </div>
        </div>

        <div className={styles.homebar}>
          <div className={styles.search}>
            <input
              type="text"
              title="search"
              placeholder="Search by Name, Business #, or SIN…"
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <IoSearchSharp className={styles.searchIcon} />
          </div>

          <div className={styles.tableSort}>
            <FaSortAmountDownAlt />
            Sort
          </div>
        </div>

        <div className={styles.tableContainer}>
          <PersonalTable search={search} />
        </div>
      </div>
    </div>
  );
};

export default Clients;
