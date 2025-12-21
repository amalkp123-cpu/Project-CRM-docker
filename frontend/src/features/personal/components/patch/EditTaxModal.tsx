import { useEffect } from "react";
import { useForm } from "react-hook-form";
const API_URL = import.meta.env.VITE_API_URL;
import styles from "./PersonalPatchModal.module.css";

type TaxRecord = any;

interface TaxForm {
  taxYear: string;
  taxStatus: string;
  taxDate: string;
  preparedBy: string;
}

export default function EditTaxModal({
  visible,
  onClose,
  taxRecord,
  clientId,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  taxRecord: TaxRecord | null;
  clientId: string;
  onSaved?: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaxForm>({
    mode: "onTouched",
  });

  // Prefill form when modal opens
  useEffect(() => {
    if (!visible || !taxRecord) return;

    let formattedDate = "";
    if (taxRecord?.tax_date) {
      const date = new Date(taxRecord.tax_date);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      formattedDate = `${year}-${month}-${day}`;
    }

    reset({
      taxYear: taxRecord?.tax_year ?? "",
      taxStatus: taxRecord?.tax_status ?? "",
      taxDate: formattedDate,
      preparedBy: taxRecord?.prepared_by ?? "",
    });
  }, [visible, taxRecord, reset]);

  if (!visible) return null;

  // Build payload with only changed fields
  function buildPatchPayload(data: TaxForm): Record<string, any> {
    const payload: Record<string, any> = {};
    if (!taxRecord) return payload;

    const fieldMapping: Record<keyof TaxForm, string> = {
      taxYear: "tax_year",
      taxStatus: "tax_status",
      taxDate: "tax_date",
      preparedBy: "prepared_by",
    };

    for (const [formKey, apiKey] of Object.entries(fieldMapping)) {
      const newVal = data[formKey as keyof TaxForm];
      let oldVal = taxRecord[apiKey];

      if (oldVal && typeof oldVal === "string" && oldVal.includes("T")) {
        const date = new Date(oldVal);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        oldVal = `${year}-${month}-${day}`;
      }

      const normalizedNew = newVal === "" ? null : newVal;
      const normalizedOld =
        oldVal === undefined || oldVal === null ? null : oldVal;

      if (String(normalizedNew) !== String(normalizedOld)) {
        payload[apiKey] = normalizedNew;
      }
    }

    return payload;
  }

  const onSubmit = async (data: TaxForm) => {
    if (!taxRecord) return;

    const payload = buildPatchPayload(data);

    // If nothing changed, just close
    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_URL}/api/pClient/${clientId}/tax-records/${taxRecord.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Patch failed ${res.status}`);
      }

      if (onSaved) onSaved();
      onClose();
    } catch (error: any) {
      alert(`Error: ${error.message || "Save failed"}`);
    }
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>Edit Tax Record</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className={styles.closeButton}
          >
            ×
          </button>
        </div>

        <form
          className={styles.modalForm}
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <div className={styles.modalBody}>
            <section className={styles.formSection}>
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label htmlFor="taxYear">Tax Year</label>
                  <input
                    id="taxYear"
                    type="number"
                    {...register("taxYear", {
                      required: "Tax year is required",
                      min: { value: 1900, message: "Invalid year" },
                      max: { value: 2100, message: "Invalid year" },
                    })}
                    aria-invalid={!!errors.taxYear}
                    placeholder="2024"
                  />
                  {errors.taxYear && (
                    <div role="alert" className={styles.errorText}>
                      {errors.taxYear.message}
                    </div>
                  )}
                </div>
                <div className={styles.formField}>
                  <label htmlFor="taxStatus">Tax Status</label>
                  <select
                    id="taxStatus"
                    {...register("taxStatus", {
                      required: "Tax status is required",
                    })}
                    aria-invalid={!!errors.taxStatus}
                  >
                    <option value="InProgress">InProgress</option>
                    <option value="ReadyToFile">ReadyToFile</option>
                    <option value="FiledOn">FiledOn</option>
                  </select>
                  {errors.taxStatus && (
                    <div role="alert" className={styles.errorText}>
                      {errors.taxStatus.message}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label htmlFor="taxDate">Tax Date</label>
                  <input
                    id="taxDate"
                    type="date"
                    {...register("taxDate")}
                    aria-invalid={!!errors.taxDate}
                  />
                  {errors.taxDate && (
                    <div role="alert" className={styles.errorText}>
                      {errors.taxDate.message}
                    </div>
                  )}
                </div>
                <div className={styles.formField}>
                  <label htmlFor="preparedBy">Prepared By</label>
                  <input
                    id="preparedBy"
                    {...register("preparedBy")}
                    aria-invalid={!!errors.preparedBy}
                    placeholder="Preparer name"
                  />
                  {errors.preparedBy && (
                    <div role="alert" className={styles.errorText}>
                      {errors.preparedBy.message}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={styles.cancelButton}
            >
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
