"use client";

import { useEffect, useRef, useState } from "react";

const SCAN_TIMEOUT_MS = 15000;

export function BarcodeScannerPanel({ onDetected, onError, isLookupInProgress }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const controlsRef = useRef(null);
  const scanTimeoutRef = useRef(null);
  const hasDetectedRef = useRef(false);

  const [isStarting, setIsStarting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerMessage, setScannerMessage] = useState(
    "Start the camera and point it at the barcode on the back of the book."
  );

  const clearScanTimeout = () => {
    if (scanTimeoutRef.current) {
      window.clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
  };

  const stopScanner = () => {
    clearScanTimeout();

    if (controlsRef.current) {
      try {
        controlsRef.current.stop();
      } catch (error) {
        console.error("Failed to stop barcode scanner controls cleanly.", error);
      }

      controlsRef.current = null;
    }

    const videoElement = videoRef.current;
    const mediaStream = videoElement?.srcObject;

    if (mediaStream && typeof mediaStream.getTracks === "function") {
      mediaStream.getTracks().forEach((track) => track.stop());
    }

    if (videoElement) {
      videoElement.srcObject = null;
    }

    setIsScanning(false);
    setIsStarting(false);
  };

  useEffect(() => stopScanner, []);

  const startScanner = async () => {
    setScannerMessage("Requesting camera access...");
    setIsStarting(true);
    hasDetectedRef.current = false;
    clearScanTimeout();
    onError("");

    try {
      if (!readerRef.current) {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        readerRef.current = new BrowserMultiFormatReader();
      }

      controlsRef.current = await readerRef.current.decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: "environment" }
          }
        },
        videoRef.current,
        (result, error) => {
          if (result && !hasDetectedRef.current) {
            hasDetectedRef.current = true;
            setScannerMessage("Barcode detected. Looking up the book details...");
            const scannedValue = result.getText();
            try {
              stopScanner();
            } catch (stopError) {
              console.error("Scanner cleanup failed after detection.", stopError);
            }
            Promise.resolve(onDetected(scannedValue)).catch((detectedError) => {
              const nextMessage =
                detectedError?.message ||
                "The barcode was detected, but the lookup could not be completed.";
              setScannerMessage(nextMessage);
              onError(nextMessage);
            });
            return;
          }

          if (error && error.name !== "NotFoundException") {
            setScannerMessage("The camera is active, but the barcode could not be read clearly yet.");
          }
        }
      );

      setIsScanning(true);
      setIsStarting(false);
      setScannerMessage("Camera is live. Hold the barcode steady inside the frame.");

      scanTimeoutRef.current = window.setTimeout(() => {
        if (!hasDetectedRef.current) {
          setScannerMessage("No barcode found yet. Try adjusting the distance, lighting, or angle.");
        }
      }, SCAN_TIMEOUT_MS);
    } catch (error) {
      stopScanner();

      if (error?.name === "NotAllowedError") {
        onError("Camera permission was denied. Please allow access or use Manual or ISBN Lookup instead.");
        return;
      }

      if (error?.name === "NotFoundError") {
        onError("No camera was found on this device. You can continue with Manual or ISBN Lookup.");
        return;
      }

      onError("Unable to start barcode scanning on this device right now.");
    }
  };

  const handleRetry = () => {
    stopScanner();
    startScanner();
  };

  return (
    <div className="add-book-scanner-panel mt-4 rounded-[1.5rem] border border-sky-100 bg-sky-50/70 p-4 sm:mt-5 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          onClick={startScanner}
          disabled={isStarting || isScanning || isLookupInProgress}
          className="ui-btn-primary"
        >
          {isStarting ? "Starting camera..." : isScanning ? "Camera active" : "Start scanning"}
        </button>
        <button
          type="button"
          onClick={handleRetry}
          disabled={isStarting || isLookupInProgress}
          className="ui-btn-light disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        >
          Retry scan
        </button>
        {isScanning ? (
          <button
            type="button"
            onClick={stopScanner}
            className="ui-btn-secondary"
          >
            Stop camera
          </button>
        ) : null}
      </div>

      <p className="mt-3.5 text-sm leading-6 text-slate-600">{scannerMessage}</p>

      <div className="mt-3.5 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-950 shadow-[0_18px_42px_rgba(15,23,42,0.18)]">
        <div className="relative aspect-[4/3] w-full">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
            <div className="h-40 w-full max-w-xs rounded-[1.5rem] border-2 border-white/80 shadow-[0_0_0_9999px_rgba(15,23,42,0.2)]" />
          </div>
        </div>
      </div>

      <p className="mt-2.5 text-xs leading-5 text-slate-500">
        Tip: most books use an EAN-13 barcode that maps directly to the ISBN used by the existing autofill route.
      </p>
    </div>
  );
}
