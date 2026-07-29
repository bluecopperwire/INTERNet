import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import './LoginView.css';
import type { UserRole, LoginCredentials } from '../types/auth.types';
import leftPanelImage from '../../../assets/left-panel.svg';
import googleLogoImage from '../../../assets/google-logo.webp';

const AVAILABLE_ROLES: UserRole[] = ['Intern Seeker', 'Company', 'QCPESO'];

export const LoginView = () => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('Intern Seeker');
  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: '',
    rememberMe: false,
    role: 'Intern Seeker'
  });

  const handleRoleSwitch = (role: UserRole) => {
    setSelectedRole(role);
    setFormData((prev) => ({ ...prev, role }));
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { id, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Form Submitted for role:', selectedRole, formData);
    // Future API integration will link with auth.service.ts
  };

  const handleGoogleLogin = () => {
    console.log(`Triggered Google Login for role: ${selectedRole}`);
  };

  return (
    <div className="login-layout">
      {/* Left Column - Hero Visual with Gradient */}
      <aside className="login-hero-pane">
        <img
          src={leftPanelImage}
          alt="Quezon City Memorial Shrine"
          className="hero-image"
        />
      </aside>

      {/* Right Column - Interactive Login Form */}
      <main className="login-form-pane">
        <div className="login-form-card">

          {/* Role Selector Tabs */}
          <nav className="role-switcher" aria-label="User Role Selector">
            {AVAILABLE_ROLES.map((role) => (
              <button
                key={role}
                type="button"
                className={`role-tab ${selectedRole === role ? 'role-tab-active' : ''}`}
                onClick={() => handleRoleSwitch(role)}
              >
                {role}
              </button>
            ))}
          </nav>

          {/* Title Header */}
          <h1 className="login-title">Welcome Back, User</h1>

          {/* OAuth Google Button */}
          <button
            type="button"
            className="btn-oauth"
            onClick={handleGoogleLogin}
            aria-label="Login with Google"
          >
            <img src={googleLogoImage} alt="" aria-hidden="true" className="google-icon" />
            <span>Login with Google</span>
          </button>

          {/* Visual Divider */}
          <div className="login-divider" role="separator">
            <span className="divider-text">Or login with email</span>
          </div>

          {/* Credentials Form */}
          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="Enter email address"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="Enter password"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-options">
              <label htmlFor="rememberMe" className="remember-group">
                <input
                  id="rememberMe"
                  type="checkbox"
                  className="checkbox-custom"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                />
                <span className="remember-label">Remember me</span>
              </label>

              <a href="#forgot-password" className="forgot-link">
                Forgot Password?
              </a>
            </div>

            <button type="submit" className="btn-submit">
              Login
            </button>
          </form>

        </div>
      </main>
    </div>
  );
};
export default LoginView;
