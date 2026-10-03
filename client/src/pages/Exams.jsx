import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Alert, LevelBadge, PageHeader, StatStrip } from "../components/PageHeader";

export default function Exams() {
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission("exams:update");
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [board, setBoard] = useState([]);
  const [classInfo, setClassInfo] = useState(null);
  const [summary, setSummary] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [savingAll, setSavingAll] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .getClasses()
      .then((data) => {
        setClasses(data.classes);
        if (data.classes[0]) setClassId(data.classes[0].id);
      })
      .catch((err) => setError(err.message));
  }, []);

  async function loadBoard(cid = classId) {
    if (!cid) return;
    setLoading(true);
    try {
      const data = await api.getExamBoard(cid);
      setBoard(data.board);
      setClassInfo(data.class);
      setSummary(data.summary);
      setProgress(data.progress || null);
      const next = {};
      for (const s of data.board) {
        next[s.id] = {
          paper: s.paperScore ?? "",
          practical: s.practicalScore ?? "",
        };
      }
      setDrafts(next);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!classId) return;
    loadBoard(classId).catch((err) => setError(err.message));
  }, [classId]);

  function setDraft(studentId, field, value) {
    setDrafts((d) => ({
      ...d,
      [studentId]: { ...d[studentId], [field]: value },
    }));
  }

  const dirtyCount = useMemo(() => {
    return board.filter((s) => {
      const d = drafts[s.id] || {};
      const paper = d.paper === "" ? null : Number(d.paper);
      const prac = d.practical === "" ? null : Number(d.practical);
      const savedP = s.paperScore;
      const savedPr = s.practicalScore;
      return paper !== savedP || prac !== savedPr;
    }).length;
  }, [board, drafts]);

  async function saveStudent(s) {
    if (!canUpdate) return;
    const draft = drafts[s.id] || {};
    if (draft.paper === "" || draft.practical === "") {
      setError("Enter both Paper (0–40) and Practical (0–60) before saving.");
      return;
    }
    setSavingId(s.id);
    setError("");
    setOkMsg("");
    try {
      await api.saveBookExamMarks({
        studentId: s.id,
        paperScore: Number(draft.paper),
        practicalScore: Number(draft.practical),
      });
      await loadBoard();
      setOkMsg(`Saved marks for ${s.name}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  async function saveAllDirty() {
    if (!canUpdate) return;
    const targets = board.filter((s) => {
      const d = drafts[s.id] || {};
      if (d.paper === "" || d.practical === "") return false;
      const paper = Number(d.paper);
      const prac = Number(d.practical);
      return paper !== s.paperScore || prac !== s.practicalScore;
    });
    if (!targets.length) {
      setError("No complete mark rows to save.");
      return;
    }
    setSavingAll(true);
    setError("");
    setOkMsg("");
    try {
      for (const s of targets) {
        const d = drafts[s.id];
        await api.saveBookExamMarks({
          studentId: s.id,
          paperScore: Number(d.paper),
          practicalScore: Number(d.practical),
        });
      }
      await loadBoard();
      setOkMsg(`Saved marks for ${targets.length} student(s).`);
    } catch (err) {
      setError(err.message);
      await loadBoard().catch(() => {});
    } finally {
      setSavingAll(false);
    }
  }

  async function advanceClass() {
    if (!canUpdate || !classId) return;
    if (
      !confirm(
        `Advance entire class to Level ${progress?.nextLevel}: ${progress?.nextBookTitle}?`
      )
    ) {
      return;
    }
    setAdvancing(true);
    setError("");
    setOkMsg("");
    try {
      const res = await api.advanceClassLevel(classId);
      await loadBoard();
      setOkMsg(
        `Class advanced to Level ${res.level.currentLevel}: ${res.level.currentBookTitle}`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setAdvancing(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exams"
        description="Class-shared Computer book. Enter Paper/40 + Practical/60 for every student, then advance the whole class together."
        actions={
          <>
            <button
              type="button"
              onClick={() => loadBoard().catch((e) => setError(e.message))}
              className="rounded-md border border-moss/20 bg-white px-4 py-2 text-sm font-medium hover:bg-fog"
            >
              Refresh
            </button>
            {canUpdate && (
              <button
                type="button"
                disabled={savingAll || dirtyCount === 0}
                onClick={saveAllDirty}
                className="rounded-md bg-leaf text-white px-4 py-2 text-sm font-semibold hover:bg-moss disabled:opacity-40"
              >
                {savingAll ? "Saving…" : `Save all (${dirtyCount})`}
              </button>
            )}
          </>
        }
      />

      {error && <Alert>{error}</Alert>}
      {okMsg && <Alert tone="success">{okMsg}</Alert>}

      <label className="block space-y-1 max-w-md">
        <span className="text-xs font-medium text-ink/60">Class</span>
        <select
          value={classId}
          onChange={(e) => {
            setClassId(e.target.value);
            setOkMsg("");
            setError("");
          }}
          className="w-full rounded-md border border-moss/20 px-3 py-2.5 bg-white"
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.className} ({c.classCode})
            </option>
          ))}
        </select>
      </label>

      {summary && classInfo && (
        <>
          <div className="rounded-xl border border-moss/15 bg-white/90 p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-ink/45 font-semibold">
                Current class book
              </p>
              <LevelBadge
                level={classInfo.currentLevel}
                bookTitle={classInfo.currentBookTitle}
              />
              <p className="text-sm text-ink/55">{classInfo.className}</p>
            </div>
            {canUpdate && (
              <button
                type="button"
                disabled={advancing || !progress?.eligibleForProgress}
                onClick={advanceClass}
                className="rounded-md bg-moss text-white px-5 py-2.5 font-semibold hover:bg-leaf disabled:opacity-40"
              >
                {advancing
                  ? "Advancing…"
                  : progress?.eligibleForProgress
                    ? `Advance class → Level ${progress.nextLevel}`
                    : "Advance (mark all students first)"}
              </button>
            )}
          </div>

          <StatStrip
            items={[
              { label: "Students", value: summary.students },
              {
                label: "Marked",
                value: `${progress?.markedCount ?? 0}/${summary.students}`,
                hint: "Paper + Practical saved",
              },
              {
                label: "Average",
                value: summary.averageTotal != null ? summary.averageTotal : "—",
                hint: "/100 on current book",
              },
              {
                label: "Ready",
                value: progress?.eligibleForProgress ? "Yes" : "No",
                hint: progress?.nextBookTitle
                  ? `Next: ${progress.nextBookTitle}`
                  : "Course end or incomplete",
              },
            ]}
          />
        </>
      )}

      <div className="ui-scroll-panel">
        <table className="w-full text-sm text-left min-w-[720px]">
          <thead className="bg-fog/90 text-moss">
            <tr>
              <th className="px-4 py-3 font-semibold">Student</th>
              <th className="px-4 py-3 font-semibold w-28">Paper /40</th>
              <th className="px-4 py-3 font-semibold w-28">Practical /60</th>
              <th className="px-4 py-3 font-semibold w-24">Total</th>
              <th className="px-4 py-3 font-semibold w-28">Status</th>
              <th className="px-4 py-3 font-semibold w-32">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink/45">
                  Loading board…
                </td>
              </tr>
            )}
            {!loading &&
              board.map((s) => {
                const draft = drafts[s.id] || { paper: "", practical: "" };
                const paperNum =
                  draft.paper === "" ? null : Number(draft.paper);
                const pracNum =
                  draft.practical === "" ? null : Number(draft.practical);
                const preview =
                  paperNum != null &&
                  !Number.isNaN(paperNum) &&
                  pracNum != null &&
                  !Number.isNaN(pracNum)
                    ? paperNum + pracNum
                    : null;
                const marked = s.allComplete;

                return (
                  <tr
                    key={s.id}
                    className={`border-t border-moss/10 ${
                      marked ? "bg-mint/10" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {s.picture ? (
                          <img
                            src={s.picture}
                            alt=""
                            className="h-9 w-9 rounded-md object-cover"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-md bg-fog grid place-items-center text-moss text-xs font-semibold">
                            {s.name.slice(0, 1)}
                          </div>
                        )}
                        <div>
                          <Link
                            to={`/students/${s.id}`}
                            className="font-medium hover:text-leaf"
                          >
                            {s.name}
                          </Link>
                          <p className="text-xs text-ink/45">{s.studentId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        max={40}
                        step={0.5}
                        disabled={!canUpdate}
                        value={draft.paper}
                        onChange={(e) => setDraft(s.id, "paper", e.target.value)}
                        className="w-full rounded-md border border-moss/20 px-2 py-1.5 tabular-nums font-semibold disabled:bg-fog/50"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        max={60}
                        step={0.5}
                        disabled={!canUpdate}
                        value={draft.practical}
                        onChange={(e) =>
                          setDraft(s.id, "practical", e.target.value)
                        }
                        className="w-full rounded-md border border-moss/20 px-2 py-1.5 tabular-nums font-semibold disabled:bg-fog/50"
                      />
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-moss">
                      {preview != null ? preview : "—"}
                      <span className="text-ink/35 font-normal">/100</span>
                    </td>
                    <td className="px-4 py-3">
                      {marked ? (
                        <span className="text-xs font-semibold text-moss bg-mint/40 px-2 py-1 rounded-md">
                          Marked
                        </span>
                      ) : (
                        <span className="text-xs text-ink/45">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {canUpdate && (
                        <button
                          type="button"
                          disabled={savingId === s.id}
                          onClick={() => saveStudent(s)}
                          className="rounded-md bg-leaf text-white px-3 py-1.5 text-xs font-semibold hover:bg-moss disabled:opacity-50"
                        >
                          {savingId === s.id ? "…" : "Save"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            {!loading && classId && !board.length && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink/50">
                  No students in this class. Register students first.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
