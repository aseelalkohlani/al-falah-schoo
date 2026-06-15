/*
  منصة نتائج الطلاب - ملف التشغيل الرئيسي
  بعد تنفيذ setup_supabase.sql داخل Supabase، ضع رابط المشروع والمفتاح العام هنا.
*/
const SUPABASE_URL = "https://gwdtavtwbtaeguxtiztv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_1VLRVbXW7s-x82RS8A-xxg_Fk4SWPV-";

const LOGIN_USER = "Admin";
const LOGIN_PASS = "12345";

const TABLE_RESULTS = "students_results";
const TABLE_SETTINGS = "school_settings";
const TABLE_TEMPLATES = "grade_templates";
const TABLE_UPLOADS = "uploaded_files";
const ASSETS_BUCKET = "student-results-assets";

let sbClient = null;
let cachedSettings = null;
let currentResult = null;

const GRADES = [
  { code: "K1", label: "الصف الأول الأساسي", level: "basic" },
  { code: "K2", label: "الصف الثاني الأساسي", level: "basic" },
  { code: "K3", label: "الصف الثالث الأساسي", level: "basic" },
  { code: "K4", label: "الصف الرابع الأساسي", level: "basic" },
  { code: "K5", label: "الصف الخامس الأساسي", level: "basic" },
  { code: "K6", label: "الصف السادس الأساسي", level: "basic" },
  { code: "K7", label: "الصف السابع الأساسي", level: "middle" },
  { code: "K8", label: "الصف الثامن الأساسي", level: "middle" },
  { code: "K9", label: "الصف التاسع الأساسي", level: "middle" },
  { code: "K10", label: "الصف الأول الثانوي", level: "secondary-level" },
  { code: "K11", label: "الصف الثاني الثانوي", level: "secondary-level" },
  { code: "K12", label: "الصف الثالث الثانوي", level: "secondary-level" }
];

const DEFAULT_SETTINGS = {
  school_name: "مدرسة الفلاح الأساسية الثانوية",
  directorate: "مأرب الوادي",
  education_center: "مركز الوادي",
  academic_year: "2024-2025",
  principal_name: "",
  school_code: "",
  header_note: "نتيجة نهاية العام الدراسي",
  right_logo_url: "",
  left_logo_url: "",
  control_signature_url: "",
  principal_signature_url: "",
  control_stamp_url: ""
};

document.addEventListener("DOMContentLoaded", function () {
  initializeSupabase();
  wireSharedControls();

  const page = document.body.dataset.page;
  if (page === "admin") {
    fillGradeSelect("templateGrade");
    showLogin();
    setPublicLink();
  }

  if (page === "viewer") {
    fillGradeSelect("queryGrade", true);
    initializeViewer();
  }
});

function initializeSupabase() {
  const urlReady = SUPABASE_URL && SUPABASE_URL.startsWith("https://") && SUPABASE_URL.endsWith(".supabase.co");
  const keyReady = SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes("PUT_SUPABASE");
  if (urlReady && keyReady && window.supabase) {
    sbClient = window.supabase.createClient(SUPABASE_URL.trim(), SUPABASE_ANON_KEY.trim());
  } else {
    sbClient = null;
  }

  const warning = document.getElementById("configWarning");
  if (warning && !sbClient) {
    warning.classList.remove("hidden");
    warning.textContent = "تنبيه: لم يتم إدخال رابط Supabase والمفتاح العام داخل script.js بعد.";
  }
}

function wireSharedControls() {
  const toggle = document.getElementById("togglePassword");
  if (toggle) {
    toggle.addEventListener("click", function () {
      const input = document.getElementById("password");
      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
      toggle.textContent = input.type === "password" ? "👁" : "🙈";
    });
  }

  const pass = document.getElementById("password");
  if (pass) {
    pass.addEventListener("keydown", function (e) {
      if (e.key === "Enter") login();
    });
  }

  const excel = document.getElementById("excelFile");
  if (excel) {
    const dropzone = excel.closest(".dropzone");
    if (dropzone) {
      dropzone.addEventListener("dragover", e => { e.preventDefault(); dropzone.classList.add("dragover"); });
      dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
      dropzone.addEventListener("drop", e => {
        e.preventDefault();
        dropzone.classList.remove("dragover");
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          excel.files = e.dataTransfer.files;
        }
      });
    }
  }
}

