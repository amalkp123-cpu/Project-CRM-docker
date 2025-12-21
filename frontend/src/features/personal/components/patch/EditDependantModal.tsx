import { useEffect } from "react";
import { useForm } from "react-hook-form";
const API_URL = import.meta.env.VITE_API_URL;
import styles from "./PersonalPatchModal.module.css";

type Dependant = any;

interface DependantForm {
  firstName: string;
  lastName: string;
  dob: string;
  relationship: string;
  disability: boolean;
  disabilityNotes: string;
}

export default function EditDependantModal({
  visible,
  onClose,
  dependant,
  clientId,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  dependant: Dependant | null;
  clientId: string;
  onSaved?: () => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DependantForm>({
    mode: "onTouched",
  });

  const hasDisability = watch("disability");

  // Prefill form when modal opens
  useEffect(() => {
    if (!visible || !dependant) return;
    let formattedDob = "";
    if (dependant?.dob) {
      const date = new Date(dependant.dob);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      formattedDob = `${year}-${month}-${day}`;
    }

    reset({
      firstName: dependant?.first_name ?? "",
      lastName: dependant?.last_name ?? "",
      dob: formattedDob,
      relationship: dependant?.relationship ?? "",
      disability: dependant?.disability ?? false,
      disabilityNotes: dependant?.disability_notes ?? "",
    });
  }, [visible, dependant, reset]);

  if (!visible) return null;

  // Build payload with only changed fields
  function buildPatchPayload(data: DependantForm): Record<string, any> {
    const payload: Record<string, any> = {};
    if (!dependant) return payload;

    const fieldMapping: Record<keyof DependantForm, string> = {
      firstName: "first_name",
      lastName: "last_name",
      dob: "dob",
      relationship: "relationship",
      disability: "disability",
      disabilityNotes: "disability_notes",
    };

    for (const [formKey, apiKey] of Object.entries(fieldMapping)) {
      const newVal = data[formKey as keyof DependantForm];
      let oldVal = dependant[apiKey];

      if (oldVal && typeof oldVal === "string" && oldVal.includes("T")) {
        const date = new Date(oldVal);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        oldVal = `${year}-${month}-${day}`;
      }

      // Handle boolean for disability
      if (apiKey === "disability") {
        if (Boolean(newVal) !== Boolean(oldVal)) {
          payload[apiKey] = Boolean(newVal);
        }
        continue;
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

  const onSubmit = async (data: DependantForm) => {
    if (!dependant) return;

    const payload = buildPatchPayload(data);

    // If nothing changed, just close
    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_URL}/api/pClient/${clientId}/dependents/${dependant.id}`,
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
          <h2>Edit Dependant</h2>
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
                  <label htmlFor="firstName">First Name</label>
                  <input
                    id="firstName"
                    {...register("firstName", {
                      required: "First name is required",
                      minLength: { value: 2, message: "Too short" },
                    })}
                    aria-invalid={!!errors.firstName}
                    placeholder="Given name"
                  />
                  {errors.firstName && (
                    <div role="alert" className={styles.errorText}>
                      {errors.firstName.message}
                    </div>
                  )}
                </div>
                <div className={styles.formField}>
                  <label htmlFor="lastName">Last Name</label>
                  <input
                    id="lastName"
                    {...register("lastName", {
                      required: "Last name is required",
                      minLength: { value: 2, message: "Too short" },
                    })}
                    aria-invalid={!!errors.lastName}
                    placeholder="Family name"
                  />
                  {errors.lastName && (
                    <div role="alert" className={styles.errorText}>
                      {errors.lastName.message}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label htmlFor="dob">Date of Birth</label>
                  <input
                    id="dob"
                    type="date"
                    {...register("dob", {
                      required: "Date of birth is required",
                      validate: (v) => (v ? true : "Invalid date"),
                    })}
                    aria-invalid={!!errors.dob}
                  />
                  {errors.dob && (
                    <div role="alert" className={styles.errorText}>
                      {errors.dob.message}
                    </div>
                  )}
                </div>
                <div className={styles.formField}>
                  <label htmlFor="relationship">Relationship</label>
                  <select
                    id="relationship"
                    {...register("relationship", {
                      required: "Relationship is required",
                    })}
                    aria-invalid={!!errors.relationship}
                  >
                    {" "}
                    <option value="child">Child</option>
                    <option value="spouse">Spouse</option>
                    <option value="parent">Parent</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.relationship && (
                    <div role="alert" className={styles.errorText}>
                      {errors.relationship.message}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label htmlFor="disability">
                    <input
                      id="disability"
                      type="checkbox"
                      {...register("disability")}
                      style={{ width: "auto", marginRight: "8px" }}
                    />
                    Has Disability
                  </label>
                </div>
              </div>

              {hasDisability && (
                <div className={styles.formRow}>
                  <div className={styles.formField}>
                    <label htmlFor="disabilityNotes">Disability Notes</label>
                    <textarea
                      id="disabilityNotes"
                      {...register("disabilityNotes")}
                      aria-invalid={!!errors.disabilityNotes}
                      placeholder="Additional information about the disability"
                      rows={3}
                      style={{ width: "100%", resize: "vertical" }}
                    />
                    {errors.disabilityNotes && (
                      <div role="alert" className={styles.errorText}>
                        {errors.disabilityNotes.message}
                      </div>
                    )}
                  </div>
                </div>
              )}
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
