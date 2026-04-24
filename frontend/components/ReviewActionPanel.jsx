"use client";

import { useMemo, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { ReviewModal } from "@/components/ReviewModal";
import { apiRequest } from "@/lib/api";
import { renderStars } from "@/lib/reviews";

export function ReviewActionPanel({
  requestId,
  revieweeName,
  existingReview,
  onReviewCreated
}) {
  const { token } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const reviewSummary = useMemo(() => {
    if (!existingReview) {
      return null;
    }

    return {
      stars: renderStars(existingReview.rating),
      comment: existingReview.comment || ""
    };
  }, [existingReview]);

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }

    setIsModalOpen(false);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleSubmit = async ({ rating, comment }) => {
    if (!token) {
      setErrorMessage("Please log in again before submitting a review.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const data = await apiRequest("/reviews", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          requestId,
          rating,
          comment: comment.trim()
        })
      });

      setSuccessMessage(data.message || "Review submitted successfully.");
      onReviewCreated?.(data.review);
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMessage("");
      }, 700);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (existingReview) {
    return (
      <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <p className="font-semibold">Review submitted</p>
        <p className="mt-1 text-base">{reviewSummary?.stars} <span className="text-sm font-medium">{existingReview.rating}/5</span></p>
        {reviewSummary?.comment ? <p className="mt-2 leading-6">{reviewSummary.comment}</p> : null}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="ui-btn-dark w-full px-4 py-2"
      >
        Leave Review
      </button>

      <ReviewModal
        isOpen={isModalOpen}
        revieweeName={revieweeName}
        isSubmitting={isSubmitting}
        errorMessage={errorMessage}
        successMessage={successMessage}
        onClose={handleClose}
        onSubmit={handleSubmit}
      />
    </>
  );
}