function showLogin() {
  document.getElementById("loginPage")?.classList.remove("hidden");
  document.getElementById("appPage")?.classList.add("hidden");
}

function showApp() {
  document.getElementById("loginPage")?.classList.add("hidden");
  document.getElementById("appPage")?.classList.remove("hidden");
  loadSchoolSettings();
  refreshDashboard();
  loadRecentUploads();
}

function normalizeDigits(value) {
  return String(value || "")
    .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
    .replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
}

function login() {
  const username = (document.getElementById("username")?.value || "").trim();
  const password = normalizeDigits(document.getElementById("password")?.value || "").trim();
  const errorElement = document.getElementById("loginError");
  if (username.toLowerCase() === LOGIN_USER.toLowerCase() && password === LOGIN_PASS) {
    if (errorElement) errorElement.textContent = "";
    showApp();
    return;
  }
  if (errorElement) errorElement.textContent = "اسم المستخدم أو كلمة المرور غير صحيحة";
}

function logout() {
  const username = document.getElementById("username");
  const password = document.getElementById("password");
  if (username) username.value = "";
  if (password) password.value = "";
  showLogin();
}

function fillGradeSelect(id, includePlaceholder = false) {
  const select = document.getElementById(id);
  if (!select) return;
  select.innerHTML = "";
  if (includePlaceholder) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "اختر الصف";
    select.appendChild(opt);
  }
  GRADES.forEach(function (grade) {
    const opt = document.createElement("option");
    opt.value = grade.code;
    opt.textContent = grade.label;
    select.appendChild(opt);
  });
}

function gradeInfo(code) {
  return GRADES.find(g => g.code === code) || { code, label: code, level: "basic" };
}
function gradeLabel(code) { return gradeInfo(code).label; }
function gradeLevel(code) { return gradeInfo(code).level; }

