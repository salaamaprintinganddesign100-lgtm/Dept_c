import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Alert, LevelBadge } from "../components/PageHeader";

export default function StudentDetail() {
  const { id } = useParams();
  const { hasPermission } = useAuth();
  const canExam = hasPermission("exams:update");
  const [student, setStudent] = useState(null);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [paper, setPaper] = useState("");
  const [practical, setPractical] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await api.getStudent(id);
    setStudent(data.student);
    // Always load from current class book (BookProgress), not legacy Exam rows
    setPaper(
      data.student.paperScore != null ? data.student.paperScore : ""
    );
    setPractical(
      data.student.practicalScore != null ? data.student.practicalScore : ""
    );
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [id]);

  async function saveMarks() {
    if (!canExam || !student) return;
    if (paper === "" || practical === "") {
      setError("Enter both Paper (0–40) and Practical (0–60).");
      return;
    }
    setBusy(true);
    setError("");
    setOkMsg("");
    try {
      await api.saveBookExamMarks({
        studentId: student.id,
        paperScore: Number(paper),
        practicalScore: Number(practical),
      });
      await load();
      setOkMsg(
        `Marks saved on class book · Level ${student.class?.currentLevel || student.currentLevel}`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (error && !student) return <Alert>{error}</Alert>;
  if (!student) return <p className="text-ink/50">Loading student…</p>;

  const totalPreview =
    paper !== "" && practical !== ""
      ? Number(paper) + Number(practical)
      : student.totalScore;

  const level = student.currentLevel ?? student.class?.currentLevel ?? 1;

  return (
    <div className="space-y-8">
      <div>
        <Link to="/students" className="text-sm text-leaf hover:underline">
          ← Back to students
        </Link>
        <h1 className="font-display text-4xl mt-2">{student.name}</h1>
        <p className="text-ink/50 text-sm mt-1">{student.studentId}</p>
      </div>

      <div className="rounded-xl border border-leaf/30 bg-leaf/10 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-leaf">
            Class level (shared)
          </p>
          <LevelBadge level={level} bookTitle={student.currentBookTitle} />
          <p className="text-sm text-ink/60">
            {student.completedBooks || 0}/6 books with full marks ·{" "}
            {student.class?.className}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-ink/45">Current book total</p>
          <p className="text-3xl font-semibold tabular-nums text-moss">
            {student.totalScore != null ? student.totalScore : "—"}
            <span className="text-base text-ink/35">/100</span>
          </p>
        </div>
      </div>

      {okMsg && <Alert tone="success">{okMsg}</Alert>}
      {error && <Alert>{error}</Alert>}

      <section className="rounded-xl border border-moss/10 bg-white/90 p-6 flex flex-wrap gap-6">
        {student.picture ? (
          <img
            src={student.picture}
            alt={student.name}
            className="h-32 w-32 rounded-lg object-cover border border-moss/10"
          />
        ) : (
          <div className="h-32 w-32 rounded-lg bg-fog grid place-items-center text-moss">
            No photo
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-x-10 gap-y-2 text-sm">
          <p>
            <span className="text-ink/50">Status:</span> {student.enrollmentStatus}
          </p>
          <p>
            <span className="text-ink/50">Class:</span> {student.class?.className}
          </p>
          <p>
            <span className="text-ink/50">Student phone:</span>{" "}
            {student.phone || "—"}
          </p>
          <p>
            <span className="text-ink/50">Parent phone:</span>{" "}
            {student.parentPhone || "—"}
          </p>
          <p>
            <span className="text-ink/50">Code:</span> {student.class?.classCode}
          </p>
          <p>
            <span className="text-ink/50">Teacher:</span> {student.class?.teacher}
          </p>
          <p>
            <span className="text-ink/50">Course:</span> {student.class?.courseName}
          </p>
          <p>
            <span className="text-ink/50">Year:</span> {student.class?.academicYear}
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Current book marks</h2>
            <p className="text-sm text-ink/55">
              Paper 40 + Practical 60. Class advances together from the Exams page.
            </p>
          </div>
          <p className="text-3xl font-semibold tabular-nums text-moss">
            {totalPreview != null ? totalPreview : "—"}
            <span className="text-base text-ink/35">/100</span>
          </p>
        </div>

        <div className="rounded-xl border border-moss/10 bg-white/90 p-5 grid sm:grid-cols-[1fr_1fr_auto] gap-4 items-end">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-ink/60">Paper /40</span>
            <input
              type="number"
              min={0}
              max={40}
              step={0.5}
              disabled={!canExam}
              value={paper}
              onChange={(e) => setPaper(e.target.value)}
              className="w-full rounded-md border border-moss/20 px-3 py-2.5 text-lg font-semibold bg-white"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-ink/60">Practical /60</span>
            <input
              type="number"
              min={0}
              max={60}
              step={0.5}
              disabled={!canExam}
              value={practical}
              onChange={(e) => setPractical(e.target.value)}
              className="w-full rounded-md border border-moss/20 px-3 py-2.5 text-lg font-semibold bg-white"
            />
          </label>
          {canExam && (
            <button
              type="button"
              disabled={busy}
              onClick={saveMarks}
              className="rounded-md bg-leaf text-white px-5 py-2.5 font-semibold hover:bg-moss disabled:opacity-50 h-[46px]"
            >
              {busy ? "Saving…" : "Save marks"}
            </button>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Book history</h2>
        <p className="text-sm text-ink/55">
          Scores for all six Computer books. Current class book is highlighted.
        </p>
        <div className="ui-scroll-panel">
          <table className="w-full text-sm text-left">
            <thead className="bg-fog/90 text-moss">
              <tr>
                <th className="px-4 py-3">Book</th>
                <th className="px-4 py-3">Paper</th>
                <th className="px-4 py-3">Practical</th>
                <th className="px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {student.bookProgress?.map((bp) => {
                const current = bp.book?.order === level;
                const total =
                  bp.paperScore != null && bp.practicalScore != null
                    ? Number(bp.paperScore) + Number(bp.practicalScore)
                    : null;
                return (
                  <tr
                    key={bp.id}
                    className={`border-t border-moss/10 ${
                      current ? "bg-leaf/5" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-medium">
                      {bp.book?.title}
                      {current && (
                        <span className="ml-2 text-[10px] font-bold text-leaf">
                          CURRENT
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {bp.paperScore != null ? `${bp.paperScore}/40` : "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {bp.practicalScore != null ? `${bp.practicalScore}/60` : "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums font-semibold text-moss">
                      {total != null ? `${total}/100` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Link to="/exams" className="text-sm text-leaf hover:underline inline-block">
          Open class Exams board →
        </Link>
      </section>
    </div>
  );
}
