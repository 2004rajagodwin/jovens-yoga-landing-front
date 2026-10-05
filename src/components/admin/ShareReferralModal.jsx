import { useEffect, useState } from "react";
import { showToast } from "./toast.js";

export default function ShareReferralModal({ referral, onClose }) {
  const [copied, setCopied] = useState(false);

  // Prevent background page scrolling & listen for Escape key
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!referral) return null;

  // Resolve dynamic URL with trailing slash stripped
  const fallbackOrigin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin.replace(/\/+$/, "")
      : "";
  const referralUrl =
    referral.referralLink || `${fallbackOrigin}/?ref=${referral.referralCode}`;

  // Standardized sharing text
  const shareText = `Join Jovens Yoga and start your yoga journey with us! Register using my referral link: ${referralUrl}`;

  function handleCopy() {
    if (!navigator?.clipboard?.writeText) {
      showToast("Clipboard access is not available. Please copy manually.", "error");
      return;
    }
    navigator.clipboard.writeText(referralUrl).then(
      () => {
        setCopied(true);
        showToast("Referral link copied to clipboard!", "success");
        setTimeout(() => setCopied(false), 2500);
      },
      () => {
        showToast("Failed to copy link. Please copy manually.", "error");
      }
    );
  }

  function handleNativeShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator
        .share({
          title: "Join Jovens Yoga",
          text: `Join Jovens Yoga and start your yoga journey with us! Register using ${referral.referralPersonName}'s referral link:`,
          url: referralUrl,
        })
        .catch((err) => {
          // Ignore normal user dismissal of the share sheet
          if (err && err.name !== "AbortError") {
            showToast("Sharing was cancelled or not supported.", "info");
          }
        });
    } else {
      // Graceful fallback when Web Share API is not supported in the current environment
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(referralUrl).then(
          () => {
            setCopied(true);
            showToast(
              "Device sharing is not supported on this browser. Link copied to clipboard!",
              "success"
            );
            setTimeout(() => setCopied(false), 2500);
          },
          () => {
            showToast("Device sharing is not supported. Please copy the link manually.", "error");
          }
        );
      } else {
        showToast("Device sharing is not supported. Please copy the link manually.", "error");
      }
    }
  }

  // Row 1: WhatsApp & Facebook, Row 2: Telegram & Email
  const shareOptions = [
    {
      name: "WhatsApp",
      icon: "bi-whatsapp",
      color: "#25D366",
      bg: "#eafaf1",
      border: "#b9edd0",
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`,
    },
    {
      name: "Facebook",
      icon: "bi-facebook",
      color: "#1877F2",
      bg: "#eaf2fe",
      border: "#bdd4fd",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}`,
    },
    {
      name: "Telegram",
      icon: "bi-telegram",
      color: "#229ED9",
      bg: "#e8f6fc",
      border: "#bce4f7",
      url: `https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(
        "Join Jovens Yoga and start your yoga journey with us! Register using my referral link:"
      )}`,
    },
    {
      name: "Email",
      icon: "bi-envelope-fill",
      color: "#ea4335",
      bg: "#fdeeed",
      border: "#f9ccc7",
      url: `mailto:?subject=${encodeURIComponent(
        "Join Jovens Yoga - Invitation"
      )}&body=${encodeURIComponent(shareText)}`,
    },
  ];

  return (
    <div
      className="jy-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div
        className="jy-modal"
        style={{ maxWidth: 560 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="jy-modal-header">
          <div style={{ minWidth: 0 }}>
            <div className="d-flex align-items-center gap-2">
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "#eaefff",
                  color: "var(--jy-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                <i className="bi bi-share-fill"></i>
              </div>
              <h2 id="share-modal-title" className="jy-modal-title">
                Share Referral Link
              </h2>
            </div>
            <div className="jy-modal-subtitle">
              <span>
                Referral for:{" "}
                <strong style={{ color: "var(--jy-text)", fontWeight: 600 }}>
                  {referral.referralPersonName}
                </strong>
              </span>
              <span style={{ color: "#c0c6d4" }}>•</span>
              <span>
                Code:{" "}
                <span
                  style={{
                    fontFamily: "monospace",
                    fontWeight: 700,
                    background: "#f0f4ff",
                    color: "var(--jy-primary)",
                    padding: "2px 7px",
                    borderRadius: 5,
                    fontSize: 12.5,
                  }}
                >
                  {referral.referralCode}
                </span>
              </span>
            </div>
          </div>

          <button
            type="button"
            className="jy-icon-btn"
            onClick={onClose}
            aria-label="Close"
            title="Close (Esc)"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: "1px solid var(--jy-border)",
              background: "#f8f9fc",
              color: "var(--jy-text)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              flexShrink: 0,
              marginLeft: 16,
            }}
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* Modal Body */}
        <div className="jy-modal-body" style={{ padding: "24px 24px 20px" }}>
          {/* Referral Link Row: Label, Input, Copy button on same row for desktop */}
          <div className="jy-share-link-group inline-desktop">
            <label htmlFor="share-referral-input" className="jy-share-link-label">
              Referral Link
            </label>
            <div className="jy-share-input-wrapper">
              <input
                id="share-referral-input"
                type="text"
                readOnly
                value={referralUrl}
                className="jy-share-url-input"
                onClick={(e) => e.target.select()}
                aria-label="Referral Link URL"
              />
              <button
                type="button"
                className={`jy-btn ${
                  copied ? "jy-btn-success" : "jy-btn-primary"
                } jy-share-copy-btn`}
                onClick={handleCopy}
                aria-label={copied ? "Referral link copied" : "Copy referral link"}
              >
                <i className={`bi ${copied ? "bi-check2" : "bi-clipboard"} me-1`}></i>
                <span>{copied ? "Copied!" : "Copy"}</span>
              </button>
            </div>
          </div>

          {/* Social Sharing Section */}
          <label
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--jy-text, #172033)",
              marginBottom: 10,
              display: "block",
            }}
          >
            Share directly on Social Media
          </label>

          <div className="jy-share-grid">
            {shareOptions.map((opt) => (
              <a
                key={opt.name}
                href={opt.url}
                target="_blank"
                rel="noopener noreferrer"
                className="jy-share-btn"
                style={{
                  background: opt.bg,
                  borderColor: opt.border,
                  color: opt.color,
                }}
                aria-label={`Share referral link on ${opt.name}`}
              >
                <i className={`bi ${opt.icon}`}></i>
                <span>{opt.name}</span>
              </a>
            ))}
          </div>

          {/* Share via Device Button */}
          <button
            type="button"
            className="jy-share-device-btn"
            onClick={handleNativeShare}
            aria-label="Share referral link via device"
          >
            <i className="bi bi-share"></i>
            <span>Share via Device</span>
          </button>
        </div>

        {/* Modal Footer */}
        <div className="jy-modal-footer" style={{ justifyContent: "flex-end" }}>
          <button
            type="button"
            className="jy-btn jy-btn-outline"
            onClick={onClose}
            style={{ minWidth: 90 }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
