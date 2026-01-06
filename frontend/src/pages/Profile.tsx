import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Profile.module.css";

const API_URL = import.meta.env.VITE_API_URL;

interface Profile {
  userid: string;
  username: string;
  full_name: string;
  role: string;
  created_at: string;
}

export default function Profile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  async function fetchProfile() {
    try {
      const res = await fetch(`${API_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setProfile(data);
    } catch {
      alert("Failed to load profile");
    }
  }

  async function saveProfile() {
    if (!profile) return;

    setLoading(true);
    try {
      await fetch(`${API_URL}/api/user/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: profile.username,
          full_name: profile.full_name,
        }),
      });
      setEditing(false);
    } catch {
      alert("Failed to update profile");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  }

  useEffect(() => {
    fetchProfile();
  }, []);

  if (!profile) return null;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h2>{profile.full_name}</h2>
          <span className={styles.role}>{profile.role}</span>
        </div>

        <button className={styles.logoutBtn} onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.fieldGrid}>
          <div className={styles.field}>
            <label>Full Name</label>
            <input
              value={profile.full_name}
              disabled={!editing}
              onChange={(e) =>
                setProfile({ ...profile, full_name: e.target.value })
              }
            />
          </div>

          <div className={styles.field}>
            <label>Username</label>
            <input
              value={profile.username}
              disabled={!editing}
              onChange={(e) =>
                setProfile({ ...profile, username: e.target.value })
              }
            />
          </div>

          <div className={styles.field}>
            <label>Role</label>
            <input value={profile.role} disabled />
          </div>

          <div className={styles.field}>
            <label>Member since</label>
            <input
              value={new Date(profile.created_at).toLocaleDateString()}
              disabled
            />
          </div>
        </div>

        <div className={styles.actions}>
          {!editing ? (
            <button onClick={() => setEditing(true)}>Edit Profile</button>
          ) : (
            <>
              <button onClick={saveProfile} disabled={loading}>
                Save
              </button>
              <button
                className={styles.secondary}
                onClick={() => {
                  setEditing(false);
                  fetchProfile();
                }}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
