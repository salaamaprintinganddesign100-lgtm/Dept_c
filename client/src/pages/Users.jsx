import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Alert, PageHeader } from "../components/PageHeader";
import Modal from "../components/Modal";
import { IconPencil, IconPlus, IconTrash } from "../components/ActionIcons";

const emptyForm = {
  name: "",
  email: "",
  password: "",
  roleId: "",
  isActive: true,
};

const swalBrand = {
  confirmButtonColor: "#06235C",
  cancelButtonColor: "#94a3b8",
};

export default function Users() {
  const { user: me, hasPermission } = useAuth();
  const canCreate = hasPermission("users:create");
  const canUpdate = hasPermission("users:update");
  const canDelete = hasPermission("users:delete");

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const assignableRoles = useMemo(
    () => roles.filter((r) => ["ADMIN", "TEACHER"].includes(r.name)),
    [roles]
  );

  async function load() {
    const [usersRes, rolesRes] = await Promise.all([
      api.getUsers(),
      api.getRoles(),
    ]);
    setUsers(usersRes.users);
    setRoles(rolesRes.roles || []);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  function openCreate() {
    setEditingId(null);
    const teacher = assignableRoles.find((r) => r.name === "TEACHER");
    const admin = assignableRoles.find((r) => r.name === "ADMIN");
    setForm({
      ...emptyForm,
      roleId: teacher?.id || admin?.id || "",
    });
    setModalOpen(true);
    setError("");
  }

  function openEdit(u) {
    setEditingId(u.id);
    setForm({
      name: u.name || "",
      email: u.email || "",
      password: "",
      roleId: u.role?.id || "",
      isActive: u.isActive !== false,
    });
    setModalOpen(true);
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (editingId) {
        const body = {
          name: form.name,
          email: form.email,
          roleId: form.roleId,
          isActive: form.isActive,
        };
        if (form.password.trim()) body.password = form.password;
        await api.updateUser(editingId, body);
      } else {
        if (!form.password || form.password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
        await api.createUser({
          name: form.name,
          email: form.email,
          password: form.password,
          roleId: form.roleId,
        });
      }
      setModalOpen(false);
      await load();
      await Swal.fire({
        icon: "success",
        title: editingId ? "User updated" : "User created",
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

  async function handleDelete(u) {
    if (u.id === me?.id) {
      Swal.fire({
        icon: "info",
        title: "Not allowed",
        text: "You cannot delete your own account.",
        ...swalBrand,
      });
      return;
    }
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete user?",
      html: `<b>${u.name}</b> (${u.email})`,
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      reverseButtons: true,
      ...swalBrand,
      confirmButtonColor: "#B42318",
    });
    if (!result.isConfirmed) return;
    try {
      await api.deleteUser(u.id);
      await load();
      await Swal.fire({
        icon: "success",
        title: "Deleted",
        timer: 1400,
        showConfirmButton: false,
        ...swalBrand,
      });
    } catch (err) {
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
        title="Users"
        description="Manage Admin and Teacher accounts."
        actions={
          canCreate ? (
            <button type="button" onClick={openCreate} className="ui-btn ui-btn-primary gap-2">
              <IconPlus />
              Add user
            </button>
          ) : null
        }
      />

      {error && <Alert>{error}</Alert>}

      <div className="grid grid-cols-2 gap-3 max-w-md">
        <div className="ui-panel px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#06235C]/45">
            Admins
          </p>
          <p className="font-display text-2xl font-bold text-[#06235C] mt-1">
            {users.filter((u) => u.role?.name === "ADMIN").length}
          </p>
        </div>
        <div className="ui-panel px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#06235C]/45">
            Teachers
          </p>
          <p className="font-display text-2xl font-bold text-[#06235C] mt-1">
            {users.filter((u) => u.role?.name === "TEACHER").length}
          </p>
        </div>
      </div>

      <div className="ui-scroll-panel">
        <table className="w-full text-sm text-left min-w-[640px]">
          <thead className="bg-fog/90 text-moss">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-moss/10">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-[#06235C] text-white text-xs font-bold">
                      {(u.name || "?").slice(0, 1).toUpperCase()}
                    </span>
                    <span className="font-medium text-[#06235C]">
                      {u.name}
                      {u.id === me?.id ? (
                        <span className="ml-2 text-[10px] text-[#06235C]/45">(you)</span>
                      ) : null}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs">{u.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                      u.role?.name === "ADMIN"
                        ? "bg-[#06235C] text-white"
                        : "bg-fog text-[#06235C]"
                    }`}
                  >
                    {u.role?.name || "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-semibold ${
                      u.isActive ? "text-emerald-700" : "text-clay"
                    }`}
                  >
                    {u.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {canUpdate && (
                      <button
                        type="button"
                        title="Edit"
                        onClick={() => openEdit(u)}
                        className="ui-action"
                      >
                        <IconPencil />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        title="Delete"
                        onClick={() => handleDelete(u)}
                        className="ui-action ui-action-danger"
                      >
                        <IconTrash />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!users.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink/50">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        from="bottom"
        title={editingId ? "Edit user" : "Add user"}
        description="Roles: Admin (full access) or Teacher (classes & students)."
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="ui-btn ui-btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="user-form"
              disabled={busy}
              className="ui-btn ui-btn-primary disabled:opacity-50"
            >
              {busy ? "Saving…" : editingId ? "Save changes" : "Create user"}
            </button>
          </div>
        }
      >
        <form id="user-form" onSubmit={handleSubmit} className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-[#06235C]/70">Full name</span>
            <input
              className="ui-input"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-[#06235C]/70">Email</span>
            <input
              type="email"
              className="ui-input"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-[#06235C]/70">
              {editingId ? "New password (optional)" : "Password"}
            </span>
            <input
              type="password"
              className="ui-input"
              required={!editingId}
              minLength={editingId ? undefined : 6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={editingId ? "Leave blank to keep current" : ""}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-[#06235C]/70">Role</span>
            <select
              className="ui-input"
              required
              value={form.roleId}
              onChange={(e) => setForm({ ...form, roleId: e.target.value })}
            >
              <option value="">Select role</option>
              {assignableRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                  {r.description ? ` — ${r.description}` : ""}
                </option>
              ))}
            </select>
          </label>
          {editingId && (
            <label className="flex items-center gap-2 text-sm text-[#06235C]">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              Active account
            </label>
          )}
        </form>
      </Modal>
    </div>
  );
}
