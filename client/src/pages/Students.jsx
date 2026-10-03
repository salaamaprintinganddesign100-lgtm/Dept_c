import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Alert, PageHeader } from "../components/PageHeader";
import Modal from "../components/Modal";
import { IconEye, IconPencil, IconTrash } from "../components/ActionIcons";

const STATUS_OPTIONS = ["ENROLLED", "ACTIVE", "PENDING", "COMPLETED", "WITHDRAWN"];

const swalBrand = {
  confirmButtonColor: "#06235C",
  cancelButtonColor: "#94a3b8",
};

export default function Students() {
  const { hasPermission } = useAuth();
  const [searchParams] = useSearchParams();
  const canUpdate = hasPermission("students:update");
  const canDelete = hasPermission("students:delete");
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [q, setQ] = useState(() => searchParams.get("q") || "");
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load(params = {}) {
    const data = await api.getStudents(params);
    setStudents(data.students);
  }

  function currentParams() {
    const params = {};
    if (classId) params.classId = classId;
    if (q) params.q = q;
    return params;
  }

  useEffect(() => {
    const fromBar = searchParams.get("q") || "";
    if (fromBar) setQ(fromBar);
    Promise.all([
      api.getStudents(fromBar ? { q: fromBar } : {}),
      api.getClasses(),
    ])
      .then(([studentsRes, classesRes]) => {
        setStudents(studentsRes.students);
        setClasses(classesRes.classes);
      })
      .catch((err) => setError(err.message));
  }, [searchParams]);

  async function handleFilter(e) {
    e.preventDefault();
    setError("");
    try {
      await load(currentParams());
    } catch (err) {
      setError(err.message);
    }
  }

  function openEdit(s) {
    setEdit({
      id: s.id,
      name: s.name || "",
      studentId: s.studentId || "",
      phone: s.phone || "",
      parentPhone: s.parentPhone || "",
      picture: s.picture || "",
      classId: s.classId || s.class?.id || "",
      enrollmentStatus: s.enrollmentStatus || "ENROLLED",
    });
    setError("");
  }

  function onEditPicture(e) {
    const file = e.target.files?.[0];
    if (!file || !edit) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Picture must be under 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result?.toString() || "";
      setEdit((prev) => (prev ? { ...prev, picture: result } : prev));
    };
    reader.readAsDataURL(file);
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!edit) return;
    setBusy(true);
    setError("");
    setOkMsg("");
    try {
      await api.updateStudent(edit.id, {
        name: edit.name,
        studentId: edit.studentId,
        phone: edit.phone,
        parentPhone: edit.parentPhone,
        picture: edit.picture || null,
        classId: edit.classId,
        enrollmentStatus: edit.enrollmentStatus,
      });
      setEdit(null);
      await load(currentParams());
      await Swal.fire({
        icon: "success",
        title: "Updated",
        text: "Student saved successfully.",
        timer: 1600,
        showConfirmButton: false,
        ...swalBrand,
      });
    } catch (err) {
      setError(err.message);
      Swal.fire({
        icon: "error",
        title: "Update failed",
        text: err.message,
        ...swalBrand,
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(s) {
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete student?",
      html: `<b>${s.name}</b> and all related records will be removed.`,
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      reverseButtons: true,
      ...swalBrand,
      confirmButtonColor: "#B42318",
    });
    if (!result.isConfirmed) return;
    try {
      await api.deleteStudent(s.id);
      await load(currentParams());
      await Swal.fire({
        icon: "success",
        title: "Deleted",
        text: "Student removed.",
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="Search, filter, edit profiles, and open the full student record."
        actions={
          <Link
            to="/registration"
            className="rounded-md bg-leaf text-white px-4 py-2 text-sm font-semibold hover:bg-moss"
          >
            Register student
          </Link>
        }
      />

      {error && <Alert>{error}</Alert>}
      {okMsg && <Alert tone="success">{okMsg}</Alert>}

      <form onSubmit={handleFilter} className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or student ID"
          className="rounded-md border border-moss/20 px-3 py-2 bg-white min-w-[220px]"
        />
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className="rounded-md border border-moss/20 px-3 py-2 bg-white"
        >
          <option value="">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.className}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-md bg-moss text-white px-4 py-2">
          Filter
        </button>
      </form>

      <div className="ui-scroll-panel">
        <table className="w-full text-sm text-left min-w-[880px]">
          <thead className="bg-fog/90 text-moss">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Parent</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Level</th>
              <th className="px-4 py-3">Current book /100</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-t border-moss/10">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {s.picture ? (
                      <img
                        src={s.picture}
                        alt={s.name}
                        className="h-10 w-10 rounded-md object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-md bg-fog grid place-items-center text-xs text-moss font-semibold">
                        {s.name?.slice(0, 1) || "?"}
                      </div>
                    )}
                    <span className="font-medium">{s.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{s.studentId}</td>
                <td className="px-4 py-3">
                  {s.class?.className}
                  <div className="text-xs text-ink/50">{s.class?.classCode}</div>
                </td>
                <td className="px-4 py-3 text-xs tabular-nums">
                  {s.phone || "—"}
                </td>
                <td className="px-4 py-3 text-xs tabular-nums">
                  {s.parentPhone || "—"}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-md bg-fog px-2 py-0.5 text-xs font-medium">
                    {s.enrollmentStatus}
                  </span>
                </td>
                <td className="px-4 py-3">
                  Book {s.currentLevel ?? s.class?.currentLevel ?? 1}
                </td>
                <td className="px-4 py-3 tabular-nums font-semibold text-moss">
                  {s.totalScore != null ? s.totalScore : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/students/${s.id}`}
                      title="Open"
                      className="ui-action"
                    >
                      <IconEye />
                    </Link>
                    {canUpdate && (
                      <button
                        type="button"
                        title="Edit"
                        onClick={() => openEdit(s)}
                        className="ui-action"
                      >
                        <IconPencil />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        title="Delete"
                        onClick={() => handleDelete(s)}
                        className="ui-action ui-action-danger"
                      >
                        <IconTrash />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!students.length && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-ink/50">
                  No students found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={Boolean(edit)}
        onClose={() => setEdit(null)}
        from="bottom"
        title="Edit student"
        description="Changing class moves the student onto that class’s current level."
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEdit(null)}
              className="rounded-md px-4 py-2 text-sm border border-moss/15"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="student-edit-form"
              disabled={busy}
              className="rounded-md bg-leaf text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        }
      >
        {edit && (
          <form id="student-edit-form" onSubmit={saveEdit} className="space-y-3">
            <div className="rounded-xl border border-[#E2E8F2] bg-[#F3F5FA] p-3">
              <p className="text-xs font-bold text-[#06235C] mb-2">Student Picture</p>
              <div className="flex items-center gap-3">
                {edit.picture ? (
                  <img
                    src={edit.picture}
                    alt=""
                    className="h-20 w-20 rounded-lg object-cover border border-[#E2E8F2]"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-lg bg-white border border-dashed border-[#06235C]/25 grid place-items-center text-[10px] text-[#06235C]/45 font-semibold text-center px-1">
                    No photo
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="ui-btn ui-btn-primary cursor-pointer text-xs py-2">
                    {edit.picture ? "Change" : "Upload"}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={onEditPicture}
                    />
                  </label>
                  {edit.picture && (
                    <button
                      type="button"
                      onClick={() => setEdit({ ...edit, picture: "" })}
                      className="block text-[11px] font-semibold text-clay hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-ink/70">Full name</span>
              <input
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                required
                className="w-full rounded-md border border-moss/20 px-3 py-2"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-ink/70">Student ID</span>
              <input
                value={edit.studentId}
                onChange={(e) => setEdit({ ...edit, studentId: e.target.value })}
                required
                className="w-full rounded-md border border-moss/20 px-3 py-2"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-ink/70">Student phone</span>
                <input
                  type="tel"
                  value={edit.phone}
                  onChange={(e) => setEdit({ ...edit, phone: e.target.value })}
                  className="w-full rounded-md border border-moss/20 px-3 py-2"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-ink/70">Parent phone</span>
                <input
                  type="tel"
                  value={edit.parentPhone}
                  onChange={(e) =>
                    setEdit({ ...edit, parentPhone: e.target.value })
                  }
                  className="w-full rounded-md border border-moss/20 px-3 py-2"
                />
              </label>
            </div>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-ink/70">Class</span>
              <select
                value={edit.classId}
                onChange={(e) => setEdit({ ...edit, classId: e.target.value })}
                required
                className="w-full rounded-md border border-moss/20 px-3 py-2"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.className} ({c.classCode}) · L{c.currentLevel || 1}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-ink/70">Status</span>
              <select
                value={edit.enrollmentStatus}
                onChange={(e) =>
                  setEdit({ ...edit, enrollmentStatus: e.target.value })
                }
                className="w-full rounded-md border border-moss/20 px-3 py-2"
              >
                {STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </label>
          </form>
        )}
      </Modal>
    </div>
  );
}
