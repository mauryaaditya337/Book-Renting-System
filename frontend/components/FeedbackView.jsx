"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { FieldMessage } from "@/components/FieldMessage";
import { useAuth } from "@/components/AuthProvider";
import { apiRequest } from "@/lib/api";

const FEEDBACK_TYPES = [
  { value: "bug", label: "Bug" },
  { value: "suggestion", label: "Suggestion" },
  { value: "general", label: "General" }
];

const initialFormData = {
  type: "general",
  message: ""
};

export function FeedbackView() {
  const pathname = usePathname();
  const { token, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState(initialFormData);
  const [pageValue, setPageValue] = useState("/feedback");
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setPageValue(pathname || "/feedback");
  }, [pathname]);

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
      await apiRequest("/feedback", {
        method: "POST",
        headers: token
          ? {
              Authorization: `Bearer ${token}`
            }
          : undefined,
        body: JSON.stringify({
          type: formData.type,
          message: formData.message.trim(),
          page: pageValue
        })
      });

      setSuccessMessage(
        isAuthenticated
          ? "Thanks for the feedback. We’ve saved it and will review it soon."
          : "Thanks for the feedback. It has been submitted successfully."
      );
      setFormData(initialFormData);
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
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">Feedback</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
              Share a bug, idea, or quick note
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Keep it simple. Tell us what went wrong, what could be better, or anything you want
              us to know while we validate the product with real users.
            </p>
          </div>
          {isAuthenticated ? (
            <Link
              href="/my-feedback"
              className="rounded-2xl bg-slate-100 px-5 py-3 text-center font-medium text-slate-700 transition hover:bg-slate-200"
            >
              View my feedback
            </Link>
          ) : (
            <Link
              href="/books"
              className="rounded-2xl bg-slate-100 px-5 py-3 text-center font-medium text-slate-700 transition hover:bg-slate-200"
            >
              Back to books
            </Link>
          )}
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-teal-100 bg-teal-50/70 p-5 text-sm leading-6 text-slate-700">
          <p className="font-semibold text-slate-900">What to include</p>
          <p className="mt-2">
            Mention the page you were on, what you expected, and what actually happened. Short,
            direct feedback is perfect.
          </p>
        </div>

        <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Type</span>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
            >
              {FEEDBACK_TYPES.map((typeOption) => (
                <option key={typeOption.value} value={typeOption.value}>
                  {typeOption.label}
                </option>
              ))}
            </select>
            <FieldMessage message={fieldErrors.type} />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Message</span>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows={6}
              placeholder="Example: On the request page, the return status was hard to notice and I wasn’t sure what to do next."
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
            />
            <FieldMessage message={fieldErrors.message} />
          </label>

          <input type="hidden" name="page" value={pageValue} readOnly />

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
              {isSubmitting ? "Submitting feedback..." : "Submit feedback"}
            </button>
            {isAuthenticated ? (
              <Link
                href="/my-feedback"
                className="rounded-2xl bg-slate-100 px-5 py-3 text-center font-medium text-slate-700 transition hover:bg-slate-200"
              >
                My feedback
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
        </form>
      </div>
    </section>
  );
}
