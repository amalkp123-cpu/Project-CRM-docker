// BusinessAddressSection.tsx
import { useFieldArray } from "react-hook-form";
import styles from "./BusinessForm.module.css";

export interface Address {
  line1: string;
  line2?: string;
  country: string;
  province: string;
  city: string;
  postalCode: string;
}

interface BusinessAddressSectionProps {
  control: any;
  register: any;
  setValue: any;
  errors: any;
}

export default function BusinessAddressSection({
  control,
  register,
  errors,
}: BusinessAddressSectionProps) {
  const { fields, remove } = useFieldArray({
    control,
    name: "addresses",
  });

  return (
    <section className={styles.formSection}>
      <h3>Business Address</h3>

      {fields.map((field, index) => (
        <div key={field.id} className={styles.formSection}>
          {fields.length > 1 && (
            <div className={styles.addressHeader}>
              <h4>Address {index + 1}</h4>
              <button
                type="button"
                onClick={() => remove(index)}
                className={styles.removeButton}
              >
                Remove
              </button>
            </div>
          )}

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label htmlFor={`addresses.${index}.line1`}>
                Address Line 1 *
              </label>
              <input
                id={`addresses.${index}.line1`}
                {...register(`addresses.${index}.line1`, {
                  required: "Address is required",
                })}
                placeholder="123 Business Street"
                aria-invalid={!!errors.addresses?.[index]?.line1}
              />
              {errors.addresses?.[index]?.line1 && (
                <div role="alert" className={styles.errorText}>
                  {errors.addresses[index].line1.message}
                </div>
              )}
            </div>

            <div className={styles.formField}>
              <label htmlFor={`addresses.${index}.line2`}>Address Line 2</label>
              <input
                id={`addresses.${index}.line2`}
                {...register(`addresses.${index}.line2`)}
                placeholder="Suite, Unit, Building"
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label htmlFor={`addresses.${index}.city`}>City *</label>
              <input
                id={`addresses.${index}.city`}
                {...register(`addresses.${index}.city`, {
                  required: "City is required",
                })}
                placeholder="Toronto"
                aria-invalid={!!errors.addresses?.[index]?.city}
              />
              {errors.addresses?.[index]?.city && (
                <div role="alert" className={styles.errorText}>
                  {errors.addresses[index].city.message}
                </div>
              )}
            </div>

            <div className={styles.formField}>
              <label htmlFor={`addresses.${index}.province`}>
                Province/State *
              </label>
              <input
                id={`addresses.${index}.province`}
                {...register(`addresses.${index}.province`, {
                  required: "Province/State is required",
                })}
                placeholder="Ontario"
                aria-invalid={!!errors.addresses?.[index]?.province}
              />
              {errors.addresses?.[index]?.province && (
                <div role="alert" className={styles.errorText}>
                  {errors.addresses[index].province.message}
                </div>
              )}
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label htmlFor={`addresses.${index}.postalCode`}>
                Postal/Zip Code *
              </label>
              <input
                id={`addresses.${index}.postalCode`}
                {...register(`addresses.${index}.postalCode`, {
                  required: "Postal/Zip code is required",
                })}
                placeholder="M5H 2N2"
                aria-invalid={!!errors.addresses?.[index]?.postalCode}
              />
              {errors.addresses?.[index]?.postalCode && (
                <div role="alert" className={styles.errorText}>
                  {errors.addresses[index].postalCode.message}
                </div>
              )}
            </div>

            <div className={styles.formField}>
              <label htmlFor={`addresses.${index}.country`}>Country *</label>
              <input
                id={`addresses.${index}.country`}
                {...register(`addresses.${index}.country`, {
                  required: "Country is required",
                })}
                placeholder="Canada"
                aria-invalid={!!errors.addresses?.[index]?.country}
              />
              {errors.addresses?.[index]?.country && (
                <div role="alert" className={styles.errorText}>
                  {errors.addresses[index].country.message}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
