// import Dashboard from "../features/dashboard/Dashboard";
import { useState } from "react";
import styles from "./Home.module.css";
import PersonalTable from "../features/personal/components/PersonalTable";
import Dashboard from "../features/dashboard/Dashboard";

//icons
import { IoSearchSharp } from "react-icons/io5";
import { IoMdAdd } from "react-icons/io";
import { FaSortAmountDownAlt } from "react-icons/fa";

const Home = () => {
  const [search, setSearch] = useState("");
  return (
    <>
      <div className={styles.home}>
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
          <div className={styles.buttons}>
            <div className={styles.addButton}>
              <IoMdAdd />
              Add New Business
            </div>
            <a href="./add_personal">
              <div className={styles.addButton}>
                <IoMdAdd />
                Add New Personal
              </div>
            </a>
          </div>
        </div>
        <div className={styles.dashboard}>
          <Dashboard />
        </div>
        <div className={styles.tableSection}>
          <div className={styles.tableSectionHeader}>
            <div className={styles.tableTabs}>
              <div className={styles.active}>Personal Clients</div>
              <div> Business Clients</div>
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
    </>
  );
};

export default Home;
