import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import AppShell from "../../components/AppShell";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { listMyOfferings } from "../../lib/academicApi";

const maxUploadBytes = 10 * 1024 * 1024;
const acceptedExtensions = [".pdf", ".txt"];
const questionTypes = ["Mixed", "MCQ", "Text", "CSharp", "SQL"];
const difficulties = ["Mixed", "Easy", "Medium", "Hard"];
const languages = ["Auto detect", "English", "Albanian"];
const outputLanguages = ["Same as Source", "English", "Albanian"];

const initialConfig = {
  questionCount: 5,
  questionType: "Mixed",
  difficulty: "Medium",
  sourceLanguage: "Auto detect",
  outputLanguage: "Same as Source",
};

export default function AiMaterialUploadPage() {
  const { user, loading: userLoading, error: userError } = useCurrentUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const [offerings, setOfferings] = useState([]);
  const [loadingOfferings, setLoadingOfferings] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [materialMode, setMaterialMode] = useState("upload");
  const [selectedFile, setSelectedFile] = useState(null);
  const [pastedText, setPastedText] = useState("");
  const [config, setConfig] = useState(initialConfig);
  const [generation, setGeneration] = useState({
    status: "idle",
    label: "Ready for material",
    progress: 0,
  });

  const selectedOfferingId = searchParams.get("offeringId") || "";
  const selectedOffering = useMemo(
    () => offerings.find((offering) => offering.id === selectedOfferingId) || null,
    [offerings, selectedOfferingId],
  );

  const materialSummary = useMemo(() => {
    if (materialMode === "upload" && selectedFile) {
      return {
        label: selectedFile.name,
        detail: `${formatBytes(selectedFile.size)} ${selectedFile.type ? `- ${selectedFile.type}` : ""}`.trim(),
        hasAlbanianCharacters: false,
      };
    }

    const trimmedText = pastedText.trim();
    return {
      label: trimmedText ? `${trimmedText.length} pasted characters` : "No pasted text yet",
      detail: trimmedText ? "Paste source text is ready for generation." : "Paste course material or lecture notes.",
      hasAlbanianCharacters: /[ëËçÇ]/.test(trimmedText),
    };
  }, [materialMode, pastedText, selectedFile]);

  const isGenerating = ["validating", "uploading", "extracting", "generating"].includes(generation.status);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoadingOfferings(true);
        setError("");
        const data = await listMyOfferings();
        if (!active) return;
        const nextOfferings = Array.isArray(data) ? data : [];
        setOfferings(nextOfferings);
        if (!selectedOfferingId && nextOfferings[0]?.id) {
          setSearchParams({ offeringId: nextOfferings[0].id }, { replace: true });
        }
      } catch {
        if (active) setError("Course offerings could not be loaded.");
      } finally {
        if (active) setLoadingOfferings(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [selectedOfferingId, setSearchParams]);

  function updateConfig(field, value) {
    setConfig((current) => ({ ...current, [field]: value }));
    setError("");
    setNotice("");
  }

  function onFileChange(event) {
    const file = event.target.files?.[0] || null;
    setNotice("");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      setSelectedFile(null);
      setError(validationError);
      return;
    }

    setError("");
    setSelectedFile(file);
    setGeneration({ status: "idle", label: "Material validated locally", progress: 0 });
  }

  async function startGeneration({ simulateTimeout = false } = {}) {
    const validationError = validateGenerationRequest();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setNotice("");

    try {
      await runGenerationStage("validating", "Validating material and generation settings...", 18);
      await runGenerationStage("uploading", materialMode === "upload" ? "Preparing upload package..." : "Preparing pasted text...", 38);
      await runGenerationStage("extracting", "Extracting readable source content...", 62);

      if (simulateTimeout) {
        await runGenerationStage("generating", "Waiting for AI service response...", 76);
        setGeneration({
          status: "timeout",
          label: "Generation timed out. Try a smaller material or fewer questions.",
          progress: 76,
        });
        setError("Generation timed out before drafts were returned.");
        return;
      }

      await runGenerationStage("generating", "Generating question drafts for professor review...", 88);
      await runGenerationStage("ready", "Generated drafts are ready for review.", 100);
      setNotice(`${config.questionCount} ${formatQuestionType(config.questionType)} draft question${Number(config.questionCount) === 1 ? "" : "s"} prepared from the selected material.`);
    } catch {
      setGeneration({ status: "error", label: "Generation failed before drafts were created.", progress: generation.progress });
      setError("Generation failed. Check the source material and try again.");
    }
  }

  async function runGenerationStage(status, label, progress) {
    setGeneration({ status, label, progress });
    await wait(450);
  }

  function validateGenerationRequest() {
    if (!selectedOfferingId) return "Select a course offering before generation.";

    const questionCount = Number(config.questionCount);
    if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 50) {
      return "Number of questions must be between 1 and 50.";
    }

    if (materialMode === "upload") {
      if (!selectedFile) return "Upload a PDF or TXT material before generation.";
      return validateFile(selectedFile);
    }

    if (pastedText.trim().length < 120) {
      return "Paste at least 120 characters of source material.";
    }

    return "";
  }

  if (userLoading) {
    return <div className="pageState">Loading AI material workspace...</div>;
  }

  if (!user) {
    return <div className="pageState">{userError || "User context could not be loaded."}</div>;
  }

  return (
    <AppShell
      user={user}
      badge="AI material"
      title="Generate questions from material"
      subtitle="Upload a PDF/TXT or paste source text, then configure safe draft generation for professor review."
      actions={<Link className="btn" to={selectedOfferingId ? `/question-bank?offeringId=${selectedOfferingId}` : "/question-bank"}>Question bank</Link>}
    >
      <div className="stackXl aiMaterialWorkspace">
        {error ? <div className="alert">{error}</div> : null}
        {notice ? <div className="successBanner">{notice}</div> : null}

        <section className="surfaceCard aiMaterialHero">
          <div>
            <span className="summaryLabel">Generation source</span>
            <h3>Material upload and configuration</h3>
            <p>
              This workspace validates source files in the browser and prepares structured generation settings.
              Drafts still go through the review screen before entering the Question Bank.
            </p>
          </div>
          <div className="aiMaterialHeroActions">
            <Link
              className="btn"
              to={`/question-bank/generated-review${selectedOfferingId ? `?offeringId=${selectedOfferingId}` : ""}`}
            >
              Review generated
            </Link>
          </div>
        </section>

        <div className="aiMaterialLayout">
          <section className="surfaceCard">
            <div className="sectionHeader">
              <div>
                <h3>1. Source material</h3>
                <span className="sectionMeta">Use PDF/TXT upload or paste text directly.</span>
              </div>
            </div>

            <div className="sectionBody stackLg">
              <div className="field">
                <label className="label">Course offering</label>
                <select
                  className="input"
                  value={selectedOfferingId}
                  onChange={(event) => setSearchParams(event.target.value ? { offeringId: event.target.value } : {}, { replace: true })}
                  disabled={loadingOfferings || isGenerating}
                >
                  <option value="">Select offering</option>
                  {offerings.map((offering) => (
                    <option key={offering.id} value={offering.id}>
                      {formatOffering(offering)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="aiMaterialModeTabs" role="tablist" aria-label="Material input mode">
                <button
                  className={materialMode === "upload" ? "active" : ""}
                  type="button"
                  onClick={() => setMaterialMode("upload")}
                  disabled={isGenerating}
                >
                  Upload file
                </button>
                <button
                  className={materialMode === "paste" ? "active" : ""}
                  type="button"
                  onClick={() => setMaterialMode("paste")}
                  disabled={isGenerating}
                >
                  Paste text
                </button>
              </div>

              {materialMode === "upload" ? (
                <label className="aiMaterialDropzone">
                  <span>PDF or TXT material</span>
                  <strong>{selectedFile ? selectedFile.name : "Choose source file"}</strong>
                  <small>Maximum 10 MB. Other formats are blocked before generation.</small>
                  <input accept=".pdf,.txt,application/pdf,text/plain" type="file" onChange={onFileChange} disabled={isGenerating} />
                </label>
              ) : (
                <div className="field">
                  <label className="label">Paste course material</label>
                  <textarea
                    className="input textarea"
                    rows={12}
                    value={pastedText}
                    onChange={(event) => {
                      setPastedText(event.target.value);
                      setError("");
                      setNotice("");
                    }}
                    placeholder="Paste lecture notes, textbook excerpt, or assignment context. Albanian characters like ë and ç are supported."
                    disabled={isGenerating}
                  />
                  <span className="small">Minimum 120 characters for generation. Output language defaults to Same as Source.</span>
                </div>
              )}

              <div className="aiMaterialSummary">
                <span className="summaryLabel">Selected source</span>
                <strong>{materialSummary.label}</strong>
                <p>{materialSummary.detail}</p>
                {materialSummary.hasAlbanianCharacters ? <em>Albanian characters detected: e/c diacritics preserved.</em> : null}
              </div>
            </div>
          </section>

          <section className="surfaceCard">
            <div className="sectionHeader">
              <div>
                <h3>2. Generation configuration</h3>
                <span className="sectionMeta">Keep settings explicit so reviewers know what was requested.</span>
              </div>
            </div>

            <div className="sectionBody stackLg">
              <div className="aiConfigGrid">
                <div className="field">
                  <label className="label">Number of questions</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    max="50"
                    value={config.questionCount}
                    onChange={(event) => updateConfig("questionCount", event.target.value)}
                    disabled={isGenerating}
                  />
                </div>
                <div className="field">
                  <label className="label">Question type</label>
                  <select className="input" value={config.questionType} onChange={(event) => updateConfig("questionType", event.target.value)} disabled={isGenerating}>
                    {questionTypes.map((type) => (
                      <option key={type} value={type}>{formatQuestionType(type)}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="label">Difficulty</label>
                  <select className="input" value={config.difficulty} onChange={(event) => updateConfig("difficulty", event.target.value)} disabled={isGenerating}>
                    {difficulties.map((difficulty) => (
                      <option key={difficulty} value={difficulty}>{difficulty}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="label">Source language</label>
                  <select className="input" value={config.sourceLanguage} onChange={(event) => updateConfig("sourceLanguage", event.target.value)} disabled={isGenerating}>
                    {languages.map((language) => (
                      <option key={language} value={language}>{language}</option>
                    ))}
                  </select>
                </div>
                <div className="field fieldSpanFull">
                  <label className="label">Output language</label>
                  <select className="input" value={config.outputLanguage} onChange={(event) => updateConfig("outputLanguage", event.target.value)} disabled={isGenerating}>
                    {outputLanguages.map((language) => (
                      <option key={language} value={language}>{language}</option>
                    ))}
                  </select>
                  <span className="small">Default is Same as Source to preserve Albanian/English material language.</span>
                </div>
              </div>

              <div className={`aiProgressPanel ${generation.status}`}>
                <div className="aiProgressHeader">
                  <div>
                    <span className="summaryLabel">Generation status</span>
                    <strong>{generation.label}</strong>
                  </div>
                  <span>{generation.progress}%</span>
                </div>
                <div className="aiProgressTrack" aria-label="Generation progress">
                  <span style={{ width: `${generation.progress}%` }} />
                </div>
                <p>
                  {selectedOffering ? formatOffering(selectedOffering) : "No offering selected"} - {config.questionCount} questions,
                  {" "}{formatQuestionType(config.questionType)}, {config.difficulty}, output {config.outputLanguage}.
                </p>
              </div>

              <div className="aiMaterialActions">
                <button className="btn btnPrimary" type="button" onClick={() => startGeneration()} disabled={isGenerating}>
                  {isGenerating ? "Generating..." : "Generate drafts"}
                </button>
                <button className="btn" type="button" onClick={() => startGeneration({ simulateTimeout: true })} disabled={isGenerating}>
                  Test timeout state
                </button>
                <Link
                  className={`btn ${generation.status === "ready" ? "" : "btnDisabled"}`}
                  to={`/question-bank/generated-review${selectedOfferingId ? `?offeringId=${selectedOfferingId}` : ""}`}
                  aria-disabled={generation.status !== "ready"}
                >
                  Open review
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function validateFile(file) {
  const name = file.name.toLowerCase();
  const hasAcceptedExtension = acceptedExtensions.some((extension) => name.endsWith(extension));
  const hasAcceptedMime = ["application/pdf", "text/plain", ""].includes(file.type);

  if (!hasAcceptedExtension || !hasAcceptedMime) {
    return "Invalid file. Upload only PDF or TXT material.";
  }

  if (file.size > maxUploadBytes) {
    return "File is too large. Maximum allowed size is 10 MB.";
  }

  return "";
}

function wait(durationMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

function formatOffering(offering) {
  const code = offering.course?.code || "";
  const name = offering.course?.name || "";
  const term = offering.term?.code || offering.term?.name || "";
  const section = offering.sectionCode || "-";
  return [code && name ? `${code} - ${name}` : code || name, term, `Section ${section}`].filter(Boolean).join(" | ");
}

function formatQuestionType(type) {
  if (type === "CSharp") return "C#";
  return type || "-";
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
