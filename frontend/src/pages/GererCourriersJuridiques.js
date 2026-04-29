import React, { useEffect, useState } from "react";
import axios from "axios";

const TEXT_TRANSFER = "\u0625\u062d\u0627\u0644\u0629";
const TRANSFER_PROMPT = "\u0623\u062f\u062e\u0644 \u0627\u0644\u0645\u0631\u0633\u0644 \u0625\u0644\u064a\u0647 \u0623\u0648 \u0627\u0644\u0645\u0635\u0644\u062d\u0629 \u0627\u0644\u0645\u0633\u062a\u0642\u0628\u0644\u0629";
const TRANSFER_SUCCESS = "\u062a\u0645\u062a \u0625\u062d\u0627\u0644\u0629 \u0627\u0644\u0645\u0631\u0627\u0633\u0644\u0629 \u0627\u0644\u0642\u0636\u0627\u0626\u064a\u0629 \u0628\u0646\u062c\u0627\u062d.";
const TRANSFER_ERROR = "\u062a\u0639\u0630\u0631\u062a \u0625\u062d\u0627\u0644\u0629 \u0627\u0644\u0645\u0631\u0627\u0633\u0644\u0629.";
const PDF_UPLOAD_SUCCESS = "\u062a\u0645 \u0631\u0641\u0639 \u0627\u0644\u0645\u0644\u0641 \u0648\u062a\u0639\u0628\u0626\u0629 \u0627\u0644\u0631\u0627\u0628\u0637 \u062a\u0644\u0642\u0627\u0626\u064a\u0627.";
const PDF_UPLOAD_ERROR = "\u062a\u0639\u0630\u0631 \u0631\u0641\u0639 \u0627\u0644\u0645\u0644\u0641. \u0627\u0644\u0645\u0633\u0645\u0648\u062d: PDF \u0623\u0648 Word.";
const PDF_FILE_LABEL = "\u0627\u062e\u062a\u064a\u0627\u0631 \u0645\u0644\u0641 PDF \u0623\u0648 Word";
const PDF_UPLOADING_LABEL = "\u062c\u0627\u0631\u064a \u0631\u0641\u0639 \u0627\u0644\u0645\u0644\u0641...";
const ALLOWED_DOCUMENT_EXTENSIONS = [".pdf", ".doc", ".docx"];
const OPEN_DOCUMENT_LABEL = "\u0641\u062a\u062d \u0627\u0644\u0645\u0644\u0641";
const REMOVE_DOCUMENT_LABEL = "\u062d\u0630\u0641";

