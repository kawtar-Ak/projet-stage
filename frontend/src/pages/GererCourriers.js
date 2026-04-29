import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const TYPE_WARIDAT = "Waridat";
const TYPE_MORASALAT = "Morasalat";
const MODE_LIEE = "Liee";
const MODE_INDEPENDANTE = "Independante";
const CORRESPONDANCE_SORTANTE = "Sortante";
const CORRESPONDANCE_ENTRANTE = "Entrante";
const DOCUMENT_UPLOAD_SUCCESS = "\u062a\u0645 \u0631\u0641\u0639 \u0627\u0644\u0645\u0644\u0641 \u0648\u062a\u0639\u0628\u0626\u0629 \u0627\u0644\u0631\u0627\u0628\u0637 \u062a\u0644\u0642\u0627\u0626\u064a\u0627.";
const DOCUMENT_UPLOAD_ERROR = "\u062a\u0639\u0630\u0631 \u0631\u0641\u0639 \u0627\u0644\u0645\u0644\u0641. \u0627\u0644\u0645\u0633\u0645\u0648\u062d: PDF \u0623\u0648 Word.";
const DOCUMENT_FILE_LABEL = "\u0627\u062e\u062a\u064a\u0627\u0631 \u0645\u0644\u0641 PDF \u0623\u0648 Word";
const DOCUMENT_UPLOADING_LABEL = "\u062c\u0627\u0631\u064a \u0631\u0641\u0639 \u0627\u0644\u0645\u0644\u0641...";
const OPEN_DOCUMENT_LABEL = "\u0641\u062a\u062d \u0627\u0644\u0645\u0644\u0641";
const REMOVE_DOCUMENT_LABEL = "\u062d\u0630\u0641";
const ALLOWED_DOCUMENT_EXTENSIONS = [".pdf", ".doc", ".docx"];

