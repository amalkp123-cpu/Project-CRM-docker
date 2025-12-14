import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import styles from "./MainLayout.module.css";

type MainLayoutProps = {
  withSidebar?: boolean;
  withNavbar?: boolean;
};

export default function MainLayout({
  withSidebar = true,
  withNavbar = true,
}: MainLayoutProps) {
  return (
    <div className={styles.mainContainer}>
      {withSidebar && (
        <aside aria-label="Primary navigation">
          <Sidebar />
        </aside>
      )}
      <div className={styles.content}>
        {withNavbar && <Navbar />}
        <main className={styles.mainbox} role="main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
