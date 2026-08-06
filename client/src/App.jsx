import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Complaints from "./pages/Complaints";
import Contracts from "./pages/Contracts";
import Dashboard from "./pages/Dashboard";
import ForgotPassword from "./pages/ForgotPassword";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Payments from "./pages/Payments";
import Quotations from "./pages/Quotations";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import ServiceProviders from "./pages/ServiceProviders";
import Tasks from "./pages/Tasks";
import VerifyEmail from "./pages/VerifyEmail";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/service-providers" element={<ServiceProviders />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route
              element={
                <ProtectedRoute allowedRoles={["admin", "service_provider"]} />
              }
            >
              <Route path="/quotations" element={<Quotations />} />
            </Route>
            <Route
              element={
                <ProtectedRoute allowedRoles={["admin", "resident"]} />
              }
            >
              <Route path="/complaints" element={<Complaints />} />
            </Route>
            <Route
              element={
                <ProtectedRoute allowedRoles={["admin", "service_provider"]} />
              }
            >
              <Route path="/contracts" element={<Contracts />} />
            </Route>
            <Route
              element={
                <ProtectedRoute allowedRoles={["admin", "service_provider"]} />
              }
            >
              <Route path="/payments" element={<Payments />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
