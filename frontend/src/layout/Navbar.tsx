import { useEffect, useState } from "react";
import styles from "./Navbar.module.css";
import { IoNotificationsOutline } from "react-icons/io5";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const [user, setUser]: any = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userLocal = localStorage.getItem("user");
    const userSession = sessionStorage.getItem("user");
    const stored =
      (userLocal ? JSON.parse(userLocal) : null) ||
      (userSession ? JSON.parse(userSession) : null);
    setUser(stored);
  }, []);

  return (
    <div className={styles.navbar}>
      <h3>Welcome Back{user?.username ? `, ${user.username}` : ""}</h3>

      <div className={styles.actions}>
        <div className={styles.notif}>
          <IoNotificationsOutline size="1.6rem" />
        </div>

        <div className={styles.profile} onClick={() => navigate("/profile")}>
          <div className={styles.img}></div>

          <div className={styles.credentials}>
            <p className={styles.user}>{user?.username || "User"}</p>
            <p className={styles.usertype}>{user?.role || "Role"}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
