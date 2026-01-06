import { useEffect } from "react";
import { useForm } from "react-hook-form";
const API_URL = import.meta.env.VITE_API_URL;
import styles from "./PersonalPatchModal.module.css";

type Client = any;

interface PatchForm {
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  sin: string;
  phone: string;
  email: string;
  dateOfMarriage: string;
  fax: string;
  loyalty: string;
  referredBy: string;
  // Address fields
  addressLine1: string;
  addressLine2: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

function sanitizeDigits(s = "") {
  return String(s).replace(/\D/g, "");
}

// Add this function at the top, before the component
function formatDateForInput(dateString: string | null | undefined): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatPhoneForDisplay(value = "") {
  const digits = sanitizeDigits(value);
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 ${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return value;
}

function validateCanadianSIN(sin = "") {
  const digits = sanitizeDigits(sin);
  if (digits.length !== 9) return "SIN must be 9 digits";
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let n = Number(digits[i]);
    if ((i + 1) % 2 === 0) {
      n = n * 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  if (sum % 10 !== 0) return "Invalid SIN";
  return true;
}

export default function PersonalPatchModal({
  visible,
  onClose,
  client,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  client: Client | null;
  onSaved?: (updatedPayload: Record<string, any>) => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PatchForm>({
    mode: "onTouched",
  });

  // Prefill form when modal opens
  useEffect(() => {
    if (!visible || !client) return;

    const firstAddress = client?.addresses?.[0];

    reset({
      firstName: client?.first_name ?? "",
      lastName: client?.last_name ?? "",
      dob: formatDateForInput(client?.dob),
      gender: client?.gender ? client.gender : "",
      sin: client?.sin_original ?? "",
      phone: client?.phone ?? "",
      email: client?.email ?? "",
      dateOfMarriage: formatDateForInput(client?.date_of_marriage),
      fax: client?.fax ?? "",
      loyalty: formatDateForInput(client?.loyalty_since),
      referredBy: client?.referred_by ?? "",
      // Address fields
      addressLine1: firstAddress?.address_line1 ?? "",
      addressLine2: firstAddress?.address_line2 ?? "",
      city: firstAddress?.city ?? "",
      province: firstAddress?.province ?? "",
      postalCode: firstAddress?.postal_code ?? "",
      country: firstAddress?.country ?? "",
    });
  }, [visible, client, reset]);

  if (!visible) return null;

  // Build payload with only changed fields, converting to snake_case for API
  function buildPatchPayload(data: PatchForm): Record<string, any> {
    const payload: Record<string, any> = {};
    if (!client) return payload;

    const fieldMapping: Record<keyof PatchForm, string> = {
      firstName: "first_name",
      lastName: "last_name",
      dob: "dob",
      gender: "gender",
      sin: "sin",
      phone: "phone",
      email: "email",
      dateOfMarriage: "date_of_marriage",
      fax: "fax",
      loyalty: "loyalty_since",
      referredBy: "referred_by",
      addressLine1: "address_line1",
      addressLine2: "address_line2",
      city: "city",
      province: "province",
      postalCode: "postal_code",
      country: "country",
    };

    const firstAddress = client.addresses?.[0];

    for (const [formKey, apiKey] of Object.entries(fieldMapping)) {
      const newVal = data[formKey as keyof PatchForm];
      let oldVal: any;

      // For address fields, get value from first address
      if (
        [
          "address_line1",
          "address_line2",
          "city",
          "province",
          "postal_code",
          "country",
        ].includes(apiKey)
      ) {
        oldVal = firstAddress?.[apiKey];
      } else {
        oldVal = client[apiKey];
      }

      if (oldVal && typeof oldVal === "string" && oldVal.includes("T")) {
        oldVal = formatDateForInput(oldVal);
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

  const onSubmit = async (data: PatchForm) => {
    if (!client) return;

    const payload = buildPatchPayload(data);

    // If nothing changed, just close
    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/pClient/edit/${client.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Patch failed ${res.status}`);
      }

      if (onSaved) onSaved(payload);
      onClose();
    } catch (error: any) {
      alert(`Error: ${error.message || "Save failed"}`);
    }
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>Edit Client</h2>
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
              <h2>Basic Details</h2>

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label htmlFor="fname">First Name</label>
                  <input
                    id="fname"
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
                  <label htmlFor="lname">Last Name</label>
                  <input
                    id="lname"
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
                  <label htmlFor="dob">DOB</label>
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
                  <label htmlFor="sin">SIN Number</label>
                  <input
                    id="sin"
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="123456789"
                    {...register("sin", {
                      required: "SIN is required",
                      validate: validateCanadianSIN,
                    })}
                    aria-invalid={!!errors.sin}
                  />
                  {errors.sin && (
                    <div role="alert" className={styles.errorText}>
                      {errors.sin.message}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label htmlFor="phone">Phone</label>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    placeholder="(416) 555-1234"
                    {...register("phone", {
                      required: "Phone number is required",
                      validate: (val) => {
                        const d = sanitizeDigits(val);
                        if (d.length === 10) return true;
                        if (d.length === 11 && d.startsWith("1")) return true;
                        return "Enter a valid 10-digit Canadian phone (optionally +1)";
                      },
                    })}
                    aria-invalid={!!errors.phone}
                    onBlur={(e) => {
                      const formatted = formatPhoneForDisplay(e.target.value);
                      setValue("phone", formatted, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                    }}
                  />
                  {errors.phone && (
                    <div role="alert" className={styles.errorText}>
                      {errors.phone.message}
                    </div>
                  )}
                </div>
                <div className={styles.formField}>
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    {...register("email", {
                      required: "Email is required",
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: "Invalid email",
                      },
                    })}
                    aria-invalid={!!errors.email}
                  />
                  {errors.email && (
                    <div role="alert" className={styles.errorText}>
                      {errors.email.message}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label htmlFor="gender">Gender</label>
                  <select
                    id="gender"
                    {...register("gender")}
                    aria-invalid={!!errors.gender}
                  >
                    <option value="">Select an option</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.gender && (
                    <div role="alert" className={styles.errorText}>
                      {errors.gender.message}
                    </div>
                  )}
                </div>

                <div className={styles.formField}>
                  <label htmlFor="loyalty">Loyalty Since</label>
                  <input
                    id="loyalty"
                    type="date"
                    {...register("loyalty")}
                    aria-invalid={!!errors.loyalty}
                  />
                  {errors.loyalty && (
                    <div role="alert" className={styles.errorText}>
                      {errors.loyalty.message}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label htmlFor="refer">Referred By</label>
                  <input
                    id="refer"
                    {...register("referredBy")}
                    aria-invalid={!!errors.referredBy}
                    placeholder="user"
                  />
                  {errors.referredBy && (
                    <div role="alert" className={styles.errorText}>
                      {errors.referredBy.message}
                    </div>
                  )}
                </div>
                <div className={styles.formField}>
                  <label htmlFor="fax">Fax</label>
                  <input
                    id="fax"
                    {...register("fax", {
                      validate: (val) => {
                        if (!val) return true;
                        const d = sanitizeDigits(val);
                        if (d.length === 10) return true;
                        return "Invalid fax number";
                      },
                    })}
                    aria-invalid={!!errors.fax}
                    placeholder="(416) 555-5678"
                    inputMode="tel"
                  />
                  {errors.fax && (
                    <div role="alert" className={styles.errorText}>
                      {errors.fax.message}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className={styles.formSection}>
              <h2>Address</h2>

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label htmlFor="addressLine1">Address Line 1</label>
                  <input
                    id="addressLine1"
                    {...register("addressLine1")}
                    placeholder="123 Main St"
                  />
                </div>

                <div className={styles.formField}>
                  <label htmlFor="addressLine2">Address Line 2</label>
                  <input
                    id="addressLine2"
                    {...register("addressLine2")}
                    placeholder="Apt 4B (optional)"
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label htmlFor="city">City</label>
                  <input
                    id="city"
                    {...register("city")}
                    placeholder="Toronto"
                  />
                </div>

                <div className={styles.formField}>
                  <label htmlFor="province">Province</label>
                  <input
                    id="province"
                    {...register("province")}
                    placeholder="ON"
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label htmlFor="postalCode">Postal Code</label>
                  <input
                    id="postalCode"
                    {...register("postalCode")}
                    placeholder="A1A 1A1"
                    maxLength={7}
                  />
                </div>

                <div className={styles.formField}>
                  <label htmlFor="country">Country</label>
                  <input
                    id="country"
                    {...register("country")}
                    placeholder="Canada"
                  />
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
            <button
              type="submit"
              disabled={isSubmitting}
              className={styles.submitButton}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
