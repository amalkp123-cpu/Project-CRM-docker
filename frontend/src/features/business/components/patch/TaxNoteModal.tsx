import { useEffect, useState } from "react";
import { MdDelete, MdEdit, MdClose } from "react-icons/md";
import styles from "./TaxNoteModal.module.css";

const API_URL = import.meta.env.VITE_API_URL;

function formatDateTime(ts?: string) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  taxRecordId: string;
  businessId: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function TaxNoteModal({ taxRecordId, onClose, onSaved }: Props) {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [newNote, setNewNote] = useState("");
  const [editingNote, setEditingNote] = useState<any>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const token = localStorage.getItem("token");

  /* ================= FETCH ================= */

  async function fetchNotes() {
    try {
      setLoading(true);
      const res = await fetch(
        `${API_URL}/api/bClient/tax-records/${taxRecordId}/notes`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error("Failed to load notes");

      setNotes(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotes();
  }, [taxRecordId]);

  /* ================= CREATE ================= */

  async function handleCreateNote() {
    if (!newNote.trim()) return;

    const res = await fetch(
      `${API_URL}/api/bClient/tax-records/${taxRecordId}/notes`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ note: newNote }),
      }
    );

    if (res.ok) {
      setNewNote("");
      fetchNotes();
      onSaved();
    }
  }

  /* ================= PATCH ================= */

  async function handleEditSave() {
    if (!editingNote) return;

    const res = await fetch(
      `${API_URL}/api/bClient/tax-records/${taxRecordId}/notes/${editingNote.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ note: noteDraft }),
      }
    );

    if (res.ok) {
      setEditingNote(null);
      setNoteDraft("");
      fetchNotes();
      onSaved();
    }
  }

  /* ================= DELETE ================= */

  async function handleDelete(noteId: string) {
    if (!confirm("Delete this note?")) return;

    const res = await fetch(
      `${API_URL}/api/bClient/tax-records/${taxRecordId}/notes/${noteId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (res.ok) {
      fetchNotes();
      onSaved();
    }
  }

  /* ================= UI ================= */

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>Tax Notes</h3>
          <button onClick={onClose}>
            <MdClose />
          </button>
        </div>

        {/* ADD NOTE */}
        <div className={styles.addNote}>
          <textarea
            placeholder="Add a note…"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={2}
          />
          <button className={styles.editBtn} onClick={handleCreateNote}>
            Add Note
          </button>
        </div>

        {/* TABLE */}
        {loading ? (
          <div className={styles.loading}>Loading…</div>
        ) : notes.length > 0 ? (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Note</th>
                  <th>Created By</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {notes.map((note) => (
                  <tr key={note.id}>
                    <td>
                      {editingNote?.id === note.id ? (
                        <textarea
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          rows={2}
                          className={styles.noteEditInput}
                          autoFocus
                        />
                      ) : (
                        note.note_text
                      )}
                    </td>

                    <td>{note.created_by}</td>
                    <td>{formatDateTime(note.created_at)}</td>

                    <td>
                      <div className={styles.buttonContainer}>
                        {editingNote?.id === note.id ? (
                          <>
                            <button
                              className={styles.editBtn}
                              onClick={handleEditSave}
                            >
                              Save
                            </button>
                            <button
                              className={styles.deleteBtn}
                              onClick={() => {
                                setEditingNote(null);
                                setNoteDraft("");
                              }}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className={styles.editBtn}
                              onClick={() => {
                                setEditingNote(note);
                                setNoteDraft(note.note_text);
                              }}
                            >
                              <MdEdit size="1rem" />
                            </button>
                            <button
                              className={styles.deleteBtn}
                              onClick={() => handleDelete(note.id)}
                            >
                              <MdDelete size="1rem" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyState}>No notes yet.</div>
        )}
      </div>
    </div>
  );
}
