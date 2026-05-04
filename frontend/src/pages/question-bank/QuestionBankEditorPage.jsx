import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import AppShell from "../../components/AppShell";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { listMyOfferings } from "../../lib/academicApi";
import {
  createQuestionBankQuestion,
  getQuestionBankQuestion,
  updateQuestionBankQuestion,
} from "../../lib/questionBankApi";

const EMPTY_FORM = {
  offeringId: "",
  text: "",
  type: "MCQ",
  difficulty: "Medium",
  points: 10,
  correctAnswer: "",
  options: ["", ""],
};

export default function QuestionBankEditorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { questionId } = useParams();
  const [searchParams] = useSearchParams();
  const { user, loading: userLoading, error: userError } = useCurrentUser();
  const [offerings, setOfferings] = useState([]);
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    offeringId: searchParams.get("offeringId") || "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEdit = Boolean(questionId);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError("");
        const offeringData = await listMyOfferings();
        if (!active) return;

        const nextOfferings = Array.isArray(offeringData) ? offeringData : [];
        setOfferings(nextOfferings);

        if (isEdit && questionId) {
          const question = await getQuestionBankQuestion(questionId);
          if (!active) return;

          setForm({
            offeringId: question.courseOfferingId,
            text: question.text || "",
            type: question.type || "MCQ",
            difficulty: question.difficulty || "Medium",
            points: Number(question.points) || 10,
            correctAnswer: question.correctAnswer || "",
            options: Array.isArray(question.options) && question.options.length > 0 ? question.options : ["", ""],
          });
        } else if (!searchParams.get("offeringId") && nextOfferings[0]?.id) {
          setForm((current) => ({ ...current, offeringId: current.offeringId || nextOfferings[0].id }));
        }
      } catch {
        if (active) setError(isEdit ? t("questionBank.editor.loadQuestionError") : t("questionBank.editor.loadContextError"));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [isEdit, questionId, searchParams, t]);

  const selectedOffering = useMemo(
    () => offerings.find((offering) => offering.id === form.offeringId) || null,
    [form.offeringId, offerings]
  );

  function updateOption(index, value) {
    setForm((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) => (optionIndex === index ? value : option)),
    }));
  }

  function addOption() {
    setForm((current) => ({ ...current, options: [...current.options, ""] }));
  }

  function removeOption(index) {
    setForm((current) => ({
      ...current,
      options: current.options.filter((_, optionIndex) => optionIndex !== index),
    }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.offeringId) return;

    try {
      setSaving(true);
      setError("");

      const payload = {
        text: form.text.trim(),
        type: form.type,
        difficulty: form.difficulty || null,
        points: Number(form.points) || 0,
        correctAnswer: form.correctAnswer.trim(),
        options: form.type === "MCQ" ? form.options : [],
      };

      if (isEdit && questionId) {
        await updateQuestionBankQuestion(questionId, payload);
      } else {
        await createQuestionBankQuestion(form.offeringId, payload);
      }

      navigate(`/question-bank?offeringId=${form.offeringId}`);
    } catch (err) {
      const apiMessage =
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        err?.message;

      setError(apiMessage || t("questionBank.editor.saveError"));
    } finally {
      setSaving(false);
    }
  }

  if (userLoading || loading) {
    return <div className="pageState">{t("questionBank.editor.loading")}</div>;
  }

  if (!user) {
    return <div className="pageState">{userError || t("questionBank.userError")}</div>;
  }

  return (
    <AppShell
      user={user}
      badge={t("questionBank.badge")}
      title={isEdit ? t("questionBank.editor.editTitle") : t("questionBank.editor.createTitle")}
      subtitle={selectedOffering ? t("questionBank.editor.subtitle", { offering: formatOffering(selectedOffering) }) : t("questionBank.editor.subtitleEmpty")}
      actions={<Link className="btn" to={form.offeringId ? `/question-bank?offeringId=${form.offeringId}` : "/question-bank"}>{t("questionBank.editor.back")}</Link>}
    >
      <section className="formSurface">
        <div className="surfaceCard">
          <div className="sectionHeader">
            <h3>{t("questionBank.editor.sectionTitle")}</h3>
          </div>
          <div className="sectionBody">
            {error ? <div className="alert">{error}</div> : null}

            <form className="stackLg" onSubmit={onSubmit}>
              <div className="field">
                <label className="label">{t("questionBank.offering")}</label>
                <select
                  className="input"
                  value={form.offeringId}
                  onChange={(e) => setForm((current) => ({ ...current, offeringId: e.target.value }))}
                  disabled={saving || isEdit}
                >
                  <option value="">{t("questionBank.selectOffering")}</option>
                  {offerings.map((offering) => (
                    <option key={offering.id} value={offering.id}>
                      {formatOffering(offering)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="label">{t("questionBank.editor.prompt")}</label>
                <textarea
                  className="input textarea"
                  value={form.text}
                  onChange={(e) => setForm((current) => ({ ...current, text: e.target.value }))}
                  rows={6}
                  disabled={saving}
                  placeholder={t("questionBank.editor.promptPlaceholder")}
                />
              </div>

              <div className="questionBankFormGrid">
                <div className="field">
                  <label className="label">{t("questionBank.type")}</label>
                  <select
                    className="input"
                    value={form.type}
                    onChange={(e) => setForm((current) => ({ ...current, type: e.target.value }))}
                    disabled={saving}
                  >
                    <option value="MCQ">MCQ</option>
                    <option value="Text">{t("common.text")}</option>
                  </select>
                </div>

                <div className="field">
                  <label className="label">{t("questionBank.difficulty")}</label>
                  <select
                    className="input"
                    value={form.difficulty}
                    onChange={(e) => setForm((current) => ({ ...current, difficulty: e.target.value }))}
                    disabled={saving}
                  >
                    <option value="Easy">{t("questionBank.difficulties.easy")}</option>
                    <option value="Medium">{t("questionBank.difficulties.medium")}</option>
                    <option value="Hard">{t("questionBank.difficulties.hard")}</option>
                  </select>
                </div>

                <div className="field">
                  <label className="label">{t("questionBank.editor.points")}</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    value={form.points}
                    onChange={(e) => setForm((current) => ({ ...current, points: Number(e.target.value) }))}
                    disabled={saving}
                  />
                </div>
              </div>

              {form.type === "MCQ" ? (
                <div className="stackLg">
                  <div className="sectionHeader sectionHeaderInline">
                    <h3>{t("questionBank.editor.options")}</h3>
                    <button className="btn" type="button" onClick={addOption} disabled={saving}>
                      {t("questionBank.editor.addOption")}
                    </button>
                  </div>

                  <div className="stackLg">
                    {form.options.map((option, index) => (
                      <div className="row questionBankOptionRow" key={`${index}-${option}`}>
                        <input
                          className="input"
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          disabled={saving}
                          placeholder={t("questionBank.editor.optionPlaceholder", { index: index + 1 })}
                        />
                        <button
                          className="btn btnGhost"
                          type="button"
                          onClick={() => removeOption(index)}
                          disabled={saving || form.options.length <= 2}
                        >
                          {t("questionBank.editor.remove")}
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="field">
                    <label className="label">{t("questionBank.editor.correctAnswer")}</label>
                    <select
                      className="input"
                      value={form.correctAnswer}
                      onChange={(e) => setForm((current) => ({ ...current, correctAnswer: e.target.value }))}
                      disabled={saving}
                    >
                      <option value="">{t("questionBank.editor.selectCorrectAnswer")}</option>
                      {form.options
                        .map((option) => option.trim())
                        .filter(Boolean)
                        .map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="field">
                  <label className="label">{t("questionBank.modelAnswer")}</label>
                  <textarea
                    className="input textarea"
                    value={form.correctAnswer}
                    onChange={(e) => setForm((current) => ({ ...current, correctAnswer: e.target.value }))}
                    rows={4}
                    disabled={saving}
                    placeholder={t("questionBank.editor.modelAnswerPlaceholder")}
                  />
                </div>
              )}

              <div className="row" style={{ justifyContent: "flex-end" }}>
                <button className="btn btnPrimary" type="submit" disabled={saving || !form.offeringId || !form.text.trim()}>
                  {saving ? t("questionBank.editor.saving") : t("questionBank.editor.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function formatOffering(offering) {
  const code = offering.course?.code || "";
  const name = offering.course?.name || "";
  const term = offering.term?.code || offering.term?.name || "";
  const section = offering.sectionCode || "-";
  return [code && name ? `${code} - ${name}` : code || name, term, `Section ${section}`].filter(Boolean).join(" | ");
}
