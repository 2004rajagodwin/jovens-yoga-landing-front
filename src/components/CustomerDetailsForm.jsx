import { useState } from "react";
import { COUNTRIES } from "../lib/countries.js";

const EMPTY = {
  firstName: "",
  lastName: "",
  email: "",
  countryRegion: "India",
  countryPhoneCode: "+91",
  mobileNumber: "",
  address: "",
};

export default function CustomerDetailsForm({ initialValues, submitLabel, onSubmit, submitting, errorMessage }) {
  const [values, setValues] = useState({ ...EMPTY, ...initialValues });

  function handleChange(e) {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function handleCountryChange(e) {
    const country = COUNTRIES.find((c) => c.name === e.target.value);
    setValues((prev) => ({
      ...prev,
      countryRegion: e.target.value,
      countryPhoneCode: country ? country.phoneCode : prev.countryPhoneCode,
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="customer-details-form">
      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label">First Name</label>
          <input
            className="form-control"
            name="firstName"
            value={values.firstName}
            onChange={handleChange}
            required
          />
        </div>
        <div className="col-md-6">
          <label className="form-label">Last Name</label>
          <input
            className="form-control"
            name="lastName"
            value={values.lastName}
            onChange={handleChange}
            required
          />
        </div>
        <div className="col-md-8">
          <label className="form-label">Email</label>
          <input
            type="email"
            className="form-control"
            name="email"
            value={values.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="col-md-4">
          <label className="form-label">Country/Region</label>
          <select
            className="form-select"
            name="countryRegion"
            value={values.countryRegion}
            onChange={handleCountryChange}
            required
          >
            {COUNTRIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-3">
          <label className="form-label">Phone Code</label>
          <select
            className="form-select"
            name="countryPhoneCode"
            value={values.countryPhoneCode}
            onChange={handleChange}
            required
          >
            {[...new Set(COUNTRIES.map((c) => c.phoneCode))].map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-9">
          <label className="form-label">Mobile / WhatsApp Number</label>
          <input
            className="form-control"
            name="mobileNumber"
            value={values.mobileNumber}
            onChange={handleChange}
            required
          />
        </div>
        <div className="col-12">
          <label className="form-label">Address</label>
          <input
            className="form-control"
            name="address"
            value={values.address}
            onChange={handleChange}
          />
        </div>
      </div>

      {errorMessage && (
        <div className="alert alert-danger mt-3" role="alert">
          {errorMessage}
        </div>
      )}

      <button type="submit" className="btn mt-4" style={{ background: "#ff6b1b", color: "#fff" }} disabled={submitting}>
        {submitting ? "Please wait…" : submitLabel}
      </button>
    </form>
  );
}
