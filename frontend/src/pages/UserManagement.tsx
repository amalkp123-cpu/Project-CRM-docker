import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import styles from "./UserManagement.module.css";

const API_URL = import.meta.env.VITE_API_URL;

interface User {
  userid: string;
  username: string;
  full_name: string;
  role: string;
  created_at: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const token = localStorage.getItem("token");

  const navigate = useNavigate();

  const decoded = token ? JSON.parse(atob(token.split(".")[1])) : null;

  const currentUserId = decoded?.id;
  const currentUserRole = decoded?.role;

  /* ================= FETCH USERS ================= */

  async function fetchUsers() {
    try {
      const res = await fetch(`${API_URL}/api/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUsers(data);
    } catch (e) {
      alert("Failed to load users");
    }
  }

  useEffect(() => {
    if (!decoded || currentUserRole !== "admin") {
      alert("Unauthorized access");
      navigate("/");
      return;
    }

    fetchUsers();
  }, []);

  /* ================= DELETE ================= */

  async function handleDelete(id: string) {
    if (!confirm("Delete this user?")) return;

    await fetch(`${API_URL}/api/user/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    fetchUsers();
  }

  /* ================= UPDATE ================= */

  async function handleUpdate() {
    if (!editingUser) return;

    await fetch(`${API_URL}/api/user/${editingUser.userid}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        username: editingUser.username,
        full_name: editingUser.full_name,
        role: editingUser.role,
      }),
    });

    setEditingUser(null);
    fetchUsers();
  }

  /* ================= CREATE ================= */

  async function handleCreate(e: any) {
    e.preventDefault();

    const form = e.target;
    const payload = {
      username: form.username.value,
      password: form.password.value,
      full_name: form.full_name.value,
      role: form.role.value,
    };

    await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    setShowCreate(false);
    fetchUsers();
  }

  /* ================= RENDER ================= */

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Users</h2>
        <button onClick={() => setShowCreate(true)}>Create New User</button>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>User Name</th>
            <th>Role</th>
            <th>Created</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.userid}>
              <td>{u.full_name}</td>
              <td>{u.role}</td>
              <td>{new Date(u.created_at).toLocaleDateString()}</td>
              <td className={styles.actions}>
                <button
                  onClick={() => setEditingUser(u)}
                  disabled={u.userid === currentUserId}
                  title={
                    u.userid === currentUserId
                      ? "You cannot edit your own account here"
                      : "Edit user"
                  }
                >
                  Edit
                </button>

                <button
                  onClick={() => handleDelete(u.userid)}
                  disabled={u.userid === currentUserId}
                  title={
                    u.userid === currentUserId
                      ? "You cannot delete your own account"
                      : "Delete user"
                  }
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ============ EDIT MODAL ============ */}
      {editingUser && (
        <div className={styles.modal}>
          <h3>Edit User</h3>

          <input
            value={editingUser.full_name}
            onChange={(e) =>
              setEditingUser({
                ...editingUser,
                full_name: e.target.value,
              })
            }
            placeholder="Full name"
          />

          <input
            value={editingUser.username}
            onChange={(e) =>
              setEditingUser({
                ...editingUser,
                username: e.target.value,
              })
            }
            placeholder="Username"
          />

          <select
            value={editingUser.role}
            onChange={(e) =>
              setEditingUser({
                ...editingUser,
                role: e.target.value,
              })
            }
          >
            <option>admin</option>
            <option>Senior Accountant</option>
            <option>Junior Accountant</option>
            <option>Receptionist</option>
          </select>

          <div className={styles.modalActions}>
            <button onClick={handleUpdate}>Save</button>
            <button onClick={() => setEditingUser(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ============ CREATE MODAL ============ */}
      {showCreate && (
        <form className={styles.modal} onSubmit={handleCreate}>
          <h3>Create User</h3>

          <input name="full_name" placeholder="Full name" required />
          <input name="username" placeholder="Username" required />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
          />

          <select name="role">
            <option>Junior Accountant</option>
            <option>Senior Accountant</option>
            <option>Receptionist</option>
            <option>admin</option>
          </select>

          <div className={styles.modalActions}>
            <button type="submit">Create</button>
            <button type="button" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