function GererCourriersJuridiques() {
  const [courriers, setCourriers] = useState([]);
  const [services, setServices] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [motCle, setMotCle] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [importing, setImporting] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [form, setForm] = useState(getInitialForm());
  const safeForm = normalizeForm(form, services);

  useEffect(() => {
    fetchCourriers();
    fetchServices();
  }, []);

  const fetchCourriers = async () => {
    try {
      const response = await axios.get("/api/acteursjudiciaires");
      setCourriers(response.data);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "تعذر تحميل المراسلات القضائية."));
    }
  };

  const fetchServices = async () => {
    try {
      const response = await axios.get("/api/services");
      setServices(response.data);
      if (response.data.length > 0) {
        setForm((prev) => normalizeForm({ ...prev, idService: prev.idService || response.data[0].idService }, response.data));
      }
    } catch (err) {
      setError(getErrorMessage(err, "تعذر تحميل المصالح."));
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => normalizeForm({ ...prev, [name]: type === "checkbox" ? checked : value }, services));
  };

  const handlePdfSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const hasAllowedExtension = ALLOWED_DOCUMENT_EXTENSIONS.some((extension) => fileName.endsWith(extension));
    if (!hasAllowedExtension) {
      setError(PDF_UPLOAD_ERROR);
      e.target.value = "";
      return;
    }

    setUploadingPdf(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await axios.post("/api/acteursjudiciaires/upload-document", formData);
      const lienPdf = response.data?.lienPdf || "";

      if (!lienPdf) {
        throw new Error(PDF_UPLOAD_ERROR);
      }

      setForm((prev) => normalizeForm({ ...prev, lienPdf }, services));
      setSuccess(PDF_UPLOAD_SUCCESS);
    } catch (err) {
      setError(getErrorMessage(err, PDF_UPLOAD_ERROR));
    } finally {
      setUploadingPdf(false);
      e.target.value = "";
    }
  };

  const clearDocumentLink = () => {
    setForm((prev) => normalizeForm({ ...prev, lienPdf: "" }, services));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(getInitialForm(services));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const currentForm = normalizeForm(form, services);
    const validationError = validateForm(currentForm);
    if (validationError) {
      setError(validationError);
      return;
    }

    const dataToSend = {
      idBureauOrdre: currentForm.idBureauOrdre.trim() || null,
      date: new Date(currentForm.date).toISOString(),
      tribunalSource: currentForm.tribunalSource.trim(),
      sujet: currentForm.sujet.trim(),
      direction: "Entrant",
      destinataire: currentForm.destinataire.trim(),
      description: currentForm.description.trim(),
      etatArchive: currentForm.etatArchive,
      emplacement: currentForm.emplacement.trim(),
      lienPdf: currentForm.lienPdf.trim(),
      idService: Number(currentForm.idService),
      estTransmissible: true,
      numeroDossier: currentForm.numeroDossier.trim(),
      numeroDossierAnnee: null,
      numeroDossierNombre: null,
      numeroDossierSujet: null,
    };

    try {
      if (editingId) {
        await axios.put(`/api/acteursjudiciaires/${editingId}`, dataToSend);
        setSuccess("تم تعديل المراسلة القضائية بنجاح.");
      } else {
        await axios.post("/api/acteursjudiciaires", dataToSend);
        setSuccess("تمت إضافة المراسلة القضائية بنجاح.");
      }
      resetForm();
      await fetchCourriers();
    } catch (err) {
      setError(getErrorMessage(err, "تعذر حفظ المراسلة القضائية."));
    }
  };

  const handleEdit = (courrier) => {
    setEditingId(courrier.id);
    setForm(normalizeForm({
      idBureauOrdre: courrier.idBureauOrdre || "",
      date: courrier.date ? courrier.date.slice(0, 10) : "",
      tribunalSource: courrier.tribunalSource || "",
      sujet: courrier.sujet || "",
      destinataire: courrier.destinataire || "",
      description: courrier.description || "",
      etatArchive: courrier.etatArchive || "Nouveau",
      emplacement: courrier.emplacement || "",
      lienPdf: courrier.lienPdf || "",
      idService: courrier.idService || getDefaultServiceId(services),
      numeroDossier: courrier.numeroDossier || "",
    }, services));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("هل تريد حذف هذه المراسلة القضائية؟")) return;
    try {
      await axios.delete(`/api/acteursjudiciaires/${id}`);
      setSuccess("تم حذف المراسلة القضائية بنجاح.");
      await fetchCourriers();
    } catch (err) {
      setError(getErrorMessage(err, "تعذر حذف المراسلة."));
    }
  };

  const handleArchive = async (id) => {
    if (!window.confirm("هل تريد أرشفة هذه المراسلة القضائية؟")) return;
    try {
      await axios.put(`/api/acteursjudiciaires/archiver/${id}`);
      setSuccess("تمت أرشفة المراسلة القضائية بنجاح.");
      await fetchCourriers();
    } catch (err) {
      setError(getErrorMessage(err, "تعذر أرشفة المراسلة."));
    }
  };

  const handleTransfer = async (courrier) => {
    const destinataire = window.prompt(TRANSFER_PROMPT, courrier.destinataire || "");
    if (destinataire === null) return;

    const destination = destinataire.trim();
    if (!destination) {
      setError(TRANSFER_PROMPT);
      setSuccess("");
      return;
    }

    const dataToSend = {
      idBureauOrdre: courrier.idBureauOrdre || null,
      date: new Date(courrier.date).toISOString(),
      tribunalSource: courrier.tribunalSource || "",
      sujet: courrier.sujet || "",
      direction: "Sortant",
      destinataire: destination,
      description: courrier.description || "",
      etatArchive: courrier.etatArchive === "Archive" ? "En cours" : courrier.etatArchive || "En cours",
      emplacement: courrier.emplacement || "",
      lienPdf: courrier.lienPdf || "",
      idService: Number(courrier.idService),
      estTransmissible: true,
      numeroDossier: courrier.numeroDossier || "",
      numeroDossierAnnee: courrier.numeroDossierAnnee || null,
      numeroDossierNombre: courrier.numeroDossierNombre || null,
      numeroDossierSujet: courrier.numeroDossierSujet || null,
    };

    try {
      await axios.put(`/api/acteursjudiciaires/${courrier.id}`, dataToSend);
      setSuccess(TRANSFER_SUCCESS);
      setError("");
      await fetchCourriers();
    } catch (err) {
      setError(getErrorMessage(err, TRANSFER_ERROR));
      setSuccess("");
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      if (!motCle.trim()) {
        await fetchCourriers();
        return;
      }
      const response = await axios.get(`/api/acteursjudiciaires/search?motCle=${encodeURIComponent(motCle.trim())}`);
      setCourriers(response.data);
    } catch (err) {
      setError(getErrorMessage(err, "تعذر البحث."));
    }
  };

  const exportToExcel = () => {
    fetch("/api/acteursjudiciaires/export/excel", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("تعذر التصدير.");
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "courriers-juridiques.xlsx";
        link.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => setError("تعذر تصدير ملف Excel."));
  };

  const importFromExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await axios.post("/api/acteursjudiciaires/import/excel", formData);
      const imported = response.data?.imported || 0;
      const errors = response.data?.errors || [];

      setSuccess(`تم استيراد ${imported} سجل.`);
      if (errors.length > 0) {
        setError(`اكتمل الاستيراد مع أخطاء: ${errors.join(" | ")}`);
      }
      await fetchCourriers();
    } catch (err) {
      setError(getErrorMessage(err, "تعذر استيراد ملف Excel."));
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  return (
    <div className="page-container" dir="rtl">
      <h1 className="page-title">تدبير المراسلات القضائية</h1>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="form-card">
        <h3>{editingId ? "تعديل" : "إضافة"} مراسلة قضائية</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <Field label="رقم ملف الاستئناف القضائي *">
              <input
                type="text"
                name="numeroDossier"
                value={safeForm.numeroDossier}
                onChange={handleChange}
                placeholder="مثال: 2026/15/3"
                required
              />
            </Field>
            <Field label="رقم مكتب الضبط (اختياري)">
              <input
                type="text"
                name="idBureauOrdre"
                value={safeForm.idBureauOrdre}
                onChange={handleChange}
                inputMode="numeric"
              />
            </Field>
            <Field label="التاريخ *">
              <input type="date" name="date" value={safeForm.date} onChange={handleChange} required />
            </Field>
            <Field label="المحكمة / المصدر *">
              <input type="text" name="tribunalSource" value={safeForm.tribunalSource} onChange={handleChange} required />
            </Field>
            <Field label="الموضوع *">
              <input type="text" name="sujet" value={safeForm.sujet} onChange={handleChange} required />
            </Field>
            <Field label="المرسل إليه">
              <input type="text" name="destinataire" value={safeForm.destinataire} onChange={handleChange} />
            </Field>
            <Field label="المصلحة المعنية *">
              <select name="idService" value={safeForm.idService} onChange={handleChange} required>
                <option value="">-- اختيار المصلحة --</option>
                {services.map((service) => (
                  <option key={service.idService} value={service.idService}>{service.nomService}</option>
                ))}
              </select>
            </Field>
            <Field label="الحالة">
              <select name="etatArchive" value={safeForm.etatArchive} onChange={handleChange}>
                <option value="Nouveau">جديد</option>
                <option value="En cours">قيد المعالجة</option>
                <option value="Traite">تمت المعالجة</option>
                <option value="Archive">مؤرشف</option>
              </select>
            </Field>
            <Field label="المكان / الموقع">
              <input type="text" name="emplacement" value={safeForm.emplacement} onChange={handleChange} />
            </Field>
            <Field label="رابط PDF / Word">
              <div className="document-upload">
                <label className={uploadingPdf ? "document-upload-button disabled" : "document-upload-button"}>
                  {uploadingPdf ? PDF_UPLOADING_LABEL : PDF_FILE_LABEL}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handlePdfSelect}
                    disabled={uploadingPdf}
                  />
                </label>
                <div className={safeForm.lienPdf ? "document-link-preview filled" : "document-link-preview"}>
                  {safeForm.lienPdf ? (
                    <>
                      <span title={safeForm.lienPdf}>{getDocumentName(safeForm.lienPdf)}</span>
                      <a href={getDocumentHref(safeForm.lienPdf)} target="_blank" rel="noreferrer">{OPEN_DOCUMENT_LABEL}</a>
                      <button type="button" onClick={clearDocumentLink}>{REMOVE_DOCUMENT_LABEL}</button>
                    </>
                  ) : (
                    <span>{PDF_FILE_LABEL}</span>
                  )}
                </div>
              </div>
              <input
                className="sr-only-field"
                type="text"
                name="lienPdf"
                value={safeForm.lienPdf}
                onChange={handleChange}
                tabIndex="-1"
                placeholder={uploadingPdf ? PDF_UPLOADING_LABEL : PDF_FILE_LABEL}
              />
            </Field>
            <div className="form-field full-width">
              <label>الملاحظات</label>
              <textarea name="description" value={safeForm.description} onChange={handleChange} rows="3" />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">{editingId ? "تعديل" : "إضافة"}</button>
            {editingId && <button type="button" className="btn-secondary" onClick={resetForm}>إلغاء</button>}
          </div>
        </form>
      </div>

      <div className="registry-panel">
        <div className="registry-panel-header"><h3>البحث والسجل</h3></div>
        <div className="filters">
          <form onSubmit={handleSearch} className="search-form">
            <input value={motCle} onChange={(e) => setMotCle(e.target.value)} placeholder="البحث بالمحكمة، رقم ملف الاستئناف القضائي، الموضوع، المرسل إليه، الحالة..." />
            <button type="submit" className="btn-primary">بحث</button>
            <button type="button" className="btn-secondary" onClick={() => { setMotCle(""); fetchCourriers(); }}>إعادة تعيين</button>
            <button type="button" className="btn-primary" onClick={exportToExcel}>
              تصدير Excel
            </button>
            <label className="btn-secondary import-label">
              {importing ? "جاري الاستيراد..." : "استيراد Excel"}
              <input type="file" accept=".xlsx,.xls" onChange={importFromExcel} hidden disabled={importing} />
            </label>
          </form>
        </div>
        <div className="data-table-wrapper">
          <table className="modern-table">
            <thead>
              <tr>
                <th>رقم مكتب الضبط</th><th>التاريخ</th><th>المحكمة / المصدر</th><th>رقم ملف الاستئناف القضائي</th><th>الموضوع</th>
                <th>المرسل إليه</th><th>المصلحة</th><th>الحالة</th><th>الموقع</th>
                <th>PDF</th><th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {courriers.length === 0 ? (
                <tr><td colSpan="11" style={{ textAlign: "center" }}>لا توجد مراسلات قضائية.</td></tr>
              ) : courriers.map((courrier) => (
                <tr key={courrier.id}>
                  <td>{courrier.idBureauOrdre || "-"}</td>
                  <td>{formatDate(courrier.date)}</td>
                  <td>{courrier.tribunalSource || "-"}</td>
                  <td>{courrier.numeroDossier || "-"}</td>
                  <td>{courrier.sujet || "-"}</td>
                  <td>{courrier.destinataire || "-"}</td>
                  <td>{courrier.serviceNom || courrier.idService || "-"}</td>
                  <td>{courrier.etatArchive || "-"}</td>
                  <td>{courrier.emplacement || "-"}</td>
                  <td>{courrier.lienPdf ? <a href={getDocumentHref(courrier.lienPdf)} target="_blank" rel="noreferrer">PDF</a> : "-"}</td>
                  <td className="action-icons">
                    <button type="button" onClick={() => handleEdit(courrier)}>تعديل</button>
                    {courrier.estTransmissible && (
                      <button type="button" onClick={() => handleTransfer(courrier)} title={TEXT_TRANSFER}>{TEXT_TRANSFER}</button>
                    )}
                    <button type="button" onClick={() => handleArchive(courrier.id)}>أرشفة</button>
                    <button type="button" onClick={() => handleDelete(courrier.id)}>حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div className="form-field"><label>{label}</label>{normalizeControlledChildren(children)}</div>;
}

function normalizeControlledChildren(children) {
  return React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;

    const props = {};
    const isFormControl = ["input", "select", "textarea"].includes(child.type);

    if (isFormControl && Object.prototype.hasOwnProperty.call(child.props, "value")) {
      props.value = child.props.value ?? "";
    }

    if (isFormControl && Object.prototype.hasOwnProperty.call(child.props, "checked")) {
      props.checked = Boolean(child.props.checked);
    }

    if (child.props.children) {
      props.children = normalizeControlledChildren(child.props.children);
    }

    return Object.keys(props).length > 0 ? React.cloneElement(child, props) : child;
  });
}

function getInitialForm(services = []) {
  return {
    idBureauOrdre: "",
    date: "",
    tribunalSource: "",
    sujet: "",
    destinataire: "",
    description: "",
    etatArchive: "Nouveau",
    emplacement: "",
    lienPdf: "",
    idService: getDefaultServiceId(services),
    estTransmissible: true,
    numeroDossier: "",
  };
}

function normalizeForm(form, services = []) {
  const initial = getInitialForm(services);
  return {
    ...initial,
    ...form,
    idBureauOrdre: String(form?.idBureauOrdre ?? ""),
    date: String(form?.date ?? ""),
    tribunalSource: String(form?.tribunalSource ?? ""),
    sujet: String(form?.sujet ?? ""),
    destinataire: String(form?.destinataire ?? ""),
    description: String(form?.description ?? ""),
    etatArchive: String(form?.etatArchive ?? initial.etatArchive),
    emplacement: String(form?.emplacement ?? ""),
    lienPdf: String(form?.lienPdf ?? ""),
    idService: form?.idService ?? initial.idService,
    estTransmissible: true,
    numeroDossier: String(form?.numeroDossier ?? ""),
  };
}

function getDefaultServiceId(services) {
  return services.length > 0 ? services[0].idService : "";
}

function getDocumentName(value) {
  if (!value) return "";

  const cleanValue = String(value).split("?")[0].split("#")[0];
  const fileName = cleanValue.split("/").filter(Boolean).pop() || cleanValue;

  return decodeURIComponent(fileName);
}

function getDocumentHref(value) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;

  const normalizedValue = value.startsWith("/") ? value : `/${value}`;
  const isReactDevServer = window.location.hostname === "localhost" && window.location.port === "3000";

  if (isReactDevServer) {
    return `http://localhost:5127${normalizedValue}`;
  }

  return normalizedValue;
}