function normalizeArabicName(value) {
  return String(value || "")
    .trim()
    .replace(/[أإآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}
function cleanText(value) { return String(value || "").replace(/\s+/g, " ").trim(); }
function valueAt(row, index) { return !row || index < 0 || row[index] === undefined || row[index] === null ? "" : row[index]; }
function isBlank(value) { return value === undefined || value === null || String(value).trim() === ""; }
function setText(id, value) { const el = document.getElementById(id); if (el) el.textContent = value; }
function setValue(id, value) { const el = document.getElementById(id); if (el) el.value = value || ""; }

function setPublicLink() {
  const input = document.getElementById("publicLink");
  if (input) input.value = window.location.origin + window.location.pathname.replace(/index\.html$/i, "").replace(/\/$/, "") + "/viewer.html";
}
async function copyPublicLink() {
  const link = document.getElementById("publicLink")?.value || (window.location.origin + "/viewer.html");
  try { await navigator.clipboard.writeText(link); alert("تم نسخ رابط الاستعلام العام."); }
  catch { prompt("انسخ الرابط:", link); }
}

async function loadSchoolSettings() {
  if (!sbClient) {
    cachedSettings = DEFAULT_SETTINGS;
    fillSettingsForm(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
  const result = await sbClient.from(TABLE_SETTINGS).select("*").eq("setting_key", "main").maybeSingle();
  if (result.error && result.error.code !== "PGRST116") console.warn(result.error);
  cachedSettings = Object.assign({}, DEFAULT_SETTINGS, result.data?.settings || {});
  fillSettingsForm(cachedSettings);
  renderAssetsPreview(cachedSettings);
  return cachedSettings;
}

function fillSettingsForm(settings) {
  setValue("schoolName", settings.school_name);
  setValue("directorate", settings.directorate);
  setValue("educationCenter", settings.education_center);
  setValue("academicYear", settings.academic_year);
  setValue("principalName", settings.principal_name);
  setValue("schoolCode", settings.school_code);
  setValue("headerNote", settings.header_note);
}

function renderAssetsPreview(settings) {
  const box = document.getElementById("assetsPreview");
  if (!box) return;
  const items = [
    ["شعار المدرسة", settings.right_logo_url],
    ["الشعار المقابل", settings.left_logo_url],
    ["توقيع الكنترول", settings.control_signature_url],
    ["توقيع المدير", settings.principal_signature_url],
    ["الختم", settings.control_stamp_url]
  ];
  box.innerHTML = items.map(([label, url]) => url
    ? `<div><img src="${escapeAttr(url)}" alt="${escapeAttr(label)}"><small>${escapeHtml(label)}</small></div>`
    : `<div class="logo-placeholder">${escapeHtml(label)}</div>`).join("");
}

async function uploadImageIfSelected(inputId, folder) {
  const input = document.getElementById(inputId);
  const file = input && input.files ? input.files[0] : null;
  if (!file) return "";
  if (!sbClient) throw new Error("لم يتم إعداد Supabase.");
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = folder + "/" + Date.now() + "-" + Math.random().toString(36).slice(2) + "." + ext;
  const upload = await sbClient.storage.from(ASSETS_BUCKET).upload(path, file, {
    contentType: file.type || "image/png",
    upsert: true
  });
  if (upload.error) throw upload.error;
  return sbClient.storage.from(ASSETS_BUCKET).getPublicUrl(path).data.publicUrl;
}

async function saveSchoolSettings() {
  const status = document.getElementById("settingsStatus");
  if (!sbClient) { if (status) status.textContent = "أضف بيانات Supabase داخل script.js أولًا."; return; }
  try {
    if (status) status.textContent = "جاري حفظ بيانات المدرسة والملفات...";
    const old = cachedSettings || DEFAULT_SETTINGS;
    const rightLogo = await uploadImageIfSelected("rightLogoFile", "logos/right");
    const leftLogo = await uploadImageIfSelected("leftLogoFile", "logos/left");
    const controlSig = await uploadImageIfSelected("controlSignatureFile", "signatures/control");
    const principalSig = await uploadImageIfSelected("principalSignatureFile", "signatures/principal");
    const stamp = await uploadImageIfSelected("controlStampFile", "stamps");
    const settings = {
      school_name: document.getElementById("schoolName").value.trim() || old.school_name,
      directorate: document.getElementById("directorate").value.trim() || old.directorate,
      education_center: document.getElementById("educationCenter").value.trim() || old.education_center,
      academic_year: document.getElementById("academicYear").value.trim() || old.academic_year,
      principal_name: document.getElementById("principalName").value.trim(),
      school_code: document.getElementById("schoolCode").value.trim(),
      header_note: document.getElementById("headerNote").value.trim() || old.header_note,
      right_logo_url: rightLogo || old.right_logo_url || "",
      left_logo_url: leftLogo || old.left_logo_url || "",
      control_signature_url: controlSig || old.control_signature_url || "",
      principal_signature_url: principalSig || old.principal_signature_url || "",
      control_stamp_url: stamp || old.control_stamp_url || ""
    };
    await saveSchoolSettingsFromObject(settings);
    cachedSettings = settings;
    renderAssetsPreview(settings);
    if (status) status.textContent = "تم حفظ بيانات المدرسة والملفات بنجاح.";
  } catch (error) {
    if (status) status.textContent = "تعذر حفظ الإعدادات: " + error.message;
  }
}

function parseSchoolInfoFromWorkbook(workbook) {
  const info = Object.assign({}, DEFAULT_SETTINGS);
  try {
    const school = workbook.Sheets["بيانات المدرسة"];
    if (school) {
      const rows = XLSX.utils.sheet_to_json(school, { header: 1, defval: "", raw: true });
      info.directorate = cleanText(rows[1]?.[2]) || info.directorate;
      info.school_name = cleanText(rows[2]?.[2]) || info.school_name;
      info.school_code = cleanText(rows[3]?.[2]) || info.school_code;
      info.education_center = cleanText(rows[6]?.[2]) || info.education_center;
    }
    const summary = workbook.Sheets["خلاصة احصائية الطلاب"];
    if (summary) {
      const rows = XLSX.utils.sheet_to_json(summary, { header: 1, defval: "", raw: true });
      info.school_name = cleanText(rows[2]?.[3]) || info.school_name;
      info.education_center = cleanText(rows[2]?.[9]) || info.education_center;
      info.directorate = cleanText(rows[2]?.[13]) || info.directorate;
    }
  } catch (error) { console.warn("تعذر استخراج بيانات المدرسة", error); }
  return info;
}

function detectSubjects(rows, sheetName) {
  const subjects = [];
  const header1 = rows[4] || [];
  const header2 = rows[5] || [];
  let currentSubject = "";
  for (let col = 12; col < Math.max(header1.length, header2.length); col++) {
    const h1 = cleanText(header1[col]);
    const h2 = cleanText(header2[col]);
    if (h1 && !isMetaColumn(h1)) currentSubject = h1;
    const isTotalColumn = h2.includes("المجموع") && !h2.includes("الكلي");
    if (isTotalColumn && currentSubject && !isMetaColumn(currentSubject)) {
      subjects.push({ name: currentSubject, totalCol: col, maxScore: Number(rows[6]?.[col]) || 100 });
    }
  }
  return subjects;
}

function isMetaColumn(text) {
  const t = cleanText(text);
  return ["المجموع الكلي", "النتيجة النهائية", "ملاحظات", "مكان وتاريخ", "الحالةا لدراسية", "الحالة الدراسية", "نوع حالة الاقامة"].some(k => t.includes(k));
}

function findColumnByHeader(rows, keyword) {
  const header = rows[4] || [];
  for (let c = 0; c < header.length; c++) if (cleanText(header[c]).includes(keyword)) return c;
  return -1;
}

function extractStudentsFromSheet(workbook, sheetName, schoolInfo) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true });
  const subjectsMeta = detectSubjects(rows, sheetName);
  const grade = gradeInfo(sheetName);
  const totalCol = findColumnByHeader(rows, "المجموع الكلي");
  const statusCol = findColumnByHeader(rows, "النتيجة النهائية");
  const startRow = sheetName === "K9" ? 8 : 7;
  const records = [];
  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r] || [];
    const serial = valueAt(row, 0);
    const schoolNumber = cleanText(valueAt(row, 1));
    const studentName = cleanText(valueAt(row, 2));
    if (!studentName || studentName.includes("اسم الطالب") || (!schoolNumber && !serial)) continue;
    if (studentName.length < 4) continue;
    const subjects = subjectsMeta.map(meta => {
      const score = normalizeNumber(valueAt(row, meta.totalCol));
      return { name: cleanText(meta.name), total: score, max: normalizeNumber(meta.maxScore) || 100 };
    }).filter(s => s.name && s.total !== "");
    const total = normalizeNumber(totalCol >= 0 ? valueAt(row, totalCol) : subjects.reduce((sum, s) => sum + Number(s.total || 0), 0));
    const maxTotal = subjects.reduce((sum, s) => sum + Number(s.max || 0), 0);
    const percentage = maxTotal ? Number(((Number(total || 0) / maxTotal) * 100).toFixed(2)) : null;
    let finalStatus = cleanText(statusCol >= 0 ? valueAt(row, statusCol) : "");
    if (!finalStatus) finalStatus = calculateStatus(subjects);
    records.push({
      student_name: studentName,
      normalized_name: normalizeArabicName(studentName),
      grade_code: grade.code,
      grade_label: grade.label,
      school_number: schoolNumber,
      gender: cleanText(valueAt(row, 3)),
      subjects,
      total: total === "" ? null : Number(total),
      percentage,
      final_status: finalStatus,
      school_name: schoolInfo.school_name,
      directorate: schoolInfo.directorate,
      education_center: schoolInfo.education_center,
      academic_year: schoolInfo.academic_year,
      raw_data: { sheet: sheetName, row_number: r + 1, serial }
    });
  }
  return records;
}

