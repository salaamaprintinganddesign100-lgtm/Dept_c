import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Alert, LevelBadge, PageHeader, StatStrip } from "../components/PageHeader";

export default function Books() {
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission("books:update") || hasPermission("exams:update");
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [board, setBoard] = useState([]);
  const [classInfo, setClassInfo] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [editMarks, setEditMarks] = useState({});
  const [savingId, setSavingId] = useState(null);

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
    const data = await api.getBookBoard(cid);
    setBoard(data.board);
    setClassInfo(data.class);
    setSummary(data.summary);
    const next = {};
    for (const s of data.board) {
      const cur = s.currentBook;
      next[s.id] = {
        paper: cur?.paperScore ?? "",
        practical: cur?.practicalScore ?? "",
      };
    }
    setEditMarks(next);
  }

  useEffect(() => {
    if (!classId) return;
    loadBoard(classId).catch((err) => setError(err.message));
  }, [classId]);

  async function saveCurrentMarks(s) {
    if (!canUpdate) return;
    const draft = editMarks[s.id] || {};
    if (draft.paper === "" || draft.practical === "") {
      setError("Enter Paper and Practical for the current book.");
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
      setOkMsg(`Saved current book marks for ${s.name}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  async function clearPart(bp, field) {
    if (!canUpdate) return;
    if (!confirm(`Reset ${field} on this book to Pending?`)) return;
    const body =
      field === "paper"
        ? { paperStatus: "PENDING", paperScore: null }
        : { practicalStatus: "PENDING", practicalScore: null };
    try {
      await api.updateBookProgress(bp.id, body);
      await loadBoard();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Books"
        description="Six Computer course books. The whole class shares one current level. Edit marks on the current book; past books stay as history."
        actions={
          <Link
            to="/exams"
            className="rounded-md bg-moss text-white px-4 py-2 text-sm font-semibold hover:bg-leaf"
          >
            Open Exams board
          </Link>
        }
      />

      {error && <Alert>{error}</Alert>}
      {okMsg && <Alert tone="success">{okMsg}</Alert>}

      <label className="block space-y-1 max-w-md">
        <span className="text-xs font-medium text-ink/60">Class</span>
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
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
          <div className="rounded-xl border border-moss/15 bg-white/90 p-4">
            <p className="text-xs uppercase tracking-wide text-ink/45 font-semibold mb-2">
              Class current book
            </p>
            <LevelBadge
              level={classInfo.currentLevel}
              bookTitle={classInfo.currentBookTitle}
            />
          </div>
          <StatStrip
            items={[
              { label: "Students", value: summary.students },
              {
                label: "Course finished",
                value: summary.fullyComplete ?? 0,
                hint: "All 6 books complete",
              },
              {
                label: "Current level",
                value: classInfo.currentLevel ?? 1,
              },
              {
                label: "Books in course",
                value: 6,
              },
            ]}
          />
        </>
      )}

      <div className="space-y-3">
        {board.map((s) => {
          const open = expanded === s.id;
          const draft = editMarks[s.id] || { paper: "", practical: "" };
          return (
            <article
              key={s.id}
              className="rounded-xl border border-moss/10 bg-white/90 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setExpanded(open ? null : s.id)}
                className="w-full text-left p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-fog/40"
              >
                <div className="flex items-center gap-3">
                  {s.picture ? (
                    <img
                      src={s.picture}
                      alt=""
                      className="h-10 w-10 rounded-md object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-md bg-fog grid place-items-center text-moss text-sm font-semibold">
                      {s.name.slice(0, 1)}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{s.name}</p>
                    <p className="text-xs text-ink/50">{s.studentId}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-md bg-fog text-moss px-2.5 py-1 text-xs font-semibold">
                    Level {s.currentLevel}
                  </span>
                  <span className="tabular-nums text-ink/60 text-xs">
                    {s.completedBooks}/6 books · {s.partsDone}/{s.partsTotal} parts
                  </span>
                </div>
              </button>

              {open && (
                <div className="border-t border-moss/10 p-4 space-y-4">
                  <div className="rounded-lg border border-leaf/25 bg-leaf/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-leaf mb-3">
                      Edit current book marks
                    </p>
                    <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                      <label className="block space-y-1">
                        <span className="text-xs text-ink/55">Paper /40</span>
                        <input
                          type="number"
                          min={0}
                          max={40}
                          step={0.5}
                          disabled={!canUpdate}
                          value={draft.paper}
                          onChange={(e) =>
                            setEditMarks((m) => ({
                              ...m,
                              [s.id]: { ...m[s.id], paper: e.target.value },
                            }))
                          }
                          className="w-full rounded-md border border-moss/20 px-3 py-2 font-semibold tabular-nums"
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-xs text-ink/55">Practical /60</span>
                        <input
                          type="number"
                          min={0}
                          max={60}
                          step={0.5}
                          disabled={!canUpdate}
                          value={draft.practical}
                          onChange={(e) =>
                            setEditMarks((m) => ({
                              ...m,
                              [s.id]: { ...m[s.id], practical: e.target.value },
                            }))
                          }
                          className="w-full rounded-md border border-moss/20 px-3 py-2 font-semibold tabular-nums"
                        />
                      </label>
                      {canUpdate && (
                        <button
                          type="button"
                          disabled={savingId === s.id}
                          onClick={() => saveCurrentMarks(s)}
                          className="rounded-md bg-leaf text-white px-4 py-2.5 font-semibold hover:bg-moss disabled:opacity-50 h-[42px]"
                        >
                          {savingId === s.id ? "Saving…" : "Save marks"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {s.books.map((bp) => {
                      const isCurrent = bp.book?.order === s.currentLevel;
                      return (
                        <div
                          key={bp.id}
                          className={`rounded-lg border p-3 space-y-2 ${
                            bp.isFullyComplete
                              ? "border-mint/40 bg-mint/10"
                              : isCurrent
                                ? "border-leaf/40 bg-white ring-1 ring-leaf/20"
                                : "border-moss/10 bg-sand/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium">{bp.book?.title}</p>
                            {isCurrent && (
                              <span className="text-[10px] font-semibold text-leaf">
                                CURRENT
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-ink/55">
                            Paper{" "}
                            <span className="font-semibold text-ink">
                              {bp.paperScore != null ? `${bp.paperScore}/40` : "—"}
                            </span>{" "}
                            · {bp.paperStatus}
                          </p>
                          <p className="text-xs text-ink/55">
                            Practical{" "}
                            <span className="font-semibold text-ink">
                              {bp.practicalScore != null
                                ? `${bp.practicalScore}/60`
                                : "—"}
                            </span>{" "}
                            · {bp.practicalStatus}
                          </p>
                          {bp.totalScore != null && (
                            <p className="text-xs font-semibold text-moss">
                              Total {bp.totalScore}/100
                            </p>
                          )}
                          {canUpdate && bp.isFullyComplete && (
                            <div className="flex gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => clearPart(bp, "paper")}
                                className="text-[11px] text-clay hover:underline"
                              >
                                Reset paper
                              </button>
                              <button
                                type="button"
                                onClick={() => clearPart(bp, "practical")}
                                className="text-[11px] text-clay hover:underline"
                              >
                                Reset practical
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <Link
                    to={`/students/${s.id}`}
                    className="text-sm text-leaf hover:underline inline-block"
                  >
                    Open student profile →
                  </Link>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {classId && !board.length && (
        <p className="text-center text-ink/50 py-10 rounded-xl border border-dashed border-moss/20">
          No students in this class.
        </p>
      )}
    </div>
  );
}