function GererCourriers() {
  const [courriers, setCourriers] = useState([]);
  const [waridat, setWaridat] = useState([]);
  const [services, setServices] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [motCle, setMotCle] = useState("");
  const [numeroRecherche, setNumeroRecherche] = useState("");
  const [dateRecherche, setDateRecherche] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [importing, setImporting] = useState(false);
  const [savingLinked, setSavingLinked] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [form, setForm] = useState(getInitialForm());

  const selectedParent = useMemo(
    () => waridat.find((item) => String(item.id) === String(form.parentId)),
    [waridat, form.parentId]
  );

  const isMorasalat = form.typeRegistre === TYPE_MORASALAT;
  const isLinkedMorasalat = isMorasalat && form.morasalatMode === MODE_LIEE;
  const hasActiveSearch = Boolean(motCle.trim() || numeroRecherche.trim() || dateRecherche);
  const showIdBureauOrdreInput = !isLinkedMorasalat;
  const displayedIdBureauOrdre = isLinkedMorasalat
    ? selectedParent?.idBureauOrdre || form.parentIdBureauOrdre || ""
    : form.idBureauOrdre;

  useEffect(() => {
    fetchCourriers();
    fetchWaridat();
    fetchServices();
  }, []);

  const fetchCourriers = async () => {
    try {
      const response = await axios.get("/api/courriers");
      setCourriers(response.data);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "تعذر تحميل المراسلات."));
    }
  };

  const fetchWaridat = async () => {
    try {
      const response = await axios.get("/api/courriers/waridat");
      setWaridat(response.data);
    } catch (err) {
      setError(getErrorMessage(err, "تعذر تحميل الواردات."));
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

  const selectWaridat = () => {
    setEditingId(null);
    setForm((prev) => ({
      ...getInitialForm(services),
      idService: prev.idService || getDefaultServiceId(services),
      typeRegistre: TYPE_WARIDAT,
      morasalatMode: MODE_INDEPENDANTE,
      parentLocked: false,
      parentIdBureauOrdre: "",
      typeCorrespondance: CORRESPONDANCE_SORTANTE,
      direction: "Entrant",
    }));
    setError("");
    setSuccess("");
  };

  const selectMorasalat = () => {
    setEditingId(null);
    setForm((prev) => ({
      ...getInitialForm(services),
      idService: prev.idService || getDefaultServiceId(services),
      typeRegistre: TYPE_MORASALAT,
      morasalatMode: MODE_INDEPENDANTE,
      parentLocked: false,
      parentIdBureauOrdre: "",
      typeCorrespondance: prev.typeCorrespondance || CORRESPONDANCE_SORTANTE,
      direction: "Sortant",
    }));
    setError("");
    setSuccess("");
  };

  const selectCorrespondance = (typeCorrespondance) => {
    setForm((prev) => ({
      ...prev,
      typeRegistre: TYPE_MORASALAT,
      morasalatMode: prev.parentLocked ? MODE_LIEE : MODE_INDEPENDANTE,
      parentId: prev.parentLocked ? prev.parentId : "",
      parentIdBureauOrdre: prev.parentLocked ? prev.parentIdBureauOrdre : "",
      typeCorrespondance,
      direction: typeCorrespondance === CORRESPONDANCE_SORTANTE ? "Sortant" : "Interne",
    }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : name === "idService" ? Number(value) : value,
    }));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(getInitialForm(services, form.typeRegistre, form.typeCorrespondance));
    setError("");
    setSuccess("");
  };

  const handleDocumentSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const hasAllowedExtension = ALLOWED_DOCUMENT_EXTENSIONS.some((extension) => fileName.endsWith(extension));
    if (!hasAllowedExtension) {
      setError(DOCUMENT_UPLOAD_ERROR);
      e.target.value = "";
      return;
    }

    setUploadingDocument(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await axios.post("/api/courriers/upload-document", formData);
      const lienPdf = response.data?.lienPdf || "";

      if (!lienPdf) {
        throw new Error(DOCUMENT_UPLOAD_ERROR);
      }

      setForm((prev) => ({ ...prev, lienPdf }));
      setSuccess(DOCUMENT_UPLOAD_SUCCESS);
    } catch (err) {
      setError(getErrorMessage(err, DOCUMENT_UPLOAD_ERROR));
    } finally {
      setUploadingDocument(false);
      e.target.value = "";
    }
  };

  const clearDocumentLink = () => {
    setForm((prev) => ({ ...prev, lienPdf: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      await saveCurrentCourrier();
      setSuccess(editingId ? "تم تعديل المعطيات بنجاح." : "تمت الإضافة بنجاح.");
      resetForm();
      await fetchCourriers();
      await fetchWaridat();
    } catch (err) {
      setError(getErrorMessage(err, "تعذر حفظ المعطيات."));
    }
  };

  const saveCurrentCourrier = async () => {
    const validationError = validateForm(form, isLinkedMorasalat);
    if (validationError) {
      throw new Error(validationError);
    }

    const dataToSend = {
      idBureauOrdre: isLinkedMorasalat ? "" : form.idBureauOrdre.trim(),
      date: new Date(form.date).toISOString(),
      source: form.source.trim(),
      sujet: form.sujet.trim(),
      destinataire: form.destinataire.trim(),
      description: form.description.trim(),
      etat: form.etat,
      lienPdf: form.lienPdf.trim(),
      direction: getDirection(form),
      typeRegistre: form.typeRegistre,
      typeCorrespondance: isMorasalat ? form.typeCorrespondance : null,
      parentId: isLinkedMorasalat ? Number(form.parentId) : null,
      idService: Number(form.idService),
      numeroDeCourrier: String(form.numeroDeCourrier || "").trim(),
      // Convertit la case a cocher en booleen attendu par l'API.
      estTransmissible: Boolean(form.estTransmissible),
    };

    if (editingId) {
      const response = await axios.put(`/api/courriers/${editingId}`, dataToSend);
      return response.data;
    }

    const response = await axios.post("/api/courriers", dataToSend);
    return response.data;
  };

  const handleSaveWaridatAndAddMorasalat = async () => {
    if (savingLinked) return;

    setError("");
    setSuccess("");

    if (form.typeRegistre !== TYPE_WARIDAT) return;

    try {
      setSavingLinked(true);
      const existingWarida = !editingId ? findMainWaridatByNumero(courriers, form.idBureauOrdre) : null;
      const savedWarida = existingWarida || await saveCurrentCourrier();
      await fetchCourriers();
      await fetchWaridat();
      handleAddMorasalat(savedWarida);
      setSuccess(existingWarida
        ? "تم فتح نموذج مراسلة مرتبطة بالواردة الموجودة."
        : "تم حفظ الواردة. يمكن الآن إضافة مراسلة مرتبطة بها.");
    } catch (err) {
      setError(getErrorMessage(err, "تعذر حفظ الواردة."));
    } finally {
      setSavingLinked(false);
    }
  };

  const handleEdit = (courrier) => {
    const typeRegistre = courrier.typeRegistre || (courrier.parentId ? TYPE_MORASALAT : TYPE_WARIDAT);
    const typeCorrespondance = courrier.typeCorrespondance || CORRESPONDANCE_SORTANTE;
    const morasalatMode = typeRegistre === TYPE_MORASALAT && courrier.parentId
      ? MODE_LIEE
      : MODE_INDEPENDANTE;

    setEditingId(courrier.id);
    setForm({
      idBureauOrdre: courrier.idBureauOrdre || "",
      date: courrier.date ? courrier.date.slice(0, 10) : "",
      source: courrier.source || "",
      sujet: courrier.sujet || "",
      destinataire: courrier.destinataire || "",
      description: courrier.description || "",
      etat: courrier.etat || "Nouveau",
      lienPdf: courrier.lienPdf || "",
      direction: courrier.direction || "Entrant",
      idService: courrier.idService || getDefaultServiceId(services),
      numeroDeCourrier: courrier.numeroDeCourrier || "",
      typeRegistre,
      morasalatMode,
      parentId: courrier.parentId || "",
      parentLocked: Boolean(courrier.parentId),
      parentIdBureauOrdre: courrier.parentId ? courrier.idBureauOrdre || "" : "",
      typeCorrespondance,
      estTransmissible: Boolean(courrier.estTransmissible),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAddMorasalat = (warida) => {
    const parentId = warida.id || warida.idEntite;

    if (!parentId) {
      setError("تعذر تحديد الواردة المرتبطة.");
      return;
    }

    setEditingId(null);
    setForm({
      ...getInitialForm(services, TYPE_MORASALAT, CORRESPONDANCE_SORTANTE),
      idBureauOrdre: "",
      parentId,
      parentLocked: true,
      parentIdBureauOrdre: warida.idBureauOrdre || "",
      morasalatMode: MODE_LIEE,
      typeRegistre: TYPE_MORASALAT,
      typeCorrespondance: CORRESPONDANCE_SORTANTE,
      direction: "Sortant",
      idService: warida.idService || getDefaultServiceId(services),
    });
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("هل تريد حذف هذا السجل؟")) return;

    try {
      await axios.delete(`/api/courriers/${id}`);
      setSuccess("تم الحذف بنجاح.");
      await fetchCourriers();
      await fetchWaridat();
    } catch (err) {
      setError(getErrorMessage(err, "تعذر الحذف."));
    }
  };

  const handleArchive = async (id) => {
    if (!window.confirm("هل تريد أرشفة هذا السجل؟")) return;

    try {
      await axios.put(`/api/courriers/archiver/${id}`);
      setSuccess("تمت الأرشفة بنجاح.");
      await fetchCourriers();
      await fetchWaridat();
    } catch (err) {
      setError(getErrorMessage(err, "تعذر الأرشفة."));
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    await runSearch();
  };

  const runSearch = async () => {
    try {
      if (!motCle.trim() && !numeroRecherche.trim() && !dateRecherche) {
        await fetchCourriers();
        return;
      }

      const params = new URLSearchParams();
      if (motCle.trim()) params.append("motCle", motCle.trim());
      if (numeroRecherche.trim()) params.append("numeroBureauOrdre", numeroRecherche.trim());
      if (dateRecherche) params.append("date", dateRecherche);

      const response = await axios.get(`/api/courriers/search?${params.toString()}`);
      setCourriers(response.data);
    } catch (err) {
      setError(getErrorMessage(err, "تعذر البحث."));
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      runSearch();
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [motCle, numeroRecherche, dateRecherche]);

  const exportToExcel = () => {
    fetch("/api/courriers/export/excel", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("تعذر التصدير.");
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "courriers-administratifs.xlsx";
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => setError("تعذر تصدير ملف Excel."));
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    setImporting(true);
    setError("");
    setSuccess("");

    try {
      const response = await axios.post("/api/courriers/import/excel", formData);
      const imported = response.data?.imported || 0;
      const errors = response.data?.errors || [];

      setSuccess(`تم استيراد ${imported} سجل.`);
      if (errors.length > 0) {
        setError(`اكتمل الاستيراد مع أخطاء: ${errors.join(" | ")}`);
      }

      await fetchCourriers();
      await fetchWaridat();
    } catch (err) {
      setError(getErrorMessage(err, "تعذر استيراد ملف Excel."));
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const renderCourriersTable = () => (
    <div className="data-table-wrapper search-results-table">
      <h3>{hasActiveSearch ? `نتائج البحث (${courriers.length})` : `السجل (${courriers.length})`}</h3>

      <table className="modern-table">
        <thead>
          <tr>
            <th>رقم مكتب الضبط</th>
            <th>نوع السجل</th>
            <th>الارتباط</th>
            <th>التاريخ</th>
            <th>المصدر</th>
            <th>الموضوع</th>
            <th>المرسل إليه</th>
            <th>المصلحة</th>
            <th>الحالة</th>
            <th>قابل للإحالة</th>
            <th>PDF</th>
            <th>الإجراءات</th>
          </tr>
        </thead>

        <tbody>
          {courriers.length === 0 ? (
            <tr>
              <td colSpan="12" style={{ textAlign: "center" }}>
                لا توجد سجلات.
              </td>
            </tr>
          ) : (
            courriers.map((courrier) => (
              <tr key={courrier.id}>
                <td>{courrier.idBureauOrdre || "-"}</td>
                <td>{formatRegistre(courrier)}</td>
                <td>{courrier.parentId ? "تفصيل مرتبط" : "سطر رئيسي"}</td>
                <td>{courrier.date ? new Date(courrier.date).toLocaleDateString() : "-"}</td>
                <td>{courrier.source || "-"}</td>
                <td>{courrier.sujet || "-"}</td>
                <td>{courrier.destinataire || "-"}</td>
                <td>{courrier.serviceNom || courrier.idService}</td>
                <td>{formatEtat(courrier.etat)}</td>
                {/* Affichage direct du booleen renvoye par l'API. */}
                <td>{courrier.estTransmissible ? "نعم" : "لا"}</td>
                <td>
                  {courrier.lienPdf ? (
                    <a href={getDocumentHref(courrier.lienPdf)} target="_blank" rel="noreferrer">عرض</a>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="action-icons">
                  {isMainWaridat(courrier) && (
                    <button
                      type="button"
                      onClick={() => handleAddMorasalat(courrier)}
                      title="إضافة مراسلة"
                    >
                      إضافة مراسلة
                    </button>
                  )}
                  <button type="button" onClick={() => handleEdit(courrier)} title="تعديل">تعديل</button>
                  <button type="button" onClick={() => handleArchive(courrier.id)} title="أرشفة">أرشفة</button>
                  <button type="button" onClick={() => handleDelete(courrier.id)} title="حذف">حذف</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="page-container" dir="rtl">
      <h1 className="page-title">تدبير المراسلات الإدارية</h1>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="registry-choice">
        <button
          type="button"
          className={form.typeRegistre === TYPE_WARIDAT ? "choice-pill active" : "choice-pill"}
          onClick={selectWaridat}
        >
          الواردات
        </button>
        <button
          type="button"
          className={form.typeRegistre === TYPE_MORASALAT ? "choice-pill active" : "choice-pill"}
          onClick={selectMorasalat}
        >
          المراسلات
        </button>
      </div>

      {isMorasalat && (
        <div className="registry-choice sub-choice">
          <button
            type="button"
            className={form.typeCorrespondance === CORRESPONDANCE_SORTANTE ? "choice-pill active" : "choice-pill"}
            onClick={() => selectCorrespondance(CORRESPONDANCE_SORTANTE)}
          >
            المراسلات الصادرة
          </button>
          <button
            type="button"
            className={form.typeCorrespondance === CORRESPONDANCE_ENTRANTE ? "choice-pill active" : "choice-pill"}
            onClick={() => selectCorrespondance(CORRESPONDANCE_ENTRANTE)}
          >
            المراسلات الواردة
          </button>
        </div>
      )}

      <div className="form-card">
        <h3>{editingId ? "تعديل" : "إضافة"} {formatFormTitle(form)}</h3>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            {showIdBureauOrdreInput ? (
              <div className="form-field">
                <label>رقم مكتب الضبط *</label>
                <input
                  type="text"
                  name="idBureauOrdre"
                  value={form.idBureauOrdre}
                  onChange={handleChange}
                  placeholder="مثال: 12/2026"
                  required
                />
              </div>
            ) : (
              <div className="form-field">
                <label>رقم مكتب الضبط</label>
                <input
                  type="text"
                  value={displayedIdBureauOrdre || "سيؤخذ الرقم من الواردة المرتبطة"}
                  readOnly
                />
              </div>
            )}

            <div className="form-field">
              <label>التاريخ *</label>
              <input type="date" name="date" value={form.date} onChange={handleChange} required />
            </div>

            <div className="form-field">
              <label>{isMorasalat && form.typeCorrespondance === CORRESPONDANCE_SORTANTE ? "المرسل" : "المصدر"} *</label>
              <input
                type="text"
                name="source"
                value={form.source}
                onChange={handleChange}
                placeholder="مثال: وزارة، محكمة، مصلحة..."
                required
              />
            </div>

            <div className="form-field">
              <label>{isMorasalat && form.typeCorrespondance === CORRESPONDANCE_ENTRANTE ? "الجواب / الموضوع" : "الموضوع"} *</label>
              <input
                type="text"
                name="sujet"
                value={form.sujet}
                onChange={handleChange}
                placeholder="موضوع المراسلة"
                required
              />
            </div>

            <div className="form-field">
              <label>المرسل إليه</label>
              <input
                type="text"
                name="destinataire"
                value={form.destinataire}
                onChange={handleChange}
                placeholder="المصلحة أو الشخص المرسل إليه"
              />
            </div>

            <div className="form-field">
              <label>المصلحة المعنية *</label>
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
              <select name="etat" value={form.etat} onChange={handleChange}>
                <option value="Nouveau">جديد</option>
                <option value="En cours">قيد المعالجة</option>
                <option value="Traite">تمت المعالجة</option>
                <option value="Archive">مؤرشف</option>
              </select>
            </div>

            <div className="form-field">
              <label>الرقم الداخلي</label>
              <input
                type="text"
                name="numeroDeCourrier"
                value={form.numeroDeCourrier}
                onChange={handleChange}
              />
            </div>

            <div className="form-field">
              <label>رابط PDF / Word</label>
              <div className="document-upload">
                <label className={uploadingDocument ? "document-upload-button disabled" : "document-upload-button"}>
                  {uploadingDocument ? DOCUMENT_UPLOADING_LABEL : DOCUMENT_FILE_LABEL}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleDocumentSelect}
                    disabled={uploadingDocument}
                  />
                </label>
                <div className={form.lienPdf ? "document-link-preview filled" : "document-link-preview"}>
                  {form.lienPdf ? (
                    <>
                      <span title={form.lienPdf}>{getDocumentName(form.lienPdf)}</span>
                      <a href={getDocumentHref(form.lienPdf)} target="_blank" rel="noreferrer">{OPEN_DOCUMENT_LABEL}</a>
                      <button type="button" onClick={clearDocumentLink}>{REMOVE_DOCUMENT_LABEL}</button>
                    </>
                  ) : (
                    <span>{DOCUMENT_FILE_LABEL}</span>
                  )}
                </div>
              </div>
              <input
                className="sr-only-field"
                type="text"
                name="lienPdf"
                value={form.lienPdf}
                onChange={handleChange}
                tabIndex="-1"
                placeholder={uploadingDocument ? DOCUMENT_UPLOADING_LABEL : DOCUMENT_FILE_LABEL}
              />
            </div>

            {/* Case liee au champ EstTransmissible cote backend. */}
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

            <div className="form-field full-width">
              <label>الملاحظات</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows="3"
                placeholder="ملاحظات..."
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editingId ? "تعديل" : "إضافة"}
            </button>

            {form.typeRegistre === TYPE_WARIDAT && (
              <button
                type="button"
                className="btn-secondary"
                onClick={handleSaveWaridatAndAddMorasalat}
                disabled={savingLinked}
              >
                {savingLinked ? "جاري الحفظ..." : "إضافة مراسلة مرتبطة"}
              </button>
            )}

            {editingId && (
              <button type="button" className="btn-secondary" onClick={resetForm}>
                إلغاء
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="registry-panel">
        <div className="registry-panel-header">
          <h3>البحث والسجل</h3>
          <div className="registry-tools">
            <button type="button" className="btn-primary" onClick={exportToExcel}>
              تصدير Excel
            </button>
            <label className="btn-secondary import-label">
              {importing ? "جاري الاستيراد..." : "استيراد Excel"}
              <input type="file" accept=".xlsx" onChange={handleFileSelect} />
            </label>
          </div>
        </div>

        <div className="filters">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              value={motCle}
              onChange={(e) => setMotCle(e.target.value)}
              placeholder="كلمة البحث: المصدر، الموضوع، الحالة..."
            />
            <input
              type="text"
              value={numeroRecherche}
              onChange={(e) => setNumeroRecherche(e.target.value)}
              placeholder="رقم مكتب الضبط"
            />
            <input
              type="date"
              value={dateRecherche}
              onChange={(e) => setDateRecherche(e.target.value)}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setMotCle("");
                setNumeroRecherche("");
                setDateRecherche("");
                fetchCourriers();
              }}
            >
              إعادة تعيين
            </button>
          </form>
        </div>

        {renderCourriersTable()}
      </div>

    </div>
  );
}

function getInitialForm(services = [], typeRegistre = TYPE_WARIDAT, typeCorrespondance = CORRESPONDANCE_SORTANTE) {
  return {
    idBureauOrdre: "",
    date: "",
    source: "",
    sujet: "",
    destinataire: "",
    description: "",
    etat: "Nouveau",
    lienPdf: "",
    direction: typeRegistre === TYPE_MORASALAT && typeCorrespondance === CORRESPONDANCE_SORTANTE ? "Sortant" : "Entrant",
    idService: getDefaultServiceId(services),
    numeroDeCourrier: "",
    typeRegistre,
    morasalatMode: MODE_INDEPENDANTE,
    parentId: "",
    parentLocked: false,
    parentIdBureauOrdre: "",
    typeCorrespondance,
    // Valeur par defaut pour un nouveau courrier.
    estTransmissible: false,
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

function validateForm(form, isLinkedMorasalat) {
  if (!isLinkedMorasalat && !form.idBureauOrdre.trim()) {
    return "رقم مكتب الضبط إجباري بالنسبة للسطر الرئيسي.";
  }

  if (isLinkedMorasalat && !form.parentId) {
    return "المرجو اختيار الواردة المرتبطة.";
  }

  if (!form.date) return "التاريخ إجباري.";
  if (!form.source.trim()) return "المصدر إجباري.";
  if (!form.sujet.trim()) return "الموضوع إجباري.";
  if (!form.idService) return "المصلحة المعنية إجبارية.";

  return "";
}

function getDirection(form) {
  if (form.typeRegistre === TYPE_WARIDAT) return "Entrant";
  return form.typeCorrespondance === CORRESPONDANCE_SORTANTE ? "Sortant" : "Interne";
}

function formatFormTitle(form) {
  if (form.typeRegistre === TYPE_WARIDAT) return "الواردات";
  return form.typeCorrespondance === CORRESPONDANCE_ENTRANTE
    ? "المراسلات الواردة"
    : "المراسلات الصادرة";
}

function formatRegistre(courrier) {
  if (courrier.typeRegistre === TYPE_MORASALAT) {
    return courrier.typeCorrespondance === CORRESPONDANCE_ENTRANTE
      ? "المراسلات الواردة"
      : "المراسلات الصادرة";
  }

  return "الواردات";
}

function formatEtat(etat) {
  if (etat === "En cours") return "قيد المعالجة";
  if (etat === "Traite" || etat === "Traité") return "تمت المعالجة";
  if (etat === "Archive" || etat === "Archivé") return "مؤرشف";
  return "جديد";
}

function isMainWaridat(courrier) {
  const typeRegistre = courrier.typeRegistre || (courrier.parentId ? TYPE_MORASALAT : TYPE_WARIDAT);
  return typeRegistre === TYPE_WARIDAT && !courrier.parentId;
}

function findMainWaridatByNumero(courriers, idBureauOrdre) {
  const numero = (idBureauOrdre || "").trim();
  if (!numero) return null;

  return courriers.find((courrier) =>
    isMainWaridat(courrier) &&
    (courrier.idBureauOrdre || "").trim() === numero
  ) || null;
}

function getErrorMessage(error, fallback) {
  if (typeof error.response?.data === "string") return error.response.data;
  if (error.response?.data?.message) return error.response.data.message;
  if (error.message) return error.message;
  return fallback;
}

export default GererCourriers;
