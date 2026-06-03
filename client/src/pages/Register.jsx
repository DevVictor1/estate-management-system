import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const initialFormData = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  role: "resident",
  estateName: "",
  apartmentNumber: "",
  serviceCategory: "security",
  customServiceCategory: "",
  address: "",
};

function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role,
        estateName: formData.estateName,
        apartmentNumber: formData.apartmentNumber,
      };

      if (formData.role === "service_provider") {
        payload.serviceCategory = formData.serviceCategory;
        payload.address = formData.address;

        if (formData.serviceCategory === "other") {
          payload.customServiceCategory = formData.customServiceCategory;
        }
      }

      await register(payload);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page auth-page-register">
      <div className="auth-card auth-card-register">
        <h1 style={{ marginBottom: "8px" }}>Create Account</h1>
        <p style={{ marginBottom: "24px", color: "#6b7a90" }}>
          Register to access the estate management system.
        </p>

        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
            }}
          >
            <div>
              <label
                htmlFor="fullName"
                style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
              >
                Full Name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label
                htmlFor="email"
                style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
              >
                Phone
              </label>
              <input
                id="phone"
                name="phone"
                type="text"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter your phone number"
                style={inputStyle}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
                required
                style={inputStyle}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label
                htmlFor="role"
                style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
              >
                Role
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
                style={inputStyle}
              >
                <option value="resident">Resident</option>
                <option value="service_provider">Service Provider</option>
              </select>
              <p style={{ marginTop: "8px", color: "#6b7a90", fontSize: "0.95rem" }}>
                Residents can submit complaints. Service providers will require
                admin approval before being verified.
              </p>
            </div>

            {formData.role === "service_provider" ? (
              <>
                <div>
                  <label
                    htmlFor="serviceCategory"
                    style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
                  >
                    Service Category
                  </label>
                  <select
                    id="serviceCategory"
                    name="serviceCategory"
                    value={formData.serviceCategory}
                    onChange={handleChange}
                    required
                    style={inputStyle}
                  >
                    <option value="security">Security</option>
                    <option value="cleaning">Cleaning</option>
                    <option value="waste_management">Waste Management</option>
                    <option value="landscaping">Landscaping</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {formData.serviceCategory === "other" ? (
                  <div>
                    <label
                      htmlFor="customServiceCategory"
                      style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
                    >
                      Custom Service Category
                    </label>
                    <input
                      id="customServiceCategory"
                      name="customServiceCategory"
                      type="text"
                      value={formData.customServiceCategory}
                      onChange={handleChange}
                      placeholder="Describe your service"
                      style={inputStyle}
                    />
                  </div>
                ) : null}

                <div style={{ gridColumn: "1 / -1" }}>
                  <label
                    htmlFor="address"
                    style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
                  >
                    Business Address
                  </label>
                  <input
                    id="address"
                    name="address"
                    type="text"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter business address"
                    style={inputStyle}
                  />
                </div>
              </>
            ) : null}

            <div>
              <label
                htmlFor="estateName"
                style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
              >
                Estate Name
              </label>
              <input
                id="estateName"
                name="estateName"
                type="text"
                value={formData.estateName}
                onChange={handleChange}
                placeholder="Enter estate name"
                style={inputStyle}
              />
            </div>

            <div>
              <label
                htmlFor="apartmentNumber"
                style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
              >
                Apartment Number
              </label>
              <input
                id="apartmentNumber"
                name="apartmentNumber"
                type="text"
                value={formData.apartmentNumber}
                onChange={handleChange}
                placeholder="Enter apartment number"
                style={inputStyle}
              />
            </div>
          </div>

          {error ? (
            <p style={{ marginTop: "16px", marginBottom: "0", color: "#c1121f" }}>
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              marginTop: "24px",
              padding: "12px 16px",
              border: "none",
              borderRadius: "10px",
              background: "#0b1f3a",
              color: "#ffffff",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <p style={{ marginTop: "18px", textAlign: "center", color: "#6b7a90" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#0b1f3a", fontWeight: "600" }}>
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  border: "1px solid #d9e2ec",
  borderRadius: "10px",
  outline: "none",
};

export default Register;