function normalizeNumber(value) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "number") return Number(value.toFixed(2));
  const str = normalizeDigits(String(value)).replace(/[^0-9.\-]/g, "");
  if (str === "") return "";
  const num = Number(str);
  return Number.isFinite(num) ? Number(num.toFixed(2)) : "";
}
function calculateStatus(subjects) {
  if (!subjects.length) return "غير محدد";
  const failed = subjects.some(s => Number(s.total || 0) < Number(s.max || 100) * 0.5);
  return failed ? "راسب" : "ناجح";
}

async function uploadExcelResults() {
  const input = document.getElementById("excelFile");
  const progress = document.getElementById("uploadProgress");
  const file = input?.files?.[0];
  if (!sbClient) { progress.textContent = "أضف Supabase URL و anon public key داخل script.js أولًا."; return; }
  if (!file) { progress.textContent = "اختر ملف Excel أولًا."; return; }
  try {
    progress.textContent = "جاري قراءة ملف Excel...";
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: false, raw: true });
    const extractedSchool = parseSchoolInfoFromWorkbook(workbook);
    const settings = Object.assign({}, cachedSettings || DEFAULT_SETTINGS, extractedSchool);
    cachedSettings = settings;
    fillSettingsForm(settings);
    const batchId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    let records = [];
    workbook.SheetNames.forEach(function (sheetName) {
      if (/^K\d+$/i.test(sheetName)) {
        const sheetRecords = extractStudentsFromSheet(workbook, sheetName.toUpperCase(), settings);
        records = records.concat(sheetRecords.map(r => Object.assign({ batch_id: batchId }, r)));
      }
    });
    if (!records.length) { progress.textContent = "لم يتم العثور على بيانات طلاب داخل أوراق K1 إلى K12."; return; }
    progress.textContent = "تم استخراج " + records.length + " طالب. جاري الحفظ في Supabase...";
    if (document.getElementById("replaceAll")?.checked) {
      const del = await sbClient.from(TABLE_RESULTS).delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (del.error) throw del.error;
    }
    await saveSchoolSettingsFromObject(settings);
    const chunkSize = 400;
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      const insert = await sbClient.from(TABLE_RESULTS).insert(chunk);
      if (insert.error) throw insert.error;
      progress.textContent = "جاري الحفظ... " + Math.min(i + chunk.length, records.length) + " / " + records.length;
    }
    const summary = summarizeRecords(records);
    await sbClient.from(TABLE_UPLOADS).insert({ batch_id: batchId, file_name: file.name, total_records: records.length, grades_count: summary.grades, pass_count: summary.pass, fail_count: summary.fail, uploaded_at: new Date().toISOString() });
    progress.textContent = "تم رفع النتائج بنجاح. الطلاب: " + records.length + "، الصفوف: " + summary.grades + ".";
    input.value = "";
    await refreshDashboard();
    await loadRecentUploads();
  } catch (error) { console.error(error); progress.textContent = "حدث خطأ أثناء رفع النتائج: " + error.message; }
}

