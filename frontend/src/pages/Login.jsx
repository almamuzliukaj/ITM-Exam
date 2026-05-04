import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { login } from "../lib/auth";

export default function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const presets = [
    { label: t("login.presets.admin"), email: "admin@onlineexam.com", password: "Password123!" },
    { label: t("login.presets.professor"), email: "prof@onlineexam.com", password: "Password123!" },
    { label: t("login.presets.student"), email: "student@onlineexam.com", password: "Password123!" },
  ];

  const [email, setEmail] = useState("admin@onlineexam.com");
  const [password, setPassword] = useState("Password123!");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      const apiMessage =
        err?.response?.data?.message ||
        err?.response?.data ||
        err?.message ||
        t("login.loginFailed");
      setError(String(apiMessage));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="loginShell">
      <div className="loginBackdrop" />
      <div className="loginContent">
        <section className="loginIntro">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
            <div className="eyebrow">{t("common.examOperationsPlatform")}</div>
            <LanguageSwitcher />
          </div>
          <h1 className="loginTitle">{t("login.title")}</h1>
          <p className="loginText">{t("login.text")}</p>
          <div className="loginFeatureGrid">
            <article className="featureTile">
              <strong>{t("login.features.adminTitle")}</strong>
              <span>{t("login.features.adminText")}</span>
            </article>
            <article className="featureTile">
              <strong>{t("login.features.teachingTitle")}</strong>
              <span>{t("login.features.teachingText")}</span>
            </article>
            <article className="featureTile">
              <strong>{t("login.features.studentTitle")}</strong>
              <span>{t("login.features.studentText")}</span>
            </article>
          </div>
        </section>

        <section className="loginPanel">
          <div className="brand brandLarge">
            <img className="brandLogo brandLogoIcon" src="/app-logo.svg" alt="ITM Exam" />
            <span className="brandCaption">
              <strong>{t("common.appName")}</strong>
              <small>{t("common.departmentWorkspace")}</small>
            </span>
          </div>

          <div className="stackLg">
            <div>
              <h2 className="panelTitle">{t("login.signIn")}</h2>
              <p className="panelText">{t("login.signInText")}</p>
            </div>

            <div className="presetRow">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className="presetChip"
                  onClick={() => {
                    setEmail(preset.email);
                    setPassword(preset.password);
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <form className="stackLg" onSubmit={onSubmit}>
              {error ? <div className="alert">{error}</div> : null}

              <div className="field">
                <label className="label">{t("login.emailLabel")}</label>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("login.emailPlaceholder")}
                  autoComplete="email"
                  disabled={loading}
                  required
                />
              </div>

              <div className="field">
                <label className="label">{t("login.passwordLabel")}</label>
                <div className="inputWrap">
                  <input
                    className="input"
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("login.passwordPlaceholder")}
                    autoComplete="current-password"
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    className="btn inputRightBtn"
                    onClick={() => setShow((value) => !value)}
                    disabled={loading}
                  >
                    {show ? t("login.hide") : t("login.show")}
                  </button>
                </div>
              </div>

              <button className="btn btnPrimary btnBlock" type="submit" disabled={loading}>
                {loading ? t("login.signingIn") : t("common.enterWorkspace")}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
