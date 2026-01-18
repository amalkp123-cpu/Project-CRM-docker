import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import styles from "./BusinessPatchModal.module.css";

const API_URL = import.meta.env.VITE_API_URL || "";

type TaxType = "HST" | "CORPORATION" | "PAYROLL" | "WSIB";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getEffectiveFrequency(profile: any, taxType: TaxType) {
  if (!profile) return null;
  if (taxType === "WSIB") return "quarterly";
  return String(profile.frequency).toLowerCase();
}

interface TaxForm {
  taxYear: number | "";
  taxPeriod: string;
  amount: string;
  taxDate: string;
  status: string;
  confirmationNumber: string;
}

export default function EditTaxModal({
  visible,
  onClose,
  taxRecord,
  businessId,
  taxProfiles,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  taxRecord: any | null;
  businessId: string;
  taxProfiles: any[];
  onSaved?: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<TaxForm>({
    mode: "onTouched",
  });

  const [activeProfile, setActiveProfile] = useState<any>(null);

  /* ---------- RESOLVE TAX PROFILE ---------- */
  useEffect(() => {
    if (!visible || !taxRecord) return;

    const profile =
      taxProfiles.find((p) => p.tax_type === taxRecord.tax_type) || null;

    const effectiveProfile = profile
      ? {
          ...profile,
          frequency: getEffectiveFrequency(profile, taxRecord.tax_type),
        }
      : null;

    setActiveProfile(effectiveProfile);
  }, [visible, taxRecord, taxProfiles]);

  /* ---------- PREFILL ---------- */
  useEffect(() => {
    if (!visible || !taxRecord || !activeProfile) return;

    let formattedDate = "";
    if (taxRecord.tax_date) {
      formattedDate = new Date(taxRecord.tax_date).toISOString().slice(0, 10);
    }

    reset({
      taxYear: taxRecord.tax_year ?? "",
      taxPeriod:
        activeProfile.frequency === "yearly" ? "" : taxRecord.tax_period ?? "",
      amount: taxRecord.amount ?? "",
      taxDate: formattedDate,
      status: taxRecord.status ?? "",
      confirmationNumber: taxRecord.confirmation_number ?? "",
    });
  }, [visible, taxRecord, activeProfile, reset]);

  if (!visible || !taxRecord) return null;

  /* ---------- BUILD PATCH PAYLOAD ---------- */
  function buildPatchPayload(data: TaxForm) {
    const payload: Record<string, any> = {};

    if (data.taxYear !== taxRecord.tax_year) {
      payload.tax_year = data.taxYear;
    }

    if (data.amount !== String(taxRecord.amount ?? "")) {
      payload.amount = data.amount === "" ? null : Number(data.amount);
    }

    if (data.status !== taxRecord.status) {
      payload.status = data.status;
    }

    if (
      (data.taxDate || null) !==
      (taxRecord.tax_date
        ? new Date(taxRecord.tax_date).toISOString().slice(0, 10)
        : null)
    ) {
      payload.tax_date = data.taxDate || null;
    }

    if (data.confirmationNumber !== (taxRecord.confirmation_number ?? "")) {
      payload.confirmation_number = data.confirmationNumber || null;
    }

    /* ----- PERIOD LOGIC (copied from insert) ----- */
    if (activeProfile.frequency === "yearly") {
      if (taxRecord.tax_period !== null) {
        payload.tax_period = null;
      }
    } else {
      const newPeriod = data.taxPeriod || null;
      const oldPeriod = taxRecord.tax_period ?? null;
      if (newPeriod !== oldPeriod) {
        payload.tax_period = newPeriod;
      }
    }

    return payload;
  }

  /* ---------- SUBMIT ---------- */
  const onSubmit = async (data: TaxForm) => {
    const payload = buildPatchPayload(data);

    if (!Object.keys(payload).length) {
      onClose();
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_URL}/api/bclient/${businessId}/tax-records/${taxRecord.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) throw new Error("patch_failed");

      onSaved?.();
      onClose();
    } catch (e: any) {
      alert(e.message || "save_failed");
    }
  };

  /* ---------- RENDER ---------- */
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>Edit Tax Record</h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>

        <form className={styles.modalForm} onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.modalBody}>
            <div className={styles.formSection}>
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label>Tax Year</label>
                  <input
                    type="number"
                    {...register("taxYear", { required: true })}
                  />
                </div>

                <div className={styles.formField}>
                  <label>Amount</label>
                  <input type="number" step="0.01" {...register("amount")} />
                </div>
              </div>

              {activeProfile?.frequency === "quarterly" && (
                <div className={styles.formField}>
                  <label>Quarter</label>
                  <select {...register("taxPeriod")}>
                    <option value="Q1">Q1</option>
                    <option value="Q2">Q2</option>
                    <option value="Q3">Q3</option>
                    <option value="Q4">Q4</option>
                  </select>
                </div>
              )}

              {activeProfile?.frequency === "monthly" && (
                <div className={styles.formField}>
                  <label>Month</label>
                  <select {...register("taxPeriod")}>
                    {MONTHS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label>Status</label>
                  <select {...register("status")}>
                    <option value="Draft">Draft</option>
                    <option value="Filed">Filed</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>

                <div className={styles.formField}>
                  <label>Tax Date</label>
                  <input type="date" {...register("taxDate")} />
                </div>
              </div>

              <div className={styles.formField}>
                <label>Confirmation Number</label>
                <input {...register("confirmationNumber")} />
              </div>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