function summarizeRecords(records) {
  const gradeSet = new Set(records.map(r => r.grade_code));
  const pass = records.filter(r => String(r.final_status || "").includes("ناجح") || String(r.final_status || "").includes("نجح")).length;
  const fail = records.filter(r => String(r.final_status || "").includes("راسب")).length;
  return { grades: gradeSet.size, pass, fail };
}
async function saveSchoolSettingsFromObject(settings) {
  if (!sbClient) return;
  const save = await sbClient.from(TABLE_SETTINGS).upsert({ setting_key: "main", settings, updated_at: new Date().toISOString() }, { onConflict: "setting_key" });
  if (save.error) throw save.error;
}
async function refreshDashboard() {
  if (!sbClient) return;
  try {
    const result = await sbClient.from(TABLE_RESULTS).select("grade_code, final_status", { count: "exact" });
    if (result.error) throw result.error;
    const rows = result.data || [];
    const gradeSet = new Set(rows.map(r => r.grade_code));
    const pass = rows.filter(r => String(r.final_status || "").includes("ناجح") || String(r.final_status || "").includes("نجح")).length;
    const fail = rows.filter(r => String(r.final_status || "").includes("راسب")).length;
    setText("statStudents", rows.length); setText("statGrades", gradeSet.size); setText("statPass", pass); setText("statFail", fail);
  } catch (error) { console.warn(error); }
}
async function loadRecentUploads() {
  const box = document.getElementById("recentUploads");
  if (!box || !sbClient) return;
  const result = await sbClient.from(TABLE_UPLOADS).select("*").order("uploaded_at", { ascending: false }).limit(5);
  if (result.error) { box.textContent = "تعذر تحميل سجل الرفع: " + result.error.message; return; }
  if (!result.data || result.data.length === 0) { box.textContent = "لا توجد عمليات رفع محفوظة بعد."; return; }
  box.innerHTML = result.data.map(item => `<div class="match-card"><div><strong>${escapeHtml(item.file_name)}</strong><br><small>${formatDate(item.uploaded_at)} - ${item.total_records} طالب</small></div><span>${item.grades_count || 0} صفوف</span></div>`).join("");
}
async function deleteAllResults() {
  if (!sbClient) return;
  if (!confirm("هل تريد حذف جميع نتائج الطلاب من قاعدة البيانات؟")) return;
  const result = await sbClient.from(TABLE_RESULTS).delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (result.error) { alert("تعذر الحذف: " + result.error.message); return; }
  alert("تم حذف النتائج."); refreshDashboard();
}
async function loadTemplateFileToTextarea() {
  const input = document.getElementById("templateFile");
  const file = input?.files?.[0];
  if (!file) { alert("اختر ملف قالب أولًا."); return; }
  document.getElementById("templateText").value = await file.text();
}
async function saveGradeTemplate() {
  const status = document.getElementById("templateStatus");
  if (!sbClient) { status.textContent = "أضف بيانات Supabase أولًا."; return; }
  const gradeCode = document.getElementById("templateGrade").value;
  const content = document.getElementById("templateText").value.trim();
  if (!gradeCode || !content) { status.textContent = "اختر الصف وأدخل محتوى القالب."; return; }
  const type = content.trim().startsWith("{") ? "json" : "html";
  const save = await sbClient.from(TABLE_TEMPLATES).upsert({ grade_code: gradeCode, grade_label: gradeLabel(gradeCode), template_type: type, template_content: content, updated_at: new Date().toISOString() }, { onConflict: "grade_code" });
  status.textContent = save.error ? "تعذر حفظ القالب: " + save.error.message : "تم حفظ قالب " + gradeLabel(gradeCode) + ".";
}