function validateForm(form) {
  if (!form.date) return "التاريخ إجباري.";
  if (!form.tribunalSource.trim()) return "المحكمة / المصدر إجباري.";
  if (!form.sujet.trim()) return "الموضوع إجباري.";
  if (!form.numeroDossier.trim()) return "رقم ملف الاستئناف القضائي إجباري.";
  if (!/^\d+(\/\d+){0,2}$/.test(form.numeroDossier.trim())) {
    return "رقم ملف الاستئناف القضائي يجب أن يحتوي على أرقام و / فقط. مثال: 2026/15/3";
  }
  if (form.idBureauOrdre.trim() && !/^\d+(\/\d+)*$/.test(form.idBureauOrdre.trim())) {
    return "رقم مكتب الضبط يجب أن يحتوي على أرقام و / فقط.";
  }
  if (!form.idService) return "المصلحة المعنية إجبارية.";
  return "";
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function getErrorMessage(error, fallback) {
  const data = error.response?.data;

  if (typeof data === "string") return data;
  if (data?.message) return data.message;
  if (data?.title && data?.errors) {
    const details = Object.values(data.errors).flat().join(" ");
    return details || data.title;
  }
  if (data?.errors) {
    return Object.values(data.errors).flat().join(" ");
  }
  if (data?.title) return data.title;
  if (error.message) return error.message;
  return fallback;
}

export default GererCourriersJuridiques;
