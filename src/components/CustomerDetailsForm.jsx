import { useState } from "react";

const EMPTY = {
  firstName: "",
  lastName: "",
  email: "",
  countryRegion: "",
  countryPhoneCode: "+1",
  mobileNumber: "",
  address: "",
};

export default function CustomerDetailsForm({ initialValues, submitLabel, onSubmit, submitting, errorMessage }) {
  const [values, setValues] = useState({ ...EMPTY, ...initialValues });

  function handleChange(e) {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
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
          <input
            className="form-control"
            name="countryRegion"
            value={values.countryRegion}
            onChange={handleChange}
          />
        </div>
        <div className="col-md-3">
          <label className="form-label">Phone Code</label>
          <input
            className="form-control"
            name="countryPhoneCode"
            value={values.countryPhoneCode}
            onChange={handleChange}
            required
          />
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