async function initializeViewer() { await loadSchoolSettings(); }
async function searchStudentResult() {
  const status = document.getElementById("queryStatus");
  const name = cleanText(document.getElementById("queryName")?.value || "");
  const gradeCode = document.getElementById("queryGrade")?.value || "";
  const schoolNumber = cleanText(document.getElementById("querySchoolNumber")?.value || "");
  const resultContainer = document.getElementById("resultContainer");
  const tools = document.getElementById("resultTools");
  const multiple = document.getElementById("multipleMatches");
  resultContainer?.classList.add("hidden"); tools?.classList.add("hidden"); multiple?.classList.add("hidden");
  if (!sbClient) { status.textContent = "لم يتم إعداد Supabase داخل script.js."; return; }
  if (!name || !gradeCode) { status.textContent = "أدخل اسم الطالب واختر الصف."; return; }
  status.textContent = "جاري البحث عن النتيجة...";
  let query = sbClient.from(TABLE_RESULTS).select("*").eq("grade_code", gradeCode);
  if (schoolNumber) query = query.eq("school_number", schoolNumber);
  else query = query.eq("normalized_name", normalizeArabicName(name));
  let result = await query.limit(10);
  if ((!result.data || result.data.length === 0) && !schoolNumber) {
    result = await sbClient.from(TABLE_RESULTS).select("*").eq("grade_code", gradeCode).ilike("student_name", "%" + name + "%").limit(10);
  }
  if (result.error) { status.textContent = "حدث خطأ أثناء البحث: " + result.error.message; return; }
  const rows = result.data || [];
  if (rows.length === 0) { status.textContent = "لم يتم العثور على نتيجة مطابقة. تأكد من الاسم والصف."; return; }
  if (rows.length > 1 && !schoolNumber) { status.textContent = "تم العثور على أكثر من طالب. اختر الطالب الصحيح أو أدخل الرقم المدرسي."; renderMatches(rows); return; }
  status.textContent = "تم العثور على النتيجة.";
  await renderStudentResult(rows[0]);
}
function renderMatches(rows) {
  const box = document.getElementById("multipleMatches");
  if (!box) return;
  box.classList.remove("hidden");
  box.innerHTML = `<h2>نتائج متشابهة</h2><div class="matches-list">${rows.map(row => `<div class="match-card"><div><strong>${escapeHtml(row.student_name)}</strong><br><small>${escapeHtml(row.grade_label)} - الرقم المدرسي: ${escapeHtml(row.school_number || "غير متوفر")}</small></div><button class="primary" onclick='renderStudentResultFromEncoded("${btoa(unescape(encodeURIComponent(JSON.stringify(row))))}")'>عرض</button></div>`).join("")}</div>`;
}
function renderStudentResultFromEncoded(encoded) { renderStudentResult(JSON.parse(decodeURIComponent(escape(atob(encoded))))); }
async function renderStudentResult(row) {
  currentResult = row;
  const settings = cachedSettings || await loadSchoolSettings();
  const template = await loadGradeTemplate(row.grade_code);
  const container = document.getElementById("resultContainer");
  const tools = document.getElementById("resultTools");
  document.getElementById("multipleMatches")?.classList.add("hidden");
  const html = template ? applyTemplate(template, row, settings) : defaultCertificateHtml(row, settings);
  container.innerHTML = html;
  container.classList.remove("hidden");
  tools.classList.remove("hidden");
  window.scrollTo({ top: container.offsetTop - 20, behavior: "smooth" });
}
async function loadGradeTemplate(gradeCode) {
  if (!sbClient) return null;
  const result = await sbClient.from(TABLE_TEMPLATES).select("*").eq("grade_code", gradeCode).maybeSingle();
  if (result.error || !result.data) return null;
  return result.data;
}
function applyTemplate(template, row, settings) {
  if (template.template_type === "json") {
    try { return defaultCertificateHtml(row, Object.assign({}, settings, JSON.parse(template.template_content))); }
    catch { return defaultCertificateHtml(row, settings); }
  }
  const replacements = buildTemplateReplacements(row, settings);
  let html = template.template_content;
  Object.keys(replacements).forEach(key => { html = html.replaceAll("{{" + key + "}}", replacements[key]); });
  return `<div class="certificate custom-template ${gradeLevel(row.grade_code)}">${html}</div>`;
}
function buildTemplateReplacements(row, settings) {
  return {
    student_name: escapeHtml(row.student_name),
    grade_label: escapeHtml(row.grade_label),
    school_number: escapeHtml(row.school_number || ""),
    school_name: escapeHtml(settings.school_name || row.school_name || ""),
    directorate: escapeHtml(settings.directorate || row.directorate || ""),
    education_center: escapeHtml(settings.education_center || row.education_center || ""),
    academic_year: escapeHtml(settings.academic_year || row.academic_year || ""),
    total: escapeHtml(row.total ?? ""),
    percentage: escapeHtml(row.percentage ? row.percentage + "%" : ""),
    final_status: escapeHtml(row.final_status || ""),
    subjects_horizontal_table: subjectsHorizontalTableHtml(row.subjects || []),
    subjects_table: subjectsHorizontalTableHtml(row.subjects || []),
    right_logo: assetImage(settings.right_logo_url, "شعار المدرسة", "cert-logo"),
    left_logo: assetImage(settings.left_logo_url, "الشعار المقابل", "cert-logo"),
    control_signature: assetImage(settings.control_signature_url, "توقيع الكنترول", ""),
    principal_signature: assetImage(settings.principal_signature_url, "توقيع المدير", ""),
    control_stamp: assetImage(settings.control_stamp_url, "الختم", "stamp-img")
  };
}
function assetImage(url, alt, cls) { return url ? `<img class="${cls}" src="${escapeAttr(url)}" alt="${escapeAttr(alt)}">` : ""; }
function defaultCertificateHtml(row, settings) {
  const isFail = String(row.final_status || "").includes("راسب");
  const level = gradeLevel(row.grade_code);
  const rightLogo = settings.right_logo_url ? `<img class="cert-logo" src="${escapeAttr(settings.right_logo_url)}" alt="شعار المدرسة">` : `<div class="logo-placeholder">شعار المدرسة</div>`;
  const leftLogo = settings.left_logo_url ? `<img class="cert-logo" src="${escapeAttr(settings.left_logo_url)}" alt="الشعار المقابل">` : `<div class="logo-placeholder">الشعار المقابل</div>`;
  const bg = settings.right_logo_url ? `<img class="cert-bg-mark" src="${escapeAttr(settings.right_logo_url)}" alt="">` : "";
  return `
    <div id="certificate" class="certificate ${level}">
      ${bg}
      <div class="cert-header">
        <div>${rightLogo}</div>
        <div class="cert-title">
          <h2>${escapeHtml(settings.school_name || row.school_name || "المدرسة")}</h2>
          <p>المديرية: ${escapeHtml(settings.directorate || row.directorate || "")} - المركز: ${escapeHtml(settings.education_center || row.education_center || "")}</p>
          <strong>${escapeHtml(settings.header_note || "كشف نتيجة الطالب")}</strong>
          <p>العام الدراسي: ${escapeHtml(settings.academic_year || row.academic_year || "")} ${settings.school_code ? " - رمز المدرسة: " + escapeHtml(settings.school_code) : ""}</p>
        </div>
        <div>${leftLogo}</div>
      </div>
      <div class="student-line">
        <div class="info-box"><span>اسم الطالب</span><strong>${escapeHtml(row.student_name)}</strong></div>
        <div class="info-box"><span>الصف</span><strong>${escapeHtml(row.grade_label)}</strong></div>
        <div class="info-box"><span>الرقم المدرسي</span><strong>${escapeHtml(row.school_number || "-")}</strong></div>
      </div>
      ${subjectsHorizontalTableHtml(row.subjects || [])}
      <div class="final-strip">
        <div class="final-box"><span>المجموع</span><strong>${escapeHtml(row.total ?? "-")}</strong></div>
        <div class="final-box"><span>النسبة</span><strong>${escapeHtml(row.percentage ? row.percentage + "%" : "-")}</strong></div>
        <div class="final-box ${isFail ? "fail" : ""}"><span>النتيجة النهائية</span><strong>${escapeHtml(row.final_status || "غير محدد")}</strong></div>
      </div>
      <div class="signature-row">
        <div class="sign-box">${assetImage(settings.control_signature_url, "توقيع الكنترول", "")}<b>مسؤول الكنترول</b><small>التوقيع</small></div>
        <div class="sign-box">${assetImage(settings.control_stamp_url, "الختم", "stamp-img")}<b>الختم الرسمي</b><small>ختم الكنترول / المدرسة</small></div>
        <div class="sign-box">${assetImage(settings.principal_signature_url, "توقيع المدير", "")}<b>مدير المدرسة</b><small>${escapeHtml(settings.principal_name || "")}</small></div>
      </div>
      <div class="cert-footer-note">هذه النتيجة صادرة إلكترونيًا من نظام إدارة نتائج الطلاب.</div>
    </div>`;
}
function subjectsHorizontalTableHtml(subjects) {
  const list = (subjects || []).filter(s => s.name).slice(0, 12);
  if (!list.length) return `<p class="muted">لا توجد مواد محفوظة لهذا الطالب.</p>`;
  const names = list.map(s => `<td class="subject-cell">${escapeHtml(shortSubjectName(s.name))}</td>`).join("");
  const scores = list.map(s => `<td class="score-cell">${escapeHtml(s.total ?? "-")}</td>`).join("");
  const maxes = list.map(s => `<td>${escapeHtml(s.max || 100)}</td>`).join("");
  const statuses = list.map(s => {
    const total = Number(s.total || 0), max = Number(s.max || 100);
    return `<td>${total >= max * 0.5 ? "ناجح" : "راسب"}</td>`;
  }).join("");
  return `<table class="subjects-horizontal"><tbody><tr><th class="label-cell">المادة</th>${names}</tr><tr><th class="label-cell">مجموع الفصلين</th>${scores}</tr><tr><th class="label-cell">من</th>${maxes}</tr><tr><th class="label-cell">الحالة</th>${statuses}</tr></tbody></table>`;
}
function shortSubjectName(name) {
  return cleanText(name)
    .replace("التربية الاسلامية", "الإسلامية")
    .replace("اللغة العربية", "العربية")
    .replace("اللغة الانجليزية", "الإنجليزية")
    .replace("القران الكريم", "القرآن")
    .replace("الدراسات الاجتماعية", "الاجتماعيات");
}

