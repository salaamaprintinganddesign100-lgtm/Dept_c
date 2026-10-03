import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Alert, PageHeader } from "../components/PageHeader";
import Modal from "../components/Modal";
import { IconPencil, IconTrash } from "../components/ActionIcons";

const emptyForm = {
  className: "",
  classCode: "",
  academicYear: "2026",
  teacherId: "",
  startTime: "08:00",
  endTime: "12:00",
  courseName: "Computer",
  courseDuration: "6 months",
  startDate: "",
  endDate: "",
  currentLevel: 1,
};

const BOOK_TITLES = [
  "Book One Ms-windows 11",
  "Book Two Ms-word 2016",
  "Book Three Ms-Power Point 2016",
  "Book Four Ms-Excel 2016",
  "Book Five Ms-Access 2016",
  "Book Six Hardware & Final Projects",
];

const swalBrand = {
  confirmButtonColor: "#06235C",
  cancelButtonColor: "#94a3b8",
};

function toDateInput(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export default function Classes() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("classes:create");
  const canUpdate = hasPermission("classes:update");
  const canDelete = hasPermission("classes:delete");
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function load(search = q) {
    const data = await api.getClasses(search);
    setClasses(data.classes);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
    if (canCreate || canUpdate) {
      api
        .getUsers()
        .then((data) => {
          setTeachers(
            (data.users || []).filter((u) =>
              ["TEACHER", "ADMIN"].includes(u.role?.name)
            )
          );
        })
        .catch(() => {});
    }
  }, []);

  function openCreate() {
    setEditingId(null);
    const defaultTeacher =
      teachers.find((t) => t.role?.name === "TEACHER")?.id ||
      teachers[0]?.id ||
      "";
    setForm({ ...emptyForm, teacherId: defaultTeacher });
    setModalOpen(true);
    setError("");
  }

  function openEdit(c) {
    setEditingId(c.id);
    setForm({
      className: c.className || "",
      classCode: c.classCode || "",
      academicYear: c.academicYear || "",
      teacherId: c.teacherId || c.assignedTeacher?.id || "",
      startTime: c.startTime || "",
      endTime: c.endTime || "",
      courseName: c.courseName || "",
      courseDuration: c.courseDuration || "",
      startDate: toDateInput(c.startDate),
      endDate: toDateInput(c.endDate),
      currentLevel: c.currentLevel || 1,
    });
    setModalOpen(true);
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.teacherId) {
      setError("Assign a teacher to this class.");
      return;
    }
    setBusy(true);
    setError("");
    setOkMsg("");
    try {
      const body = {
        ...form,
        currentLevel: Number(form.currentLevel) || 1,
      };
      if (editingId) {
        await api.updateClass(editingId, body);
      } else {
        const { currentLevel: _lvl, ...createBody } = body;
        await api.createClass(createBody);
      }
      setModalOpen(false);
      await load();
      await Swal.fire({
        icon: "success",
        title: editingId ? "Class updated" : "Class created",
        timer: 1500,
        showConfirmButton: false,
        ...swalBrand,
      });
    } catch (err) {
      setError(err.message);
      Swal.fire({
        icon: "error",
        title: "Failed",
        text: err.message,
        ...swalBrand,
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(c) {
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete class?",
      html: `<b>${c.className}</b> (${c.classCode}). Only empty classes can be deleted.`,
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      reverseButtons: true,
      ...swalBrand,
      confirmButtonColor: "#B42318",
    });
    if (!result.isConfirmed) return;
    try {
      await api.deleteClass(c.id);
      await load();
      await Swal.fire({
        icon: "success",
        title: "Deleted",
        timer: 1400,
        showConfirmButton: false,
        ...swalBrand,
      });
    } catch (err) {
      setError(err.message);
      Swal.fire({
        icon: "error",
        title: "Delete failed",
        text: err.message,
        ...swalBrand,
      });
    }
  }

  function field(key, label, type = "text") {
    return (
      <label className="block space-y-1">
        <span className="text-xs font-medium text-ink/70">{label}</span>
        <input
          type={type}
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          className="w-full rounded-md border border-moss/20 px-3 py-2 bg-white text-sm"
          required={type !== "number"}
        />
      </label>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes"
        description="Create and edit classes. Class code is unique. Current level is shared by every student in the class."
        actions={
          canCreate ? (
            <button
              type="button"
              onClick={openCreate}
              className="rounded-md bg-leaf text-white px-4 py-2 font-semibold hover:bg-moss"
            >
              Create class
            </button>
          ) : null
        }
      />

      {error && <Alert>{error}</Alert>}
      {okMsg && <Alert tone="success">{okMsg}</Alert>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(q).catch((err) => setError(err.message));
        }}
        className="flex gap-2 max-w-xl"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, code, teacher…"
          className="flex-1 rounded-md border border-moss/20 px-3 py-2 bg-white"
        />
        <button type="submit" className="rounded-md bg-moss text-white px-4 py-2">
          Search
        </button>
      </form>

      <div className="ui-scroll-panel">
        <table className="w-full text-sm text-left min-w-[900px]">
          <thead className="bg-fog/90 text-moss">
            <tr>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Level</th>
              <th className="px-4 py-3">Teacher</th>
              <th className="px-4 py-3">Course</th>
              <th className="px-4 py-3">Schedule</th>
              <th className="px-4 py-3">Students</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((c) => (
              <tr key={c.id} className="border-t border-moss/10">
                <td className="px-4 py-3">
                  <p className="font-medium">{c.className}</p>
                  <p className="text-xs text-ink/45">{c.academicYear}</p>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{c.classCode}</td>
                <td className="px-4 py-3">
                  <span className="rounded-md bg-fog text-moss px-2 py-1 text-xs font-semibold">
                    L{c.currentLevel || 1}
                  </span>
                  <p className="text-[11px] text-ink/45 mt-1 max-w-[140px] truncate">
                    {BOOK_TITLES[(c.currentLevel || 1) - 1]}
                  </p>
                </td>
                <td className="px-4 py-3">
                  {c.assignedTeacher?.name || c.teacher}
                  {c.assignedTeacher?.email ? (
                    <div className="text-[11px] text-ink/45">{c.assignedTeacher.email}</div>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  {c.courseName}
                  <div className="text-xs text-ink/50">{c.courseDuration}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {c.startTime} – {c.endTime}
                </td>
                <td className="px-4 py-3 tabular-nums">{c.studentCount}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {canUpdate && (
                      <button
                        type="button"
                        title="Edit"
                        onClick={() => openEdit(c)}
                        className="ui-action"
                      >
                        <IconPencil />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        title="Delete"
                        onClick={() => handleDelete(c)}
                        className="ui-action ui-action-danger"
                      >
                        <IconTrash />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!classes.length && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-ink/50">
                  No classes found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        from="center"
        title={editingId ? "Edit class" : "Create class"}
        description="Assign a Teacher account. Teachers only see their assigned classes on Exams & Attendance."
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-md px-4 py-2 text-sm border border-moss/15"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="class-form"
              disabled={busy}
              className="rounded-md bg-leaf text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {busy ? "Saving…" : editingId ? "Save changes" : "Create"}
            </button>
          </div>
        }
      >
        <form id="class-form" onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-3">
          {field("className", "Class name")}
          {field("classCode", "Class code (unique)")}
          {field("academicYear", "Academic year")}
          <label className="block space-y-1">
            <span className="text-xs font-medium text-ink/70">Assign teacher</span>
            <select
              required
              value={form.teacherId}
              onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
              className="w-full rounded-md border border-moss/20 px-3 py-2 bg-white text-sm"
            >
              <option value="">Select teacher…</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.role?.name})
                </option>
              ))}
            </select>
          </label>
          {field("startTime", "Start time", "time")}
          {field("endTime", "End time", "time")}
          {field("courseName", "Course name")}
          {field("courseDuration", "Course duration")}
          {field("startDate", "Start date", "date")}
          {field("endDate", "End date", "date")}
          {editingId && (
            <label className="block space-y-1 sm:col-span-2">
              <span className="text-xs font-medium text-ink/70">
                Current level (1–6) — shared by all students
              </span>
              <select
                value={form.currentLevel}
                onChange={(e) =>
                  setForm({ ...form, currentLevel: Number(e.target.value) })
                }
                className="w-full rounded-md border border-moss/20 px-3 py-2 bg-white text-sm"
              >
                {BOOK_TITLES.map((title, i) => (
                  <option key={title} value={i + 1}>
                    Level {i + 1}: {title}
                  </option>
                ))}
              </select>
            </label>
          )}
        </form>
      </Modal>
    </div>
  );
}
