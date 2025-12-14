import { useEffect, useState } from "react";
import styles from "./TaxModal.module.css";

export type TaxRecord = {
  taxYear?: string;
  status?: "InProgress" | "ReadyToFile" | "FiledOn";
  statusDate?: string;
  filedOn?: string;
  attachment?: string;
  preparedBy?: string;
  submittedBy?: string;
};

type Props = {
  initial?: TaxRecord;
  visible: boolean;
  onClose: () => void;
  onSave: (rec: TaxRecord) => void;
  user?: any;
  title?: string;
};

function isValidYear(y?: string) {
  if (!y) return false;
  const n = Number(y);
  if (!Number.isInteger(n)) return false;
  const thisYear = new Date().getFullYear();
  return n >= 1900 && n <= thisYear + 1 && String(n).length === 4;
}

export default function TaxModal({
  visible,
  initial,
  onClose,
  onSave,
  user,
  title = "Tax details",
}: Props) {
  const [rec, setRec] = useState<TaxRecord>(() => ({
    status: "InProgress", // Set default status
    ...initial,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setRec({
      status: "InProgress", // Set default status
      ...initial,
    });
    setErrors({});
  }, [initial]);

  if (!visible) return null;

  const setField = <K extends keyof TaxRecord>(k: K, v: TaxRecord[K]) => {
    setRec((r) => ({ ...r, [k]: v }));
  };

  const currentStatus = rec.status || "InProgress";

  const dateValue =
    currentStatus === "FiledOn" ? rec.filedOn || "" : rec.statusDate || "";

  const handleDateChange = (val: string) => {
    if (currentStatus === "FiledOn") setField("filedOn", val);
    else setField("statusDate", val);
  };

  const handleFile = (f?: FileList | null) => {
    if (!f || f.length === 0) return;
    // just store filename or URL; consumer can handle upload separately
    setField("attachment", f[0].name);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!isValidYear(rec.taxYear))
      e.taxYear = "Enter a valid 4-digit year (e.g. 2025)";
    if (!rec.status) e.status = "Select status";
    if (!dateValue) e.date = "Select a date for the chosen status";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave(rec);
    onClose();
  };

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
        </div>

        <div className={styles.grid}>
          <div className={styles.row}>
            <label className={styles.label}>Tax Year</label>
            <input
              className={styles.input}
              value={rec.taxYear || ""}
              onChange={(e) => setField("taxYear", e.target.value)}
              placeholder="2025"
            />
          </div>

          {errors.taxYear && (
            <div className={styles.error}>{errors.taxYear}</div>
          )}

          <div className={styles.row}>
            <label className={styles.label}>Status</label>
            <select
              title="status"
              className={styles.input}
              value={rec.status || "InProgress"}
              onChange={(e) => setField("status", e.target.value as any)}
            >
              <option value="InProgress">InProgress</option>
              <option value="ReadyToFile">ReadyToFile</option>
              <option value="FiledOn">FiledOn</option>
            </select>
          </div>

          {errors.status && <div className={styles.error}>{errors.status}</div>}

          <div className={styles.row}>
            <label className={styles.label}>Date of action</label>
            <input
              title="date"
              className={styles.input}
              type="date"
              value={dateValue}
              onChange={(e) => handleDateChange(e.target.value)}
            />
          </div>

          {errors.date && <div className={styles.error}>{errors.date}</div>}

          {rec.status === "FiledOn" && (
            <div className={styles.row}>
              <label className={styles.label}>File attachment</label>
              <div className={styles.fileRow}>
                <input
                  title="file"
                  type="file"
                  onChange={(e) => handleFile(e.target.files)}
                  className={styles.fileInput}
                />
              </div>
            </div>
          )}

          <div className={styles.row}>
            <label className={styles.label}>Prepared By</label>
            <input
              title="preparedBy"
              className={styles.input}
              value={rec.preparedBy || ""}
              onChange={(e) => setField("preparedBy", e.target.value)}
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Submitted By</label>
            <input
              title="submittedBy"
              className={styles.input}
              value={user?.username}
              readOnly
            />
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.ghost} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={styles.primary} onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
