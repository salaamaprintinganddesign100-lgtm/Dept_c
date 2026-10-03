import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Alert, PageHeader } from "../components/PageHeader";

const statuses = ["ENROLLED", "PENDING", "ACTIVE", "COMPLETED", "WITHDRAWN"];

export default function Registration() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({
    studentId: "",
    name: "",
    phone: "",
    parentPhone: "",
    classId: "",
    enrollmentStatus: "ENROLLED",
    picture: "",
  });
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .getClasses()
      .then((data) => {
        setClasses(data.classes);
        if (data.classes[0]) {
          setForm((f) => ({ ...f, classId: data.classes[0].id }));
        }
      })
      .catch((err) => setError(err.message));
  }, []);

  function onPicture(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Picture must be under 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result?.toString() || "";
      setPreview(result);
      setForm((f) => ({ ...f, picture: result }));
    };
    reader.readAsDataURL(file);
  }

  function clearPicture() {
    setPreview("");
    setForm((f) => ({ ...f, picture: "" }));
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api.createStudent(form);
      navigate(`/students/${data.student.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Registration"
        description="Enter student information and upload a photo."
      />

      {error && <Alert>{error}</Alert>}

      <form onSubmit={handleSubmit} className="ui-panel p-5 sm:p-6 space-y-5">
        {/* Student Picture — prominent */}
        <section className="rounded-xl border border-[#E2E8F2] bg-[#F3F5FA] p-4 sm:p-5">
          <p className="text-sm font-bold text-[#06235C]">Student Picture</p>
          <p className="text-xs text-[#06235C]/50 mt-0.5">
            Upload a clear photo (JPG / PNG, max 2MB).
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative h-32 w-32 shrink-0 rounded-xl border-2 border-dashed border-[#06235C]/25 bg-white overflow-hidden hover:border-[#06235C]/50 transition group"
            >
              {preview ? (
                <img
                  src={preview}
                  alt="Student preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="absolute inset-0 grid place-items-center text-center px-2">
                  <span className="text-xs font-semibold text-[#06235C]/55 group-hover:text-[#06235C]">
                    Click to
                    <br />
                    add photo
                  </span>
                </span>
              )}
            </button>

            <div className="space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={onPicture}
                className="sr-only"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="ui-btn ui-btn-primary"
              >
                {preview ? "Change picture" : "Choose picture"}
              </button>
              {preview && (
                <button
                  type="button"
                  onClick={clearPicture}
                  className="block text-xs font-semibold text-clay hover:underline"
                >
                  Remove picture
                </button>
              )}
            </div>
          </div>
        </section>

        <label className="block space-y-1">
          <span className="text-sm font-semibold text-[#06235C]">Student ID / Serial</span>
          <input
            value={form.studentId}
            onChange={(e) => setForm({ ...form, studentId: e.target.value })}
            className="ui-input"
            required
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-semibold text-[#06235C]">Student Name</span>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="ui-input"
            required
          />
        </label>

        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-[#06235C]">Student phone</span>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="e.g. 0612345678"
              className="ui-input"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-[#06235C]">Parent phone</span>
            <input
              type="tel"
              value={form.parentPhone}
              onChange={(e) => setForm({ ...form, parentPhone: e.target.value })}
              placeholder="e.g. 0619876543"
              className="ui-input"
            />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-semibold text-[#06235C]">Class</span>
          <select
            value={form.classId}
            onChange={(e) => setForm({ ...form, classId: e.target.value })}
            className="ui-input"
            required
          >
            {!classes.length && <option value="">No classes yet</option>}
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.className} ({c.classCode})
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-semibold text-[#06235C]">Enrollment Status</span>
          <select
            value={form.enrollmentStatus}
            onChange={(e) => setForm({ ...form, enrollmentStatus: e.target.value })}
            className="ui-input"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={busy || !classes.length}
          className="ui-btn ui-btn-primary px-6 py-2.5 disabled:opacity-60"
        >
          {busy ? "Registering…" : "Register Student"}
        </button>
      </form>
    </div>
  );
}
