// PersonalForm.tsx
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import DependentsList from "./DependantsList";
import AddressSection from "./AddressSection";
import BulkUploadModal from "./BulkUpload";
import TaxModal from "./TaxModal";
import type { TaxRecord } from "./TaxModal";
import type { Dependent } from "./DependantsList";
import type { Address } from "./AddressSection";
import styles from "./PersonalForm.module.css";
import { useNavigate } from "react-router-dom";
const API_URL = import.meta.env.VITE_API_URL;

export interface ClientForm {
  firstName: string;
  lastName: string;
  dob: string;
  sin: string;
  phone: string;
  email: string;
  gender?: string; // new
  maritalStatus: string;
  dateOfMarriage?: string;
  addresses: Address[];
  fax?: string;
  loyalty?: string;
  referredBy?: string;
  createdBy?: string;
  spouseFirstName?: string;
  spouseLastName?: string;
  spouseDob?: string;
  spouseSin?: string;
  spousePhone?: string;
  spouseEmail?: string;
  spouseGender?: string; // new
  dependents: Dependent[]; // ensure Dependent includes gender
  taxDetails: TaxRecord[];
  spouseTaxDetails: TaxRecord[];
}

function sanitizeDigits(s = "") {
  return String(s).replace(/\D/g, "");
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

export default function PersonalForm() {
  const {
    control,
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<ClientForm>({
    mode: "onTouched",
    defaultValues: {
      firstName: "",
      lastName: "",
      dob: "",
      sin: "",
      phone: "",
      email: "",
      gender: "", // new default
      maritalStatus: "",
      dateOfMarriage: "",
      addresses: [
        {
          line1: "",
          line2: "",
          country: "Canada",
          province: "",
          city: "",
          postalCode: "",
        },
      ],
      fax: "",
      loyalty: "",
      referredBy: "",
      createdBy: "",
      spouseFirstName: "",
      spouseLastName: "",
      spouseDob: "",
      spouseSin: "",
      spousePhone: "",
      spouseEmail: "",
      spouseGender: "", // new default
      dependents: [],
      taxDetails: [],
      spouseTaxDetails: [],
    },
  });

  const navigate = useNavigate();

  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [taxModalVisible, setTaxModalVisible] = useState(false);
  const [spouseTaxModalVisible, setSpouseTaxModalVisible] = useState(false);

  const maritalStatus = watch("maritalStatus");
  const isMarried = maritalStatus === "married";

  const [user, setUser]: any = useState("");

  useEffect(() => {
    const userLocal = localStorage.getItem("user");
    const userSession = sessionStorage.getItem("user");
    const stored =
      (userLocal ? JSON.parse(userLocal) : null) ||
      (userSession ? JSON.parse(userSession) : null);

    setUser(stored);
    if (stored?.username) {
      setValue("createdBy", stored.username, {
        shouldDirty: false,
        shouldValidate: false,
      });
    }
  }, [setValue]);

  useEffect(() => {
    if (!isMarried) {
      setValue("dateOfMarriage", "");
      // clear spouse fields when not married
      setValue("spouseFirstName", "");
      setValue("spouseLastName", "");
      setValue("spouseDob", "");
      setValue("spouseSin", "");
      setValue("spousePhone", "");
      setValue("spouseEmail", "");
      setValue("spouseGender", ""); // clear spouse gender
      setValue("spouseTaxDetails", []);
    }
  }, [isMarried, setValue]);

  function appendTax(record: TaxRecord) {
    const vals = getValues();
    const arr: TaxRecord[] = Array.isArray(vals.taxDetails)
      ? vals.taxDetails.slice()
      : [];

    arr.push(record);
    setValue("taxDetails", arr, { shouldDirty: true, shouldValidate: true });
  }

  function appendSpouseTax(record: TaxRecord) {
    const vals = getValues();
    const arr: TaxRecord[] = Array.isArray(vals.spouseTaxDetails)
      ? vals.spouseTaxDetails.slice()
      : [];
    arr.push(record);
    setValue("spouseTaxDetails", arr, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function removeTax(index: any) {
    const vals = getValues();
    const arr = Array.isArray(vals.taxDetails) ? vals.taxDetails.slice() : [];
    if (index < 0 || index >= arr.length) return;
    arr.splice(index, 1);
    setValue("taxDetails", arr, { shouldDirty: true, shouldValidate: true });
  }

  function removeSpouseTax(index: any) {
    const vals = getValues();
    const arr = Array.isArray(vals.spouseTaxDetails)
      ? vals.spouseTaxDetails.slice()
      : [];
    if (index < 0 || index >= arr.length) return;
    arr.splice(index, 1);
    setValue("spouseTaxDetails", arr, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function renderExtraFields(
    record: any,
    known = ["taxYear", "filedOn", "amount", "refNumber"]
  ) {
    return Object.entries(record)
      .filter(([k]) => !known.includes(k))
      .map(([k, v]) => (
        <div key={k} className={styles.taxExtraRow}>
          <strong className={styles.taxExtraKey}>{k}:</strong>
          <span className={styles.taxExtraVal}>{String(v ?? "")}</span>
        </div>
      ));
  }

  const taxList = (getValues().taxDetails || []) as TaxRecord[];
  const spouseTaxList = (getValues().spouseTaxDetails || []) as TaxRecord[];

  const onSubmit = async (data: any) => {
    try {
      const token = localStorage.getItem("token"); // Adjust based on your auth setup

      const response = await fetch(`${API_URL}/api/pClient/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // Add auth token
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit form");
      }

      const result = await response.json();
      if (result) {
        alert("Client created successfully!");
      }
      navigate("/");
    } catch (error: any) {
      console.error("Error submitting form:", error);
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <>
      <form
        className={styles.form}
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <button
          onClick={() => {
            setBulkModalVisible(true);
          }}
          className={styles.bulkButton}
          type="button"
        >
          Bulk Upload (Demo)
        </button>
        <section className={styles.relationSection}>
          <section className={styles.formSection}>
            <h3>Basic Details</h3>
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

            {/* new gender row */}
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
            </div>

            <div className={styles.formRow}>
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
            </div>

            <div className={styles.formRow}>
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

              <div className={styles.formField}>
                <label htmlFor="marriageStatus">Marital Status</label>
                <select
                  id="marriageStatus"
                  {...register("maritalStatus", {
                    required: "Marital status is required",
                  })}
                  aria-invalid={!!errors.maritalStatus}
                >
                  <option value="">Select</option>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                </select>
                {errors.maritalStatus && (
                  <div role="alert" className={styles.errorText}>
                    {errors.maritalStatus.message}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.formRow}>
              <div
                className={styles.formField}
                style={isMarried ? {} : { display: "none" }}
              >
                <label htmlFor="marriageDate">Date of Marriage</label>
                <input
                  id="marriageDate"
                  type="date"
                  {...register("dateOfMarriage", {
                    validate: (val) => {
                      if (!isMarried) return true;
                      return val ? true : "Provide marriage date";
                    },
                  })}
                  aria-invalid={!!errors.dateOfMarriage}
                />
                {errors.dateOfMarriage && (
                  <div role="alert" className={styles.errorText}>
                    {errors.dateOfMarriage.message}
                  </div>
                )}
              </div>
            </div>
          </section>

          <AddressSection
            control={control}
            register={register}
            setValue={setValue}
            errors={errors}
          />

          {/* Other Details and Tax Section unchanged (omitted for brevity) */}
          <section className={styles.formSection}>
            <h3>Other Details</h3>
            <div className={styles.formRow}>
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
              <div className={styles.formField}>
                <label htmlFor="loyalty">Loyalty Since</label>
                <input id="loyalty" type="date" {...register("loyalty")} />
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formField}>
                <label htmlFor="refer">Referred By</label>
                <input
                  id="refer"
                  {...register("referredBy")}
                  placeholder="user"
                />
              </div>
              <div className={styles.formField}>
                <label htmlFor="creater">Created By</label>
                <input
                  id="creater"
                  {...register("createdBy")}
                  readOnly
                  disabled
                />
              </div>
            </div>
          </section>

          <section className={styles.formSection}>
            <h3>Tax Section</h3>
            <div className={styles.addDependent}>
              <button type="button" onClick={() => setTaxModalVisible(true)}>
                Add tax details
              </button>
            </div>
            <div className={styles.taxListSection}>
              {taxList.length === 0 ? (
                <small>No tax records</small>
              ) : (
                <div className={styles.taxList}>
                  {taxList.map((t, i) => (
                    <div key={i} className={styles.taxItem}>
                      <div className={styles.taxItemHeader}>
                        <div className={styles.taxMain}>
                          <div className={styles.taxYear}>
                            {t.taxYear || "—"}
                          </div>
                          <div className={styles.taxFiled}>
                            {t.filedOn ? `Filed ${t.filedOn}` : "Not filed"}
                          </div>
                        </div>
                        <button
                          type="button"
                          className={styles.taxRemoveBtn}
                          aria-label={`Remove tax record ${t.taxYear || i + 1}`}
                          onClick={() => removeTax(i)}
                        >
                          Remove
                        </button>
                      </div>
                      <div className={styles.taxItemDetails}>
                        {renderExtraFields(t)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </section>

        <section
          className={styles.relationSection}
          style={isMarried ? {} : { display: "none" }}
        >
          <section className={styles.formSection}>
            <h3>Spouse Details</h3>
            <div className={styles.formRow}>
              <div className={styles.formField}>
                <label htmlFor="spouseFname">First Name</label>
                <input
                  id="spouseFname"
                  {...register("spouseFirstName", {
                    validate: (v) => {
                      if (!isMarried) return true;
                      return v ? true : "First name is required";
                    },
                    minLength: { value: 2, message: "Too short" },
                  })}
                  aria-invalid={!!errors.spouseFirstName}
                  placeholder="Given name"
                />
                {errors.spouseFirstName && (
                  <div role="alert" className={styles.errorText}>
                    {errors.spouseFirstName.message}
                  </div>
                )}
              </div>
              <div className={styles.formField}>
                <label htmlFor="spouseLname">Last Name</label>
                <input
                  id="spouseLname"
                  {...register("spouseLastName", {
                    validate: (v) => {
                      if (!isMarried) return true;
                      return v ? true : "Last name is required";
                    },
                    minLength: { value: 2, message: "Too short" },
                  })}
                  aria-invalid={!!errors.spouseLastName}
                  placeholder="Family name"
                />
                {errors.spouseLastName && (
                  <div role="alert" className={styles.errorText}>
                    {errors.spouseLastName.message}
                  </div>
                )}
              </div>
            </div>

            {/* spouse gender */}
            <div className={styles.formRow}>
              <div className={styles.formField}>
                <label htmlFor="spouseGender">Gender</label>
                <select id="spouseGender" {...register("spouseGender")}>
                  <option value="">Select an option</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className={styles.formField}>
                <label htmlFor="spouseDob">DOB</label>
                <input
                  id="spouseDob"
                  type="date"
                  {...register("spouseDob", {
                    validate: (v) =>
                      !isMarried ? true : v ? true : "DOB is required",
                  })}
                  aria-invalid={!!errors.spouseDob}
                />
                {errors.spouseDob && (
                  <div role="alert" className={styles.errorText}>
                    {errors.spouseDob.message}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formField}>
                <label htmlFor="spouseSin">SIN Number</label>
                <input
                  id="spouseSin"
                  inputMode="numeric"
                  maxLength={11}
                  placeholder="123456789"
                  {...register("spouseSin", {
                    validate: (v) => {
                      if (!isMarried && !v) return true;
                      if (!v) return "SIN is required";
                      return validateCanadianSIN(v);
                    },
                  })}
                  aria-invalid={!!errors.spouseSin}
                />
                {errors.spouseSin && (
                  <div role="alert" className={styles.errorText}>
                    {errors.spouseSin.message}
                  </div>
                )}
              </div>
              <div className={styles.formField}>
                <label htmlFor="spousePhone">Phone</label>
                <input
                  id="spousePhone"
                  type="tel"
                  inputMode="tel"
                  placeholder="(416) 555-1234"
                  {...register("spousePhone", {
                    validate: (v) => {
                      if (!isMarried && !v) return true;
                      if (!v) return "Phone is required";
                      const d = sanitizeDigits(v);
                      if (d.length === 10) return true;
                      if (d.length === 11 && d.startsWith("1")) return true;
                      return "Enter a valid 10-digit Canadian phone (optionally +1)";
                    },
                  })}
                  aria-invalid={!!errors.spousePhone}
                  onBlur={(e) => {
                    const formatted = formatPhoneForDisplay(e.target.value);
                    setValue("spousePhone", formatted, {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                  }}
                />
                {errors.spousePhone && (
                  <div role="alert" className={styles.errorText}>
                    {errors.spousePhone.message}
                  </div>
                )}
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formField}>
                <label htmlFor="spouseEmail">Email</label>
                <input
                  id="spouseEmail"
                  type="email"
                  placeholder="name@example.com"
                  {...register("spouseEmail", {
                    validate: (v) => {
                      if (!isMarried && !v) return true;
                      if (!v) return "Email is required";
                      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
                        return "Invalid email";
                      return true;
                    },
                  })}
                  aria-invalid={!!errors.spouseEmail}
                />
                {errors.spouseEmail && (
                  <div role="alert" className={styles.errorText}>
                    {errors.spouseEmail.message}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.addDependent}>
              <button
                type="button"
                onClick={() => setSpouseTaxModalVisible(true)}
              >
                Add tax details
              </button>
            </div>

            <div className={styles.taxListSection}>
              {spouseTaxList.length === 0 ? (
                <small>No spouse tax records</small>
              ) : (
                <div className={styles.taxList}>
                  {spouseTaxList.map((t, i) => (
                    <div key={i} className={styles.taxItem}>
                      <div className={styles.taxItemHeader}>
                        <div className={styles.taxMain}>
                          <div className={styles.taxYear}>
                            {t.taxYear || "—"}
                          </div>
                          <div className={styles.taxFiled}>
                            {t.filedOn ? `Filed ${t.filedOn}` : "Not filed"}
                          </div>
                        </div>
                        <button
                          type="button"
                          className={styles.taxRemoveBtn}
                          aria-label={`Remove spouse tax record ${
                            t.taxYear || i + 1
                          }`}
                          onClick={() => removeSpouseTax(i)}
                        >
                          Remove
                        </button>
                      </div>
                      <div className={styles.taxItemDetails}>
                        {renderExtraFields(t)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <DependentsList
            control={control}
            register={register}
            setValue={setValue}
            watch={watch}
            errors={errors}
          />
        </section>

        <div className={styles.formActions}>
          <button type="submit">Save</button>
        </div>
      </form>

      <BulkUploadModal
        visible={bulkModalVisible}
        onClose={(result) => {
          setBulkModalVisible(false);
          if (result) alert(`Created ${result.created}`);
        }}
        apiUrl={import.meta.env.VITE_API_URL}
        defaultCreatedBy={user?.username}
      />

      <TaxModal
        visible={taxModalVisible}
        onClose={() => setTaxModalVisible(false)}
        onSave={(rec: any) => appendTax(rec)}
        user={user}
      />
      <TaxModal
        visible={spouseTaxModalVisible}
        title="Spouse tax details"
        onClose={() => setSpouseTaxModalVisible(false)}
        onSave={(rec: any) => appendSpouseTax(rec)}
        user={user}
      />
    </>
  );
}
