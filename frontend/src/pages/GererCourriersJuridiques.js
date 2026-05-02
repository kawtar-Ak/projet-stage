import React, { useEffect, useState } from "react";
import axios from "axios";

const LEGACY_API_URL = process.env.REACT_APP_LEGACY_API_URL || "http://localhost:5127";

function GererCourriersJuridiques({ embedded = false }) {
  const [courriers, setCourriers] = useState([]);
  const [services, setServices] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [motCle, setMotCle] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [form, setForm] = useState(getInitialForm());
  const [selectedArchiveItem, setSelectedArchiveItem] = useState(null);
  const [retraitForm, setRetraitForm] = useState(getInitialRetraitForm());

  useEffect(() => {
    fetchCourriers();
    fetchServices();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(fetchCourriers, 250);
    return () => clearTimeout(timeout);
  }, [motCle]);

  const fetchCourriers = async () => {
    try {
      const url = motCle.trim()
        ? `/api/acteursjudiciaires/search?motCle=${encodeURIComponent(motCle.trim())}`
        : "/api/acteursjudiciaires";
      const response = await axios.get(url);
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
        setForm((prev) => ({
          ...prev,
          idService: prev.idService || response.data[0].idService,
        }));
      }
    } catch (err) {
      setError(getErrorMessage(err, "تعذر تحميل المصالح."));
    }
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : name === "idService" ? Number(value) : value,
    }));
  };

  const handleRetraitChange = (event) => {
    const { name, value } = event.target;
    setRetraitForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDocumentSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const response = await axios.post("/api/acteursjudiciaires/upload-pdf", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm((prev) => ({ ...prev, lienPdf: response.data.lienPdf || "" }));
      setSuccess("تم رفع الوثيقة. المرجو حفظ المراسلة للاحتفاظ بالرابط.");
    } catch (err) {
      setError(getErrorMessage(err, "تعذر رفع الوثيقة."));
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validateForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      idBureauOrdre: form.idBureauOrdre.trim(),
      date: new Date(form.date).toISOString(),
      tribunalSource: form.tribunalSource.trim(),
      sujet: form.sujet.trim(),
      direction: form.direction,
      destinataire: form.destinataire.trim(),
      description: form.description.trim(),
      etatArchive: form.etatArchive,
      emplacement: form.emplacement.trim(),
      lienPdf: form.lienPdf.trim(),
      idService: Number(form.idService),
      numeroDossier: form.numeroDossier.trim(),
      estTransmissible: Boolean(form.estTransmissible),
    };

    try {
      if (editingId) {
        await axios.put(`/api/acteursjudiciaires/${editingId}`, payload);
        setSuccess("تم تعديل المراسلة القضائية بنجاح.");
      } else {
        await axios.post("/api/acteursjudiciaires", payload);
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
    setForm({
      idBureauOrdre: courrier.idBureauOrdre || "",
      date: courrier.date ? courrier.date.slice(0, 10) : "",
      tribunalSource: courrier.tribunalSource || "",
      numeroDossier: courrier.numeroDossier || "",
      sujet: courrier.sujet || "",
      direction: courrier.direction || "Entrant",
      destinataire: courrier.destinataire || "",
      description: courrier.description || "",
      etatArchive: courrier.etatArchive || "Nouveau",
      emplacement: courrier.emplacement || "",
      lienPdf: courrier.lienPdf || "",
      idService: courrier.idService || getDefaultServiceId(services),
      estTransmissible: Boolean(courrier.estTransmissible),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("هل تريد حذف هذه المراسلة القضائية؟")) return;

    try {
      await axios.delete(`/api/acteursjudiciaires/${id}`);
      setSuccess("تم حذف المراسلة القضائية بنجاح.");
      await fetchCourriers();
    } catch (err) {
      setError(getErrorMessage(err, "تعذر حذف المراسلة القضائية."));
    }
  };

  const handleArchive = async (id) => {
    if (!window.confirm("هل تريد أرشفة هذه المراسلة القضائية؟")) return;

    try {
      await axios.put(`/api/acteursjudiciaires/archiver/${id}`);
      setSuccess("تمت أرشفة المراسلة القضائية بنجاح.");
      await fetchCourriers();
    } catch (err) {
      setError(getErrorMessage(err, "تعذر أرشفة المراسلة القضائية."));
    }
  };

  const openArchiveService = (courrier) => {
    setSelectedArchiveItem(courrier);
    setRetraitForm(getInitialRetraitForm());
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeArchiveService = () => {
    setSelectedArchiveItem(null);
    setRetraitForm(getInitialRetraitForm());
  };

  const handleSaveRetrait = async (event) => {
    event.preventDefault();
    if (!selectedArchiveItem) return;

    if (!retraitForm.motifDeRetrait.trim()) {
      setError("سبب السحب إجباري.");
      return;
    }

    try {
      const payload = {
        dateDeRetrait: retraitForm.dateDeRetrait
          ? new Date(retraitForm.dateDeRetrait).toISOString()
          : new Date().toISOString(),
        motifDeRetrait: retraitForm.motifDeRetrait.trim(),
        effectuePar: retraitForm.effectuePar.trim(),
        notes: retraitForm.notes.trim(),
      };

      const response = await axios.post(`/api/acteursjudiciaires/${selectedArchiveItem.id}/retraits`, payload);
      setSelectedArchiveItem(response.data);
      setRetraitForm(getInitialRetraitForm());
      setSuccess("تم تسجيل السحب بنجاح.");
      await fetchCourriers();
    } catch (err) {
      setError(getErrorMessage(err, "تعذر تسجيل السحب."));
    }
  };

  const handleSaveRetour = async (retraitId) => {
    try {
      const response = await axios.put(`/api/acteursjudiciaires/retraits/${retraitId}/retour`, {
        dateDeRetour: new Date().toISOString(),
        notes: retraitForm.notes.trim(),
      });
      setSelectedArchiveItem(response.data);
      setSuccess("تم تسجيل الإرجاع بنجاح.");
      await fetchCourriers();
    } catch (err) {
      setError(getErrorMessage(err, "تعذر تسجيل الإرجاع."));
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(getInitialForm(services));
    setError("");
  };

  const exportToExcel = () => {
    fetch(`${LEGACY_API_URL}/api/acteursjudiciaires/export/excel`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((response) => {
        if (!response.ok) throw new Error("تعذر التصدير.");
        return response.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "courriers-juridiques.xlsx";
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => setError("تعذر تصدير ملف Excel."));
  };

  const handleImportExcel = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    setImporting(true);
    setError("");
    setSuccess("");

    try {
      const response = await axios.post("/api/acteursjudiciaires/import/excel", formData);
      const imported = response.data?.imported || 0;
      const errors = response.data?.errors || [];
      setSuccess(`تم الاستيراد: ${imported} سطر مضاف.`);
      if (errors.length > 0) setError(errors.join(" | "));
      await fetchCourriers();
    } catch (err) {
      setError(getErrorMessage(err, "تعذر استيراد ملف Excel."));
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  };

  return (
    <div className={embedded ? "courriers-juridiques-content" : "page-container"} dir="rtl">
      {!embedded && <h1 className="page-title">تدبير المراسلات القضائية</h1>}

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="form-card">
        <h3>{editingId ? "تعديل" : "إضافة"} مراسلة قضائية</h3>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field">
              <label>الرقم الاستئنافي للملف *</label>
              <input name="numeroDossier" value={form.numeroDossier} onChange={handleChange} placeholder="2026/15/3" required />
            </div>

            <div className="form-field">
              <label>التاريخ *</label>
              <input type="date" name="date" value={form.date} onChange={handleChange} required />
            </div>

            <div className="form-field">
              <label>المحكمة / المصدر *</label>
              <input name="tribunalSource" value={form.tribunalSource} onChange={handleChange} required />
            </div>

            <div className="form-field">
              <label>رقم مكتب الضبط</label>
              <input name="idBureauOrdre" value={form.idBureauOrdre} onChange={handleChange} />
            </div>

            <div className="form-field">
              <label>الموضوع *</label>
              <input name="sujet" value={form.sujet} onChange={handleChange} required />
            </div>

            <div className="form-field">
              <label>نوع المراسلة</label>
              <select name="direction" value={form.direction} onChange={handleChange}>
                <option value="Entrant">واردة</option>
                <option value="Sortant">صادرة</option>
                <option value="Interne">داخلية</option>
              </select>
            </div>

            <div className="form-field">
              <label>المرسل إليه</label>
              <input name="destinataire" value={form.destinataire} onChange={handleChange} />
            </div>

            <div className="form-field">
              <label>المصلحة *</label>
              <select name="idService" value={form.idService} onChange={handleChange} required>
                <option value="">-- اختيار المصلحة --</option>
                {services.map((service) => (
                  <option key={service.idService} value={service.idService}>
                    {service.nomService}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>الحالة</label>
              <select name="etatArchive" value={form.etatArchive} onChange={handleChange}>
                <option value="Nouveau">جديد</option>
                <option value="En cours">قيد المعالجة</option>
                <option value="Traite">تمت المعالجة</option>
                <option value="Archive">مؤرشف</option>
              </select>
            </div>

            <div className="form-field">
              <label>قابل للإحالة</label>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  name="estTransmissible"
                  checked={form.estTransmissible}
                  onChange={handleChange}
                />
                نعم
              </label>
            </div>

            <div className="form-field">
              <label>الموقع</label>
              <input name="emplacement" value={form.emplacement} onChange={handleChange} />
            </div>

            <div className="form-field full-width">
              <label>الوثيقة PDF / Word</label>
              <div className="document-control">
                <label className="document-upload-button">
                  {uploading ? "جاري رفع الملف..." : "اختيار ملف"}
                  <input type="file" accept=".pdf,.doc,.docx" onChange={handleDocumentSelect} />
                </label>
                <div className={form.lienPdf ? "document-link-preview filled" : "document-link-preview"}>
                  <span title={form.lienPdf || ""}>{form.lienPdf ? getDocumentName(form.lienPdf) : "لم يتم اختيار ملف"}</span>
                  {form.lienPdf && (
                    <a href={getDocumentHref(form.lienPdf)} target="_blank" rel="noreferrer">
                      فتح
                    </a>
                  )}
                </div>
                <div className="document-link-input">
                  <input name="lienPdf" value={form.lienPdf} onChange={handleChange} placeholder="/uploads/documents/..." />
                  {form.lienPdf && (
                    <a href={getDocumentHref(form.lienPdf)} target="_blank" rel="noreferrer">
                      فتح
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="form-field full-width">
              <label>الملاحظات</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows="3" />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">{editingId ? "تعديل" : "إضافة"}</button>
            {editingId && <button type="button" className="btn-secondary" onClick={resetForm}>إلغاء</button>}
          </div>
        </form>
      </div>

      {selectedArchiveItem && (
        <div className="form-card archive-service-panel">
          <div className="registry-panel-header">
            <div>
              <h3>خدمة الأرشيف: السحب والإرجاع</h3>
              <p>
                {selectedArchiveItem.numeroDossier || "-"} - {selectedArchiveItem.sujet || "-"}
              </p>
            </div>
            <button type="button" className="btn-secondary" onClick={closeArchiveService}>
              إغلاق
            </button>
          </div>

          <form onSubmit={handleSaveRetrait}>
            <div className="form-grid">
              <div className="form-field">
                <label>تاريخ السحب</label>
                <input
                  type="date"
                  name="dateDeRetrait"
                  value={retraitForm.dateDeRetrait}
                  onChange={handleRetraitChange}
                />
              </div>

              <div className="form-field">
                <label>سبب السحب *</label>
                <input
                  name="motifDeRetrait"
                  value={retraitForm.motifDeRetrait}
                  onChange={handleRetraitChange}
                  required
                />
              </div>

              <div className="form-field">
                <label>تم بواسطة</label>
                <input
                  name="effectuePar"
                  value={retraitForm.effectuePar}
                  onChange={handleRetraitChange}
                />
              </div>

              <div className="form-field full-width">
                <label>ملاحظات</label>
                <textarea
                  name="notes"
                  value={retraitForm.notes}
                  onChange={handleRetraitChange}
                  rows="2"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">تسجيل السحب</button>
            </div>
          </form>

          <div className="data-table-wrapper">
            <h3>سجل السحوبات</h3>
            <table className="modern-table">
              <thead>
                <tr>
                  <th>تاريخ السحب</th>
                  <th>السبب</th>
                  <th>تم بواسطة</th>
                  <th>تاريخ الإرجاع</th>
                  <th>ملاحظات</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {(selectedArchiveItem.retraits || []).length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: "center" }}>لا توجد سحوبات.</td></tr>
                ) : (
                  selectedArchiveItem.retraits.map((retrait) => (
                    <tr key={retrait.id}>
                      <td>{formatDate(retrait.dateDeRetrait)}</td>
                      <td>{retrait.motifDeRetrait || "-"}</td>
                      <td>{retrait.effectuePar || "-"}</td>
                      <td>{retrait.dateDeRetour ? formatDate(retrait.dateDeRetour) : "-"}</td>
                      <td>{retrait.notes || "-"}</td>
                      <td>
                        {!retrait.dateDeRetour ? (
                          <button type="button" onClick={() => handleSaveRetour(retrait.id)}>
                            تسجيل الإرجاع
                          </button>
                        ) : (
                          "تم الإرجاع"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="registry-panel">
        <div className="registry-panel-header">
          <h3>البحث والسجل</h3>
          <div className="registry-tools">
            <button type="button" className="btn-primary" onClick={exportToExcel}>تصدير Excel</button>
            <label className="btn-secondary import-label">
              {importing ? "جاري الاستيراد..." : "استيراد Excel"}
              <input type="file" accept=".xlsx" onChange={handleImportExcel} />
            </label>
          </div>
        </div>

        <div className="filters">
          <input value={motCle} onChange={(e) => setMotCle(e.target.value)} placeholder="البحث بالمحكمة، الرقم الاستئنافي للملف، الموضوع..." />
          <button type="button" className="btn-secondary" onClick={() => setMotCle("")}>إعادة تعيين</button>
        </div>

        <div className="data-table-wrapper">
          <table className="modern-table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>المحكمة / المصدر</th>
                <th>الرقم الاستئنافي للملف</th>
                <th>الموضوع</th>
                <th>نوع المراسلة</th>
                <th>المرسل إليه</th>
                <th>المصلحة</th>
                <th>الحالة</th>
                <th>الموقع</th>
                <th>السحوبات</th>
                <th>PDF</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {courriers.length === 0 ? (
                <tr><td colSpan="12" style={{ textAlign: "center" }}>لا توجد مراسلات قضائية.</td></tr>
              ) : (
                courriers.map((courrier) => (
                  <tr key={courrier.id}>
                    <td>{formatDate(courrier.date)}</td>
                    <td>{courrier.tribunalSource || "-"}</td>
                    <td>{courrier.numeroDossier || "-"}</td>
                    <td>{courrier.sujet || "-"}</td>
                    <td>{formatDirection(courrier.direction)}</td>
                    <td>{courrier.destinataire || "-"}</td>
                    <td>{courrier.serviceNom || courrier.idService || "-"}</td>
                    <td>{formatEtat(courrier.etatArchive)}</td>
                    <td>{courrier.emplacement || "-"}</td>
                    <td>{courrier.retraitsCount ?? 0}</td>
                    <td>{courrier.lienPdf ? <a href={getDocumentHref(courrier.lienPdf)} target="_blank" rel="noreferrer">فتح</a> : "-"}</td>
                    <td className="action-icons">
                      <button type="button" onClick={() => handleEdit(courrier)}>تعديل</button>
                      <button type="button" onClick={() => openArchiveService(courrier)}>خدمة الأرشيف</button>
                      <button type="button" onClick={() => handleArchive(courrier.id)}>أرشفة</button>
                      <button type="button" onClick={() => handleDelete(courrier.id)}>حذف</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function getInitialForm(services = []) {
  return {
    idBureauOrdre: "",
    date: "",
    tribunalSource: "",
    numeroDossier: "",
    sujet: "",
    direction: "Entrant",
    destinataire: "",
    description: "",
    etatArchive: "Nouveau",
    emplacement: "",
    lienPdf: "",
    idService: getDefaultServiceId(services),
    estTransmissible: true,
  };
}

function getInitialRetraitForm() {
  return {
    dateDeRetrait: new Date().toISOString().slice(0, 10),
    motifDeRetrait: "",
    effectuePar: "",
    notes: "",
  };
}

function getDefaultServiceId(services) {
  return services.length > 0 ? services[0].idService : "";
}

function validateForm(form) {
  if (!form.date) return "التاريخ إجباري.";
  if (!form.tribunalSource.trim()) return "المحكمة / المصدر إجباري.";
  if (!form.numeroDossier.trim()) return "الرقم الاستئنافي للملف إجباري.";
  if (!/^\d+(\/\d+){0,2}$/.test(form.numeroDossier.trim())) {
    return "الرقم الاستئنافي للملف غير صحيح. مثال: 2026/15/3.";
  }
  if (!form.sujet.trim()) return "الموضوع إجباري.";
  if (!form.idService) return "المصلحة إجبارية.";
  return "";
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function getDocumentHref(value) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;

  const normalizedValue = value.startsWith("/") ? value : `/${value}`;
  const isReactDevServer = window.location.hostname === "localhost" && window.location.port === "3000";

  return isReactDevServer ? `http://localhost:5127${normalizedValue}` : normalizedValue;
}

function getDocumentName(value) {
  if (!value) return "";
  const cleanValue = String(value).split("?")[0].split("#")[0];
  return decodeURIComponent(cleanValue.split("/").filter(Boolean).pop() || cleanValue);
}

function formatDirection(value) {
  if (value === "Sortant") return "صادرة";
  if (value === "Interne") return "داخلية";
  return "واردة";
}

function formatEtat(value) {
  if (value === "En cours") return "قيد المعالجة";
  if (value === "Traite") return "تمت المعالجة";
  if (value === "Archive") return "مؤرشف";
  return "جديد";
}

function getErrorMessage(error, fallback) {
  if (typeof error.response?.data === "string") return error.response.data;
  if (error.response?.data?.message) return error.response.data.message;
  if (error.message) return error.message;
  return fallback;
}

export default GererCourriersJuridiques;
