"use client";

import Link from "next/link";
import { useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { FieldMessage } from "@/components/FieldMessage";
import { apiRequest } from "@/lib/api";

const initialFormData = {
  requestedTitle: "",
  authorOrSubject: "",
  semesterOrCourse: "",
  collegeName: "",
  note: ""
};

export function RequestABookView() {
  const { token, isAuthenticated, user } = useAuth();
  const [formData, setFormData] = useState(() => ({
    ...initialFormData,
    collegeName: user?.collegeName || ""
  }));
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: "" }));
    setFormError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});
    setFormError("");
    setSuccessMessage("");

    try {
      await apiRequest("/book-requests", {
        method: "POST",
        headers: token
          ? {
              Authorization: `Bearer ${token}`
            }
          : undefined,
        body: JSON.stringify({
          requestedTitle: formData.requestedTitle.trim(),
          authorOrSubject: formData.authorOrSubject.trim(),
          semesterOrCourse: formData.semesterOrCourse.trim(),
          collegeName: formData.collegeName.trim(),
          note: formData.note.trim()
        })
      });

      setSuccessMessage(
        isAuthenticated
          ? "Your book request has been saved. We’ll keep this demand signal for future supply."
          : "Your book request has been submitted. You can also create an account later to track future requests."
      );
      setFormData({
        ...initialFormData,
        collegeName: user?.collegeName || ""
      });
    } catch (error) {
      if (Array.isArray(error.details) && error.details.length > 0) {
        const nextFieldErrors = {};
        const generalErrors = [];

        error.details.forEach((detail) => {
          if (detail.field) {
            nextFieldErrors[detail.field] = detail.message;
          } else {
            generalErrors.push(detail.message);
          }
        });

        setFieldErrors(nextFieldErrors);
        if (generalErrors.length > 0) {
          setFormError(generalErrors.join(", "));
        }
      } else {
        setFormError(error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
          Request A Book
        </p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
              Can&apos;t find your book? Request it
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Tell us what you need so we can capture real demand and help future listings match it.
            </p>
          </div>
          <Link
            href="/books"
            className="rounded-2xl bg-slate-100 px-5 py-3 text-center font-medium text-slate-700 transition hover:bg-slate-200"
          >
            Back to books
          </Link>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-teal-100 bg-teal-50/70 p-5 text-sm leading-6 text-slate-700">
          <p className="font-semibold text-slate-900">Why this helps</p>
          <p className="mt-2">
            Even if the book is unavailable today, this request helps surface real student demand
            by title, subject, semester, and campus.
          </p>
        </div>

        <form className="mt-8 grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit}>
          <InputField
            label="Requested Title"
            name="requestedTitle"
            value={formData.requestedTitle}
            onChange={handleChange}
            error={fieldErrors.requestedTitle}
            placeholder="Engineering Mathematics"
            required
          />
          <InputField
            label="Author or Subject"
            name="authorOrSubject"
            value={formData.authorOrSubject}
            onChange={handleChange}
            error={fieldErrors.authorOrSubject}
            placeholder="B.S. Grewal or Calculus"
          />
          <InputField
            label="Semester or Course"
            name="semesterOrCourse"
            value={formData.semesterOrCourse}
            onChange={handleChange}
            error={fieldErrors.semesterOrCourse}
            placeholder="Semester 3 / Data Structures"
          />
          <InputField
            label="College Name"
            name="collegeName"
            value={formData.collegeName}
            onChange={handleChange}
            error={fieldErrors.collegeName}
            placeholder="Pune University"
          />
          <TextAreaField
            label="Note"
            name="note"
            value={formData.note}
            onChange={handleChange}
            error={fieldErrors.note}
            placeholder="Mention edition, preferred condition, or anything else that would help."
          />

          <div className="sm:col-span-2 space-y-4">
            {formError ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </p>
            ) : null}

            {successMessage ? (
              <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </p>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-2xl bg-teal-700 px-5 py-3 font-medium text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isSubmitting ? "Submitting request..." : "Submit book request"}
              </button>
              {isAuthenticated ? (
                <Link
                  href="/my-book-requests"
                  className="rounded-2xl bg-slate-100 px-5 py-3 text-center font-medium text-slate-700 transition hover:bg-slate-200"
                >
                  View my requests
                </Link>
              ) : (
                <Link
                  href="/signup"
                  className="rounded-2xl bg-slate-100 px-5 py-3 text-center font-medium text-slate-700 transition hover:bg-slate-200"
                >
                  Create account
                </Link>
              )}
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}

function InputField({ error, label, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input
        {...props}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
      />
      <FieldMessage message={error} />
    </label>
  );
}

function TextAreaField({ error, label, ...props }) {
  return (
    <label className="block sm:col-span-2">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <textarea
        {...props}
        rows={5}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
      />
      <FieldMessage message={error} />
    </label>
  );
}
