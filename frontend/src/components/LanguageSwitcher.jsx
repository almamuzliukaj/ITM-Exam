import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export default function LanguageSwitcher({ compact = false }) {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);
  const options = [
    { value: "en", label: t("common.english") },
    { value: "sq", label: t("common.albanian") },
  ];
  const current = options.find((option) => option.value === i18n.language) || options[0];

  useEffect(() => {
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={rootRef} className={`languageSwitcher${compact ? " languageSwitcherCompact" : ""}`}>
      {!compact ? <label className="languageSwitcherLabel">{t("common.language")}</label> : null}
      <div className="languageSwitcherControl">
        <button
          type="button"
          className={`input languageSwitcherSelect languageSwitcherButton${isOpen ? " languageSwitcherButtonOpen" : ""}`}
          aria-label={t("common.language")}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((currentValue) => !currentValue)}
        >
          <span className="languageSwitcherValue">{current.label}</span>
          <span className={`languageSwitcherChevron${isOpen ? " languageSwitcherChevronOpen" : ""}`} aria-hidden="true" />
        </button>
        {isOpen ? (
          <div className="languageSwitcherMenu" role="listbox" aria-label={t("common.language")}>
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === current.value}
                className={`languageSwitcherOption${option.value === current.value ? " languageSwitcherOptionActive" : ""}`}
                onClick={() => {
                  i18n.changeLanguage(option.value);
                  setIsOpen(false);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
