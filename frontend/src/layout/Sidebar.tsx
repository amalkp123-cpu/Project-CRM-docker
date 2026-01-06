import { useNavigate } from "react-router";
import styles from "./Sidebar.module.css";
import logo from "../assets/logo.svg";

// Importing icons
import { GoHome } from "react-icons/go";
import { GoPeople } from "react-icons/go";
import { PiChatTeardropTextLight } from "react-icons/pi";
import { CiCalendarDate } from "react-icons/ci";
import { PiNotepad } from "react-icons/pi";
import { IoSettingsOutline } from "react-icons/io5";
import { CgProfile } from "react-icons/cg";
import { RxExit } from "react-icons/rx";

const Sidebar = () => {
  const navigate = useNavigate();

  const getNavClass = (route: string) => {
    const currentPath = window.location.pathname;
    const normalize = (p: string) => p.replace(/\/+$/, "") || "/";
    const current = normalize(currentPath);
    const target = `/${normalize(route)}`;
    const isActive =
      target === " /"
        ? current === " /"
        : current === target || current.startsWith(target + "/");
    return isActive ? styles.active : "";
  };

  function handleLogout() {
    const ok = window.confirm("Log out of your account?");
    if (!ok) return;

    localStorage.removeItem("user");
    localStorage.removeItem("token");

    sessionStorage.removeItem("user");
    sessionStorage.removeItem("token");

    navigate("/signin");
  }

  return (
    <>
      <aside className={styles.sidebar}>
        <div className={styles.topSection}>
          <div className={styles.logo}>
            <img src={logo} alt="Company logo" />
          </div>
          <nav className={styles.nav}>
            <ul>
              <li className={getNavClass("/")} onClick={() => navigate("/")}>
                <GoHome size={"1.6rem"} />
                Home
              </li>
              <li
                className={getNavClass("clients")}
                onClick={() => navigate("/clients")}
              >
                <GoPeople size={"1.6rem"} />
                My Clients
              </li>
              <li
                className={getNavClass("inbox")}
                onClick={() => navigate("/inbox")}
              >
                <PiChatTeardropTextLight size={"1.6rem"} />
                Inbox
              </li>
              <li
                className={getNavClass("calender")}
                onClick={() => navigate("/calender")}
              >
                <CiCalendarDate size={"1.6rem"} />
                Calendar
              </li>
              <li
                className={getNavClass("report")}
                onClick={() => navigate("/report")}
              >
                <PiNotepad size={"1.6rem"} />
                Report
              </li>
              <li
                className={getNavClass("settings")}
                onClick={() => navigate("/settings")}
              >
                <IoSettingsOutline size={"1.6rem"} />
                Settings
              </li>
            </ul>
          </nav>
        </div>
        <footer className={styles.footer}>
          <div onClick={() => navigate("/users")}>
            <CgProfile size={"1.6rem"} /> User Management
          </div>

          <button onClick={handleLogout}>
            <RxExit size={"1.6rem"} />
            Logout
          </button>
        </footer>
      </aside>
    </>
  );
};

export default Sidebar;
