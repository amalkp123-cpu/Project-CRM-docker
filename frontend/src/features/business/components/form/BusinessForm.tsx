// BusinessForm.tsx
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import BusinessAddressSection from "./BusinessAddressSection";
import styles from "./BusinessForm.module.css";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

/* ================= TYPES ================= */

export interface Shareholder {
  fullName: string;
  sharePercentage: number;
  dob: string;
  sin: string;
  clientId?: string;
}

export interface Address {
  line1: string;
  line2?: string;
  country: string;
  province: string;
  city: string;
  postalCode: string;
}

export interface BusinessForm {
  businessName: string;
  businessNumber: string;
  businessType: string;
  incorporationDate: string;
  incorporationJurisdiction: string;
  fiscalYearEnd: string;
  ontarioCorpNumber?: string;

  addresses: Address[];
  mailingAddress?: Address;

  phone1: string;
  phone2?: string;
  phone3?: string;
  fax?: string;
  email: string;

  loyaltySince?: string;
  referredBy?: string;
  createdBy?: string;

  shareholders: Shareholder[];

  hstFrequency?: "monthly" | "quarterly" | "yearly";
  hstStartingDate?: string;

  corpoStartingYear?: string;
  payrollStartingYear?: string;

  wsibStartingQuarter?: "Q1" | "Q2" | "Q3" | "Q4";
  wsibStartingYear?: string;

  annualRenewalDate?: string;

  notes?: string[];
}

/* ================= HELPERS ================= */

function sanitizeDigits(s = "") {
  return String(s).replace(/\D/g, "");
}