async function downloadResultImage() {
  const certificate = document.getElementById("certificate") || document.querySelector(".certificate");
  if (!certificate) return;
  const canvas = await html2canvas(certificate, { scale: 3, useCORS: true, backgroundColor: "#ffffff" });
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = buildResultFileName("png");
  link.click();
}
async function downloadResultPdf() {
  const certificate = document.getElementById("certificate") || document.querySelector(".certificate");
  if (!certificate) return;
  const canvas = await html2canvas(certificate, { scale: 3, useCORS: true, backgroundColor: "#ffffff" });
  const imgData = canvas.toDataURL("image/png");
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("l", "pt", [400, 250]);
  pdf.addImage(imgData, "PNG", 0, 0, 400, 250);
  pdf.save(buildResultFileName("pdf"));
}
function buildResultFileName(ext) {
  const name = currentResult ? currentResult.student_name : "student-result";
  return cleanText(name).replace(/[\\/:*?"<>|]/g, "-") + "-result." + ext;
}
function escapeHtml(text) { const div = document.createElement("div"); div.textContent = text === undefined || text === null ? "" : String(text); return div.innerHTML; }
function escapeAttr(text) { return String(text || "").replace(/"/g, "&quot;"); }
function formatDate(value) { try { return new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); } catch { return value || ""; } }
