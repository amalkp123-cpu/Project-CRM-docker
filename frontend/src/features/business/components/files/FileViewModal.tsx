import { useEffect, useState } from "react";
import styles from "./FileViewModal.module.css";

const API_URL = import.meta.env.VITE_API_URL || "";

interface HstDoc {
  id: string;
  filename: string;
  uploaded_at: string;
  uploaded_by: string;
}

interface Props {
  taxRecord: {
    id: string;
    documents: HstDoc[];
  };
  businessId: string;
  user: any;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}

export default function FileViewModal({
  taxRecord,
  businessId,
  user,
  onClose,
  onRefresh,
}: Props) {
  const [files, setFiles] = useState<HstDoc[]>(taxRecord.documents ?? []);
  const [uploading, setUploading] = useState(false);

  // keep modal in sync if parent refreshes
  useEffect(() => {
    setFiles(taxRecord.documents ?? []);
  }, [taxRecord]);

  /* ================= UPLOAD ================= */

  async function uploadFile(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("businessId", businessId);
    fd.append("uploaded_by", user.id);

    setUploading(true);

    const res = await fetch(`${API_URL}/api/hst-docs/${taxRecord.id}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: fd,
    });

    if (!res.ok) {
      alert("Upload failed");
      return;
    }

    await onRefresh();
    setUploading(false);
  }

  /* ================= DOWNLOAD ================= */

  async function downloadFile(id: string, filename: string) {
    const res = await fetch(`${API_URL}/api/hst-docs/file/${id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!res.ok) return;

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);
  }

  /* ================= RENDER ================= */

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <header className={styles.header}>
          <h3>Tax Documents</h3>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </header>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>File</th>
              <th>Uploaded</th>
              <th>By</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {files.length === 0 && (
              <tr>
                <td colSpan={4} className={styles.empty}>
                  No files uploaded
                </td>
              </tr>
            )}

            {files.map((f) => (
              <tr key={f.id}>
                <td className={styles.filename}>{f.filename}</td>
                <td>{new Date(f.uploaded_at).toLocaleDateString()}</td>
                <td>{f.uploaded_by}</td>
                <td>
                  <button
                    type="button"
                    className={styles.download}
                    onClick={() => downloadFile(f.id, f.filename)}
                  >
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <footer className={styles.footer}>
          <label className={styles.uploadBtn}>
            {uploading ? "Uploading…" : "Upload PDF"}
            <input
              type="file"
              accept="application/pdf"
              hidden
              onChange={(e) => e.target.files && uploadFile(e.target.files[0])}
            />
          </label>
        </footer>
      </div>
    </div>
  );
}
