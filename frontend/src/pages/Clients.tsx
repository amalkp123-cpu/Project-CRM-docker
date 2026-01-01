// Clients.tsx
import { useState } from "react";
import styles from "./Home.module.css";
import { PersonalTable } from "../features/personal";
import { BusinessTable } from "../features/business";

// icons
import { IoSearchSharp } from "react-icons/io5";

const Clients = () => {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"personal" | "business">(
    "personal"
  );

  return (
    <div className={styles.home}>
      <div className={styles.tableSection}>
        <div className={styles.tableSectionHeader}>
          <div className={styles.tableTabs}>
            <div
              onClick={() => {
                setActiveTab("personal");
              }}
              className={activeTab == "personal" ? styles.active : ""}
            >
              Personal Clients
            </div>
            <div
              onClick={() => {
                setActiveTab("business");
              }}
              className={activeTab == "business" ? styles.active : ""}
            >
              Business Clients
            </div>
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
        </div>
        <div className={styles.tableContainer}>
          {activeTab == "personal" && <PersonalTable search={search} />}
          {activeTab == "business" && <BusinessTable search={search} />}
        </div>
      </div>
    </div>
  );
};

export default Clients;
