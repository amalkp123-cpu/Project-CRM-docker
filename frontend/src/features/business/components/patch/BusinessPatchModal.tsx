import { useEffect } from "react";
import { useForm } from "react-hook-form";
import styles from "./BusinessPatchModal.module.css";

const API_URL = import.meta.env.VITE_API_URL || "";

type Business = any;

interface PatchForm {
  // business
  businessName: string;
  businessNumber: string;
  businessType: string;
  email: string;
  phoneCell: string;
  phoneHome: string;
  phoneWork: string;
  fax: string;
  loyaltySince: string;
  referredBy: string;

  // primary address
  p_line1: string;
  p_line2: string;
  p_city: string;
  p_province: string;
  p_postal: string;
  p_country: string;

  // mailing address
  m_line1: string;
  m_line2: string;
  m_city: string;
  m_province: string;
  m_postal: string;
  m_country: string;

  // tax profiles (dynamic)
  [key: `tax_${string}_frequency`]: string;
  [key: `tax_${string}_start_date`]: string;
  [key: `tax_${string}_start_year`]: string;
  [key: `tax_${string}_start_quarter`]: string;
}

function sanitizeDigits(v = "") {
  return String(v).replace(/\D/g, "");
}

function formatPhone(v = "") {
  const d = sanitizeDigits(v);
  if (d.length === 10) {
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  if (d.length === 11 && d.startsWith("1")) {
    return `+1 ${d.slice(1, 4)}-${d.slice(4, 7)}-${d.slice(7)}`;
  }
  return v;
}

function formatDateForInput(date?: string | null) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function BusinessPatchModal({
  visible,
  onClose,
  business,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  business: Business | null;
  onSaved?: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting },
  } = useForm<PatchForm>({ mode: "onTouched" });

  /* ================= PREFILL ================= */

  useEffect(() => {
    if (!visible || !business) return;

    const primary = business.addresses?.find((a: any) => a.is_primary);
    const mailing = business.addresses?.find((a: any) => a.is_mailing);

    const base: Partial<PatchForm> = {
      businessName: business.business_name ?? "",
      businessNumber: business.business_number ?? "",
      businessType: business.business_type ?? "",
      email: business.email ?? "",
      phoneCell: business.phone_cell ?? "",
      phoneHome: business.phone_home ?? "",
      phoneWork: business.phone_work ?? "",
      fax: business.fax ?? "",
      loyaltySince: formatDateForInput(business.loyalty_since),
      referredBy: business.referred_by ?? "",

      p_line1: primary?.address_line1 ?? "",
      p_line2: primary?.address_line2 ?? "",
      p_city: primary?.city ?? "",
      p_province: primary?.province ?? "",
      p_postal: primary?.postal_code ?? "",
      p_country: primary?.country ?? "",

      m_line1: mailing?.address_line1 ?? "",
      m_line2: mailing?.address_line2 ?? "",
      m_city: mailing?.city ?? "",
      m_province: mailing?.province ?? "",
      m_postal: mailing?.postal_code ?? "",
      m_country: mailing?.country ?? "",
    };

    business.tax_profiles?.forEach((tp: any) => {
      base[`tax_${tp.id}_frequency`] = tp.frequency ?? "";
      base[`tax_${tp.id}_start_date`] = formatDateForInput(tp.start_date);
      base[`tax_${tp.id}_start_year`] =
        tp.start_year !== null ? String(tp.start_year) : "";
      base[`tax_${tp.id}_start_quarter`] =
        tp.start_quarter !== null ? String(tp.start_quarter) : "";
    });

    reset(base);
  }, [visible, business, reset]);

  if (!visible) return null;

  /* ================= BUILD PAYLOAD ================= */

  function buildPayload(data: PatchForm) {
    if (!business) return {};

    const payload: any = {};

    /* ---------- business (FLAT) ---------- */
    const businessMap: Record<string, string> = {
      businessName: "business_name",
      businessNumber: "business_number",
      businessType: "business_type",
      email: "email",
      phoneCell: "phone_cell",
      phoneHome: "phone_home",
      phoneWork: "phone_work",
      fax: "fax",
      loyaltySince: "loyalty_since",
      referredBy: "referred_by",
    };

    for (const key of Object.keys(businessMap)) {
      const newVal = (data as any)[key] || null;
      const oldVal = business[businessMap[key]] ?? null;

      if (String(newVal) !== String(oldVal)) {
        payload[key] = newVal;
      }
    }

    /* ---------- addresses ---------- */
    const primary = business.addresses?.find((a: any) => a.is_primary);
    const mailing = business.addresses?.find((a: any) => a.is_mailing);

    function diffAddress(prefix: "p_" | "m_", addr: any) {
      if (!addr) return null;

      const out: any = {};
      const map: Record<string, string> = {
        line1: "address_line1",
        line2: "address_line2",
        city: "city",
        province: "province",
        postal: "postal_code",
        country: "country",
      };

      for (const [k, col] of Object.entries(map)) {
        const newVal = (data as any)[`${prefix}${k}`] || null;
        const oldVal = addr[col] ?? null;
        if (String(newVal) !== String(oldVal)) {
          out[col] = newVal;
        }
      }

      return Object.keys(out).length ? out : null;
    }

    const p = diffAddress("p_", primary);
    const m = diffAddress("m_", mailing);

    if (p) payload.primaryAddress = p;
    if (m) payload.mailingAddress = m;

    /* ---------- tax profiles ---------- */
    const taxUpdates: any[] = [];

    business.tax_profiles?.forEach((tp: any) => {
      const diff: any = { id: tp.id };

      const freq = data[`tax_${tp.id}_frequency`] || null;
      const sd = data[`tax_${tp.id}_start_date`] || null;
      const sy = data[`tax_${tp.id}_start_year`] || null;
      const sq = data[`tax_${tp.id}_start_quarter`] || null;

      if (String(freq) !== String(tp.frequency)) diff.frequency = freq;
      if (String(sd) !== String(tp.start_date)) diff.start_date = sd;
      if (String(sy) !== String(tp.start_year)) diff.start_year = sy;
      if (String(sq) !== String(tp.start_quarter)) diff.start_quarter = sq;

      if (Object.keys(diff).length > 1) taxUpdates.push(diff);
    });

    if (taxUpdates.length) payload.taxProfiles = taxUpdates;

    return payload;
  }

  /* ================= SUBMIT ================= */

  const onSubmit = async (data: PatchForm) => {
    const payload = buildPayload(data);
    if (!Object.keys(payload).length) {
      onClose();
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/bClient/edit/${business.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Patch failed");
      }

      onSaved?.();
      onClose();
    } catch (e: any) {
      alert(e.message || "Save failed");
    }
  };

  const hasMailingAddress = !!business?.addresses?.some(
    (a: any) => a.is_mailing
  );

  /* ================= UI ================= */

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* HEADER */}
        <div className={styles.modalHeader}>
          <h2>Edit Business</h2>
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
          onSubmit={handleSubmit(onSubmit)}
          className={styles.modalForm}
          noValidate
        >
          <div className={styles.modalBody}>
            {/* ================= BUSINESS ================= */}
            <section className={styles.formSection}>
              <h3>Business</h3>

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label>Business Name</label>
                  <input {...register("businessName")} />
                </div>

                <div className={styles.formField}>
                  <label>Business Number</label>
                  <input {...register("businessNumber")} />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label>Business Type</label>
                  <input {...register("businessType")} />
                </div>

                <div className={styles.formField}>
                  <label>Email</label>
                  <input type="email" {...register("email")} />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label>Phone (Cell)</label>
                  <input
                    {...register("phoneCell")}
                    onBlur={(e) =>
                      setValue("phoneCell", formatPhone(e.target.value))
                    }
                  />
                </div>

                <div className={styles.formField}>
                  <label>Phone (Home)</label>
                  <input
                    {...register("phoneHome")}
                    onBlur={(e) =>
                      setValue("phoneHome", formatPhone(e.target.value))
                    }
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label>Phone (Work)</label>
                  <input
                    {...register("phoneWork")}
                    onBlur={(e) =>
                      setValue("phoneWork", formatPhone(e.target.value))
                    }
                  />
                </div>

                <div className={styles.formField}>
                  <label>Fax</label>
                  <input {...register("fax")} />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label>Loyalty Since</label>
                  <input type="date" {...register("loyaltySince")} />
                </div>

                <div className={styles.formField}>
                  <label>Referred By</label>
                  <input {...register("referredBy")} />
                </div>
              </div>
            </section>

            {/* ================= PRIMARY ADDRESS ================= */}
            <section className={styles.formSection}>
              <h3>Primary Address</h3>

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label>Line 1</label>
                  <input {...register("p_line1")} />
                </div>

                <div className={styles.formField}>
                  <label>Line 2</label>
                  <input {...register("p_line2")} />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label>City</label>
                  <input {...register("p_city")} />
                </div>

                <div className={styles.formField}>
                  <label>Province</label>
                  <input {...register("p_province")} />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label>Postal Code</label>
                  <input {...register("p_postal")} />
                </div>

                <div className={styles.formField}>
                  <label>Country</label>
                  <input {...register("p_country")} />
                </div>
              </div>
            </section>

            {/* ================= MAILING ADDRESS ================= */}
            {hasMailingAddress && (
              <section className={styles.formSection}>
                <h3>Mailing Address</h3>

                <div className={styles.formRow}>
                  <div className={styles.formField}>
                    <label>Line 1</label>
                    <input {...register("m_line1")} />
                  </div>

                  <div className={styles.formField}>
                    <label>Line 2</label>
                    <input {...register("m_line2")} />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formField}>
                    <label>City</label>
                    <input {...register("m_city")} />
                  </div>

                  <div className={styles.formField}>
                    <label>Province</label>
                    <input {...register("m_province")} />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formField}>
                    <label>Postal Code</label>
                    <input {...register("m_postal")} />
                  </div>

                  <div className={styles.formField}>
                    <label>Country</label>
                    <input {...register("m_country")} />
                  </div>
                </div>
              </section>
            )}

            {/* ================= TAX CONFIG ================= */}
            <section className={styles.formSection}>
              <h3>Tax Configuration</h3>

              {business.tax_profiles?.map((tp: any) => (
                <div key={tp.id} className={styles.relationSection}>
                  <strong>{tp.tax_type} Details</strong>

                  {/* ================= HST ================= */}
                  {tp.tax_type === "HST" && (
                    <div className={styles.formRow}>
                      <div className={styles.formField}>
                        <label>Filing Frequency</label>
                        <select {...register(`tax_${tp.id}_frequency`)}>
                          <option value="">Select frequency</option>
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="annually">Annually</option>
                        </select>
                      </div>

                      <div className={styles.formField}>
                        <label>Starting Date</label>
                        <input
                          type="date"
                          {...register(`tax_${tp.id}_start_date`)}
                        />
                      </div>
                    </div>
                  )}

                  {/* ================= CORPORATION ================= */}
                  {tp.tax_type === "CORPORATION" && (
                    <div className={styles.formRow}>
                      <div className={styles.formField}>
                        <label>Starting Year</label>
                        <input
                          type="number"
                          {...register(`tax_${tp.id}_start_year`)}
                        />
                      </div>
                    </div>
                  )}

                  {/* ================= PAYROLL ================= */}
                  {tp.tax_type === "PAYROLL" && (
                    <div className={styles.formRow}>
                      <div className={styles.formField}>
                        <label>Starting Year</label>
                        <input
                          type="number"
                          {...register(`tax_${tp.id}_start_year`)}
                        />
                      </div>
                    </div>
                  )}

                  {/* ================= WSIB ================= */}
                  {tp.tax_type === "WSIB" && (
                    <>
                      <div className={styles.formRow}>
                        <div className={styles.formField}>
                          <label>Starting Quarter</label>
                          <select {...register(`tax_${tp.id}_start_quarter`)}>
                            <option value="">Select quarter</option>
                            <option value="1">Q1</option>
                            <option value="2">Q2</option>
                            <option value="3">Q3</option>
                            <option value="4">Q4</option>
                          </select>
                        </div>

                        <div className={styles.formField}>
                          <label>Starting Year</label>
                          <input
                            type="number"
                            {...register(`tax_${tp.id}_start_year`)}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* ================= ANNUAL RENEWAL ================= */}
                  {tp.tax_type === "ANNUAL_RENEWAL" && (
                    <div className={styles.formRow}>
                      <div className={styles.formField}>
                        <label>Starting Date</label>
                        <input
                          type="date"
                          {...register(`tax_${tp.id}_start_date`)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </section>
          </div>

          {/* FOOTER */}
          <div className={styles.modalFooter}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={styles.cancelButton}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={styles.submitButton}
            >
              {isSubmitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