function formatPhoneForDisplay(value = "") {
  const d = sanitizeDigits(value);
  if (d.length === 11 && d.startsWith("1")) {
    return `+1 ${d.slice(1, 4)}-${d.slice(4, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return value;
}

function validateBusinessNumber(bn = "") {
  if (!bn) return true;
  const d = sanitizeDigits(bn);
  if (d.length >= 9 && d.length <= 15) return true;
  return "Business Number must be 9–15 digits";
}

/* ================= COMPONENT ================= */

export default function BusinessForm() {
  const navigate = useNavigate();

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BusinessForm>({
    mode: "onTouched",
    defaultValues: {
      businessName: "",
      businessNumber: "",
      businessType: "",
      incorporationDate: "",
      incorporationJurisdiction: "",
      fiscalYearEnd: "",
      ontarioCorpNumber: "",
      addresses: [
        {
          line1: "",
          line2: "",
          country: "Canada",
          province: "Ontario",
          city: "",
          postalCode: "",
        },
      ],
      phone1: "",
      phone2: "",
      phone3: "",
      fax: "",
      email: "",
      loyaltySince: "",
      referredBy: "",
      shareholders: [],
      notes: [],
    },
  });

  const [user, setUser] = useState<any>(null);
  const [noteFields, setNoteFields] = useState<number[]>([0]);
  const [showMailingAddress, setShowMailingAddress] = useState(false);

  const incorporationJurisdiction = watch("incorporationJurisdiction");
  const isFederation = incorporationJurisdiction === "Federal";

  /* ================= USER PREFILL ================= */

  useEffect(() => {
    const u =
      JSON.parse(localStorage.getItem("user") || "null") ||
      JSON.parse(sessionStorage.getItem("user") || "null");

    setUser(u);

    if (u?.username || user?.username) {
      setValue("createdBy", u.username ? u.username : u.full_name);
    }
  }, [setValue]);

  /* ================= NOTES ================= */

  const addNote = () => setNoteFields((p) => [...p, p.length]);
  const removeNote = (id: number) =>
    setNoteFields((p) => p.filter((_, i) => i !== id));

  /* ================= SUBMIT ================= */

  const onSubmit = async (data: BusinessForm) => {
    try {
      const token = localStorage.getItem("token");

      const payload = {
        ...data,
        addresses: [
          {
            ...data.addresses[0],
            is_primary: true,
            is_mailing: false,
          },
          ...(showMailingAddress && data.mailingAddress
            ? [
                {
                  ...data.mailingAddress,
                  is_primary: false,
                  is_mailing: true,
                },
              ]
            : []),
        ],
      };

      const res = await fetch(`${API_URL}/api/bClient/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to submit form");
      }

      const result = await res.json();
      alert("Business client created successfully");
      navigate("/business/" + result.id);
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Submission failed");
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
      <section className={styles.relationSection}>
        <section className={styles.formSection}>
          <h3>Business Details</h3>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label htmlFor="businessName">Business Name *</label>
              <input
                id="businessName"
                {...register("businessName", {
                  required: "Business name is required",
                  minLength: { value: 2, message: "Too short" },
                })}
                aria-invalid={!!errors.businessName}
                placeholder="ABC Corporation Inc."
              />
              {errors.businessName && (
                <div role="alert" className={styles.errorText}>
                  {errors.businessName.message}
                </div>
              )}
            </div>

            <div className={styles.formField}>
              <label htmlFor="businessNumber">Business Number</label>
              <input
                id="businessNumber"
                inputMode="numeric"
                maxLength={15}
                placeholder="123456789"
                {...register("businessNumber", {
                  validate: validateBusinessNumber,
                })}
                aria-invalid={!!errors.businessNumber}
              />
              {errors.businessNumber && (
                <div role="alert" className={styles.errorText}>
                  {errors.businessNumber.message}
                </div>
              )}
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label htmlFor="businessType">Business Type *</label>
              <input
                id="businessType"
                {...register("businessType", {
                  required: "Business type is required",
                })}
                aria-invalid={!!errors.businessType}
                placeholder="Enter Business Type"
              />
              {errors.businessType && (
                <div role="alert" className={styles.errorText}>
                  {errors.businessType.message}
                </div>
              )}
            </div>

            <div className={styles.formField}>
              <label htmlFor="incorporationDate">Incorporation Date *</label>
              <input
                id="incorporationDate"
                type="date"
                {...register("incorporationDate", {
                  required: "Incorporation date is required",
                })}
                aria-invalid={!!errors.incorporationDate}
              />
              {errors.incorporationDate && (
                <div role="alert" className={styles.errorText}>
                  {errors.incorporationDate.message}
                </div>
              )}
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label htmlFor="incorporationJurisdiction">
                Incorporation Jurisdiction *
              </label>
              <select
                id="incorporationJurisdiction"
                {...register("incorporationJurisdiction", {
                  required: "Jurisdiction is required",
                })}
                aria-invalid={!!errors.incorporationJurisdiction}
                defaultValue=""
              >
                <option value="" disabled>
                  Select jurisdiction
                </option>
                <option value="Federal">Federal</option>
                <option value="Provincial">Provincial</option>
                <option value="Other">Other</option>
              </select>
              {errors.incorporationJurisdiction && (
                <div role="alert" className={styles.errorText}>
                  {errors.incorporationJurisdiction.message}
                </div>
              )}
            </div>

            <div className={styles.formField}>
              <label htmlFor="fiscalYearEnd">Fiscal Year End *</label>
              <input
                id="fiscalYearEnd"
                type="date"
                {...register("fiscalYearEnd", {
                  required: "Fiscal year end is required",
                })}
                aria-invalid={!!errors.fiscalYearEnd}
              />
              {errors.fiscalYearEnd && (
                <div role="alert" className={styles.errorText}>
                  {errors.fiscalYearEnd.message}
                </div>
              )}
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label htmlFor="ontarioCorpNumber">
                Ontario Corporation Number
              </label>
              <input
                id="ontarioCorpNumber"
                {...register("ontarioCorpNumber")}
                placeholder="1234567"
                inputMode="numeric"
              />
            </div>
          </div>
        </section>

        <BusinessAddressSection
          control={control}
          register={register}
          setValue={setValue}
          errors={errors}
        />

        <section className={styles.formSection}>
          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label>
                <input
                  type="checkbox"
                  checked={showMailingAddress}
                  onChange={(e) => setShowMailingAddress(e.target.checked)}
                />{" "}
                Mailing address is different
              </label>
            </div>
          </div>

          {showMailingAddress && (
            <>
              <h4>Mailing Address</h4>
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label htmlFor="mailingLine1">Address Line 1</label>
                  <input
                    id="mailingLine1"
                    {...register("mailingAddress.line1")}
                    placeholder="123 Main Street"
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="mailingLine2">Address Line 2</label>
                  <input
                    id="mailingLine2"
                    {...register("mailingAddress.line2")}
                    placeholder="Suite 100"
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label htmlFor="mailingCity">City</label>
                  <input
                    id="mailingCity"
                    {...register("mailingAddress.city")}
                    placeholder="Toronto"
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="mailingProvince">Province/State</label>
                  <input
                    id="mailingProvince"
                    {...register("mailingAddress.province")}
                    placeholder="Ontario"
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label htmlFor="mailingPostalCode">Postal/Zip Code</label>
                  <input
                    id="mailingPostalCode"
                    {...register("mailingAddress.postalCode")}
                    placeholder="M5H 2N2"
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="mailingCountry">Country</label>
                  <input
                    id="mailingCountry"
                    {...register("mailingAddress.country")}
                    placeholder="Canada"
                  />
                </div>
              </div>
            </>
          )}
        </section>

        <section className={styles.formSection}>
          <h3>Contact Information</h3>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label htmlFor="phone1">Phone 1 (Cell) *</label>
              <input
                id="phone1"
                type="tel"
                inputMode="tel"
                placeholder="(416) 555-1234"
                {...register("phone1", {
                  required: "Phone number is required",
                  validate: (val) => {
                    const d = sanitizeDigits(val);
                    if (d.length >= 10 && d.length <= 15) return true;
                    return "Enter a valid phone number";
                  },
                })}
                aria-invalid={!!errors.phone1}
                onBlur={(e) => {
                  const formatted = formatPhoneForDisplay(e.target.value);
                  setValue("phone1", formatted, {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                }}
              />
              {errors.phone1 && (
                <div role="alert" className={styles.errorText}>
                  {errors.phone1.message}
                </div>
              )}
            </div>

            <div className={styles.formField}>
              <label htmlFor="phone2">Phone 2 (Home)</label>
              <input
                id="phone2"
                type="tel"
                inputMode="tel"
                placeholder="(416) 555-5678"
                {...register("phone2", {
                  validate: (val) => {
                    if (!val) return true;
                    const d = sanitizeDigits(val);
                    if (d.length >= 10 && d.length <= 15) return true;
                    return "Enter a valid phone number";
                  },
                })}
                aria-invalid={!!errors.phone2}
                onBlur={(e) => {
                  if (e.target.value) {
                    const formatted = formatPhoneForDisplay(e.target.value);
                    setValue("phone2", formatted, {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                  }
                }}
              />
              {errors.phone2 && (
                <div role="alert" className={styles.errorText}>
                  {errors.phone2.message}
                </div>
              )}
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label htmlFor="phone3">Phone 3 (Work)</label>
              <input
                id="phone3"
                type="tel"
                inputMode="tel"
                placeholder="(416) 555-9012"
                {...register("phone3", {
                  validate: (val) => {
                    if (!val) return true;
                    const d = sanitizeDigits(val);
                    if (d.length >= 10 && d.length <= 15) return true;
                    return "Enter a valid phone number";
                  },
                })}
                aria-invalid={!!errors.phone3}
                onBlur={(e) => {
                  if (e.target.value) {
                    const formatted = formatPhoneForDisplay(e.target.value);
                    setValue("phone3", formatted, {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                  }
                }}
              />
              {errors.phone3 && (
                <div role="alert" className={styles.errorText}>
                  {errors.phone3.message}
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
                    if (d.length >= 10 && d.length <= 15) return true;
                    return "Invalid fax number";
                  },
                })}
                aria-invalid={!!errors.fax}
                placeholder="(416) 555-3456"
                inputMode="tel"
              />
              {errors.fax && (
                <div role="alert" className={styles.errorText}>
                  {errors.fax.message}
                </div>
              )}
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label htmlFor="email">Email *</label>
              <input
                id="email"
                type="email"
                placeholder="business@example.com"
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
        </section>

        <section className={styles.formSection}>
          <h3>Other Details</h3>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label htmlFor="loyaltySince">Loyalty Since</label>
              <input
                id="loyaltySince"
                type="date"
                {...register("loyaltySince")}
              />
            </div>

            <div className={styles.formField}>
              <label htmlFor="referredBy">Referred By</label>
              <input
                id="referredBy"
                {...register("referredBy")}
                placeholder="Referrer name"
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label htmlFor="createdBy">Created By</label>
              <input
                id="createdBy"
                {...register("createdBy")}
                readOnly
                disabled
              />
            </div>
          </div>
        </section>

        {/* <ShareholdersList
          control={control}
          register={register}
          setValue={setValue}
          watch={watch}
          errors={errors}
        /> */}

        <section className={styles.formSection}>
          <h3>HST Details</h3>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label htmlFor="hstFrequency">Filing Frequency</label>
              <select id="hstFrequency" {...register("hstFrequency")}>
                <option value="">Select frequency</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Yearly">Yearly</option>
              </select>
            </div>
          </div>
        </section>

        <section className={styles.formSection}>
          <h3>Corporate Tax Details</h3>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label htmlFor="corpoStartingYear">Starting Year</label>
              <input
                id="corpoStartingYear"
                type="number"
                min="1900"
                max="2100"
                placeholder="2024"
                {...register("corpoStartingYear", {
                  validate: (v) => {
                    if (!v) return true;
                    const year = Number(v);
                    if (year >= 1900 && year <= 2100) return true;
                    return "Enter a valid year";
                  },
                })}
                aria-invalid={!!errors.corpoStartingYear}
              />
              {errors.corpoStartingYear && (
                <div role="alert" className={styles.errorText}>
                  {errors.corpoStartingYear.message}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className={styles.formSection}>
          <h3>Payroll Details</h3>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label htmlFor="payrollStartingYear">Starting Year</label>
              <input
                id="payrollStartingYear"
                type="number"
                min="1900"
                max="2100"
                placeholder="2024"
                {...register("payrollStartingYear", {
                  validate: (v) => {
                    if (!v) return true;
                    const year = Number(v);
                    if (year >= 1900 && year <= 2100) return true;
                    return "Enter a valid year";
                  },
                })}
                aria-invalid={!!errors.payrollStartingYear}
              />
              {errors.payrollStartingYear && (
                <div role="alert" className={styles.errorText}>
                  {errors.payrollStartingYear.message}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className={styles.formSection}>
          <h3>WSIB Details</h3>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label htmlFor="wsibStartingQuarter">Starting Quarter</label>
              <select
                id="wsibStartingQuarter"
                {...register("wsibStartingQuarter")}
              >
                <option value="">Select quarter</option>
                <option value="Q1">Q1 (Jan-Mar)</option>
                <option value="Q2">Q2 (Apr-Jun)</option>
                <option value="Q3">Q3 (Jul-Sep)</option>
                <option value="Q4">Q4 (Oct-Dec)</option>
              </select>
            </div>

            <div className={styles.formField}>
              <label htmlFor="wsibStartingYear">Starting Year</label>
              <input
                id="wsibStartingYear"
                type="number"
                min="1900"
                max="2100"
                placeholder="2024"
                {...register("wsibStartingYear", {
                  validate: (v) => {
                    if (!v) return true;
                    const year = Number(v);
                    if (year >= 1900 && year <= 2100) return true;
                    return "Enter a valid year";
                  },
                })}
                aria-invalid={!!errors.wsibStartingYear}
              />
              {errors.wsibStartingYear && (
                <div role="alert" className={styles.errorText}>
                  {errors.wsibStartingYear.message}
                </div>
              )}
            </div>
          </div>
        </section>

        {isFederation && (
          <section className={styles.formSection}>
            <h3>Annual Renewal (Federation)</h3>

            <div className={styles.formRow}>
              <div className={styles.formField}>
                <label htmlFor="annualRenewalDate">Renewal Date</label>
                <input
                  id="annualRenewalDate"
                  type="date"
                  {...register("annualRenewalDate")}
                />
              </div>
            </div>
          </section>
        )}

        <section className={styles.formSection}>
          <h3>Notes</h3>
          <div className={styles.formRow}>
            <div className={`${styles.formField} ${styles.textAreaField}`}>
              {noteFields.map((_, id) => (
                <div key={id}>
                  <textarea
                    id={`notes.${id}`}
                    placeholder="Write your note here"
                    className={styles.notesArea}
                    inputMode="text"
                    aria-invalid={!!errors.notes?.[id]}
                    {...register(`notes.${id}`, {
                      required: "Note cannot be empty",
                    })}
                  />
                  {errors.notes?.[id] && (
                    <div role="alert" className={styles.errorText}>
                      {errors.notes[id].message}
                    </div>
                  )}
                  <button type="button" onClick={() => removeNote(id)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => addNote()}>
              Add Notes
            </button>
          </div>
        </section>
      </section>

      <div className={styles.formActions}>
        <button type="submit">Save Business Client</button>
      </div>
    </form>
  );
}
