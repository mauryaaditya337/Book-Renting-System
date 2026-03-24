"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { AuthCard } from "@/components/AuthCard";
import { useAuth } from "@/components/AuthProvider";

const initialSignupData = {
  fullName: "",
  collegeName: "",
  phoneNumber: "",
  email: "",
  password: ""
};
const initialLoginData = { email: "", password: "" };

export function AuthForm({ mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, signup } = useAuth();

  const [formData, setFormData] = useState(
    mode === "signup" ? initialSignupData : initialLoginData
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectPath = searchParams.get("redirect") || "/profile";

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      if (mode === "signup") {
        await signup(formData);
        setSuccessMessage("Signup successful. You can log in now.");
        setFormData(initialSignupData);
        router.push("/login?signup=success");
      } else {
        await login(formData.email, formData.password);
        setSuccessMessage("Login successful.");
        router.push(redirectPath);
      }
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSignup = mode === "signup";

  return (
    <AuthCard
      title={isSignup ? "Create your account" : "Welcome back"}
      subtitle={
        isSignup
          ? "Sign up with your trust details, email, and password to start using the book renting platform."
          : "Log in with your existing account to view your protected profile page."
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {isSignup ? (
          <>
            <InputField
              label="Full name"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Asha Reader"
            />
            <InputField
              label="College name"
              name="collegeName"
              value={formData.collegeName}
              onChange={handleChange}
              placeholder="Savitribai Phule Pune University"
            />
            <InputField
              label="Phone number"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="9876543210"
              required={false}
            />
          </>
        ) : null}

        <InputField
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="reader@example.com"
        />

        <InputField
          label="Password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="At least 6 characters"
        />

        {errorMessage ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        {successMessage ? (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSubmitting
            ? isSignup
              ? "Creating account..."
              : "Logging in..."
            : isSignup
              ? "Sign up"
              : "Login"}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-600">
        {isSignup ? "Already have an account?" : "Need an account?"}{" "}
        <Link
          href={isSignup ? "/login" : "/signup"}
          className="font-medium text-teal-700 underline decoration-teal-300 underline-offset-4"
        >
          {isSignup ? "Go to login" : "Create one"}
        </Link>
      </p>
    </AuthCard>
  );
}

function InputField({
  label,
  name,
  onChange,
  placeholder,
  required = true,
  type = "text",
  value
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input
        required={required}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
      />
    </label>
  );
}
