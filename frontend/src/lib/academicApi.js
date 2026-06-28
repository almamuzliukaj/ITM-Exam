import api from "./api";

export async function listTerms() {
  const response = await api.get("/api/Terms");
  return response.data;
}

export async function createTerm(payload) {
  const response = await api.post("/api/Terms", payload);
  return response.data;
}

export async function publishTerm(termId) {
  const response = await api.post(`/api/Terms/${termId}/publish`);
  return response.data;
}

export async function closeTerm(termId) {
  const response = await api.post(`/api/Terms/${termId}/close`);
  return response.data;
}

export async function listCourses() {
  const response = await api.get("/api/Courses");
  return response.data;
}

export async function createCourse(payload) {
  const response = await api.post("/api/Courses", payload);
  return response.data;
}

export async function deactivateCourse(courseId) {
  const response = await api.post(`/api/Courses/${courseId}/deactivate`);
  return response.data;
}

export async function listOfferings(filters = {}) {
  const response = await api.get("/api/course-offerings", { params: filters });
  return response.data;
}

export async function listMyOfferings() {
  const response = await api.get("/api/course-offerings/mine");
  return response.data;
}

export async function getOffering(offeringId) {
  const response = await api.get(`/api/course-offerings/${offeringId}`);
  return response.data;
}

export async function listOfferingStudents(offeringId) {
  const response = await api.get(`/api/course-offerings/${offeringId}/students`);
  return response.data;
}

export async function createOffering(payload) {
  const response = await api.post("/api/course-offerings", payload);
  return response.data;
}

export async function publishOffering(offeringId) {
  const response = await api.post(`/api/course-offerings/${offeringId}/publish`);
  return response.data;
}

export async function closeOffering(offeringId) {
  const response = await api.post(`/api/course-offerings/${offeringId}/close`);
  return response.data;
}

export async function listSemesterEnrollments() {
  const response = await api.get("/api/semester-enrollments");
  return response.data;
}

export async function listStudentSemesterEnrollments(studentId) {
  const response = await api.get(`/api/students/${studentId}/semester-enrollments`);
  return response.data;
}

export async function createSemesterEnrollment(studentId, payload) {
  const response = await api.post(`/api/students/${studentId}/semester-enrollments`, payload);
  return response.data;
}

export async function activateSemesterEnrollment(enrollmentId) {
  const response = await api.post(`/api/semester-enrollments/${enrollmentId}/activate`);
  return response.data;
}

export async function withdrawSemesterEnrollment(enrollmentId) {
  const response = await api.post(`/api/semester-enrollments/${enrollmentId}/withdraw`);
  return response.data;
}

export async function listStudentCourseEnrollments(studentId, termId) {
  const response = await api.get(`/api/students/${studentId}/course-enrollments`, {
    params: termId ? { termId } : {},
  });
  return response.data;
}

export async function regularizeStudentCourseEnrollments(studentId, termId) {
  const response = await api.post(`/api/students/${studentId}/course-enrollments/regularize`, null, {
    params: { termId },
  });
  return response.data;
}

export async function listStudentCarryOvers(studentId) {
  const response = await api.get(`/api/students/${studentId}/carry-overs`);
  return response.data;
}

export async function createStudentCarryOver(studentId, payload) {
  const response = await api.post(`/api/students/${studentId}/carry-overs`, payload);
  return response.data;
}

export async function assignCarryOverOffering(carryOverId, payload) {
  const response = await api.post(`/api/carry-overs/${carryOverId}/assign-offering`, payload);
  return response.data;
}

export async function closeCarryOver(carryOverId, payload = {}) {
  const response = await api.post(`/api/carry-overs/${carryOverId}/close`, payload);
  return response.data;
}

export async function cancelCarryOver(carryOverId) {
  const response = await api.post(`/api/carry-overs/${carryOverId}/cancel`);
  return response.data;
}
