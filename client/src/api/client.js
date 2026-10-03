const API_URL = import.meta.env.VITE_API_URL || "/api";

function getToken() {
  return localStorage.getItem("deptc_token");
}

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

export const api = {
  login: (body) => request("/session/login", { method: "POST", body: JSON.stringify(body) }),
  register: (body) => request("/session/register", { method: "POST", body: JSON.stringify(body) }),
  me: () => request("/session/me"),
  getStats: () => request("/dashboard"),

  getClasses: (q = "") => request(`/classes${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  getClass: (id) => request(`/classes/${id}`),
  createClass: (body) => request("/classes", { method: "POST", body: JSON.stringify(body) }),
  updateClass: (id, body) => request(`/classes/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteClass: (id) => request(`/classes/${id}`, { method: "DELETE" }),

  getStudents: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/students${qs ? `?${qs}` : ""}`);
  },
  getStudent: (id) => request(`/students/${id}`),
  createStudent: (body) => request("/students", { method: "POST", body: JSON.stringify(body) }),
  updateStudent: (id, body) => request(`/students/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteStudent: (id) => request(`/students/${id}`, { method: "DELETE" }),

  getExams: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/exams${qs ? `?${qs}` : ""}`);
  },
  getExamBoard: (classId) =>
    request(`/exams/board?classId=${encodeURIComponent(classId)}`),
  advanceClassLevel: (classId) =>
    request("/exams/advance-class", {
      method: "POST",
      body: JSON.stringify({ classId }),
    }),
  updateExam: (id, body) => request(`/exams/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  saveBookExamMarks: (body) =>
    request("/books/exam-marks", { method: "POST", body: JSON.stringify(body) }),

  getBooks: () => request("/books"),
  getBookBoard: (classId) =>
    request(`/books/board?classId=${encodeURIComponent(classId)}`),
  getBookProgress: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/books/progress${qs ? `?${qs}` : ""}`);
  },
  updateBookProgress: (id, body) =>
    request(`/books/progress/${id}`, { method: "PUT", body: JSON.stringify(body) }),

  getAttendances: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/attendances${qs ? `?${qs}` : ""}`);
  },
  getAttendanceClassDay: (classId, date) =>
    request(
      `/attendances/class-day?classId=${encodeURIComponent(classId)}&date=${encodeURIComponent(date)}`
    ),
  saveAttendanceClassDay: (body) =>
    request("/attendances/class-day", { method: "POST", body: JSON.stringify(body) }),
  getAttendanceMonthly: (classId, year, month) =>
    request(
      `/attendances/monthly-summary?classId=${encodeURIComponent(classId)}&year=${year}&month=${month}`
    ),
  getAttendanceTodayWorkflow: () => request("/attendances/today-workflow"),
  upsertAttendance: (body) =>
    request("/attendances", { method: "POST", body: JSON.stringify(body) }),
  deleteAttendance: (id) => request(`/attendances/${id}`, { method: "DELETE" }),

  getUsers: () => request("/users"),
  createUser: (body) => request("/users", { method: "POST", body: JSON.stringify(body) }),
  updateUser: (id, body) => request(`/users/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteUser: (id) => request(`/users/${id}`, { method: "DELETE" }),
  getRoles: () => request("/roles"),
};
