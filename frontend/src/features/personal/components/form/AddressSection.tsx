import { useEffect } from "react";
import type {
  Control,
  UseFormRegister,
  UseFormSetValue,
  FieldErrors,
} from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import styles from "./PersonalForm.module.css";

export interface Address {
  line1: string;
  line2?: string;
  country?: string;
  province?: string;
  city?: string;
  postalCode?: string;
}

interface Props {
  control: Control<any>;
  register: UseFormRegister<any>;
  setValue?: UseFormSetValue<any>;
  errors: FieldErrors<any>;
}

export default function AddressSection({ control, register, errors }: Props) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "addresses",
  });

  useEffect(() => {
    if (!fields.length) {
      append({
        line1: "",
        line2: "",

        province: "",
        city: "",
        postalCode: "",
        country: "Canada",
      } as Address);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className={styles.formSection}>
      <h3>Addresses</h3>

      {fields.map((f, idx) => (
        <div key={f.id} className={styles.addressCard}>
          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label htmlFor={`addresses.${idx}.line1`}>Address line 1</label>
              <input
                id={`addresses.${idx}.line1`}
                {...register(`addresses.${idx}.line1`)}
                placeholder="Street address, P.O. box, company name"
              />
              {(errors.addresses as unknown as any)?.[idx]?.line1?.message && (
                <div role="alert" className={styles.errorText}>
                  {String(
                    (errors.addresses as unknown as any)[idx].line1.message
                  )}
                </div>
              )}
            </div>

            <div className={styles.formField}>
              <label htmlFor={`addresses.${idx}.line2`}>Address line 2</label>
              <input
                id={`addresses.${idx}.line2`}
                {...register(`addresses.${idx}.line2`)}
                placeholder="Apt, suite"
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label htmlFor={`addresses.${idx}.city`}>City</label>
              <input
                id={`addresses.${idx}.city`}
                {...register(`addresses.${idx}.city`)}
                placeholder="Toronto"
              />
            </div>
            <div className={styles.formField}>
              <label htmlFor={`addresses.${idx}.province`}>Province</label>
              <input
                id={`addresses.${idx}.province`}
                {...register(`addresses.${idx}.province`)}
                placeholder="Ontario"
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label htmlFor={`addresses.${idx}.postalCode`}>Postal Code</label>
              <input
                id={`addresses.${idx}.postalCode`}
                {...register(`addresses.${idx}.postalCode`)}
                placeholder="M5V3L9"
              />
            </div>
            <div className={styles.formField}>
              <label htmlFor={`addresses.${idx}.country`}>Country</label>
              <input
                id={`addresses.${idx}.country`}
                {...register(`addresses.${idx}.country`)}
                defaultValue="Canada"
                readOnly
              />
            </div>
          </div>

          {idx > 0 && (
            <div className={styles.removeRow}>
              <button type="button" onClick={() => remove(idx)}>
                Remove address
              </button>
            </div>
          )}
        </div>
      ))}

      <div className={styles.addDependent}>
        <button
          type="button"
          onClick={() =>
            append({
              line1: "",
              line2: "",
              country: "Canada",
              province: "",
              city: "",
              postalCode: "",
            } as Address)
          }
        >
          Add address
        </button>
      </div>
    </section>
  );
}
