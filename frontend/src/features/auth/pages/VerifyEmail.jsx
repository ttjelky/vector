import React, { useState, useEffect } from "react";
import styles from "../styles/registerPage.module.css";
import { verifyEmail, resendCode, setAccessToken, setUserRole } from "@api";

/**
 * Крок підтвердження пошти 6-значним кодом.
 * Props: email, onVerified({access, role...}), onBack
 */
const VerifyEmail = ({ email, onVerified, onBack }) => {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [resending, setResending] = useState(false);
  const [info, setInfo] = useState("");

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const handleVerify = async (e) => {
    e?.preventDefault();
    setError("");
    setInfo("");
    if (code.trim().length !== 6) {
      setError("Введіть 6-значний код з листа.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await verifyEmail({ email, code: code.trim() });
      const { access, role = "participant", first_name, last_name } = data;
      if (access) setAccessToken(access);
      setUserRole(role);
      localStorage.setItem("userRole", role);
      localStorage.setItem(
        "fullUserName",
        `${first_name || ""} ${last_name || ""}`.trim()
      );
      window.dispatchEvent(new Event("auth-changed"));
      onVerified?.(data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.non_field_errors?.[0] ||
          "Невірний код. Спробуйте ще раз."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || resending) return;
    setResending(true);
    setError("");
    setInfo("");
    try {
      await resendCode(email);
      setInfo("Новий код надіслано на пошту.");
      setResendTimer(60);
    } catch (err) {
      setError(err.response?.data?.detail || "Не вдалось надіслати код.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepMeta}>
        <span className={styles.stepNum}>Крок 3 з 3</span>
        <h2 className={styles.stepTitle}>Підтвердіть пошту</h2>
        <p className={styles.stepSub}>
          Ми надіслали 6-значний код на <strong>{email}</strong>. Введіть його нижче.
          Код дійсний 15 хвилин.
        </p>
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel}>Код з листа</label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          className={styles.input}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
            setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && handleVerify(e)}
          autoFocus
          style={{ letterSpacing: 6, textAlign: "center", fontSize: 20, fontWeight: 700 }}
        />
      </div>

      {error && <p className={styles.errorText}>{error}</p>}
      {info && <p style={{ color: "#15803d", fontSize: 12 }}>{info}</p>}

      <div style={{ fontSize: 13, color: "#666" }}>
        {resendTimer > 0 ? (
          <span>Надіслати код повторно можна через {resendTimer} сек</span>
        ) : (
          <span>
            Не прийшов лист?{" "}
            <a
              onClick={handleResend}
              style={{ cursor: "pointer", fontWeight: 700, color: "#111" }}
            >
              {resending ? "Надсилання…" : "Надіслати ще раз"}
            </a>
          </span>
        )}
      </div>
    </div>
  );
};

export { VerifyEmail };
