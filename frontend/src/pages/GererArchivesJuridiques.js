import React, { useEffect, useState } from "react";
import axios from "axios";

function GererArchivesJuridiques() {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [motCle, setMotCle] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [retraitForm, setRetraitForm] = useState(getInitialRetraitForm());

  useEffect(() => {
    const timeout = setTimeout(fetchArchives, 250);
    return () => clearTimeout(timeout);
  }, [motCle]);

  const fetchArchives = async () => {
    try {
      const url = motCle.trim()
        ? `/api/acteursjudiciaires/archives?motCle=${encodeURIComponent(motCle.trim())}`
        : "/api/acteursjudiciaires/archives";
      const response = await axios.get(url);
      setItems(response.data);
      setError("");

      if (selectedItem) {
        const refreshed = response.data.find((item) => item.id === selectedItem.id);
        setSelectedItem(refreshed || null);
      }
    } catch (err) {
      setError(getErrorMessage(err, "تعذر تحميل أرشيف الملفات القضائية."));
    }
  };

  const handleRetraitChange = (event) => {
    const { name, value } = event.target;
    setRetraitForm((prev) => ({ ...prev, [name]: value }));
  };

  const selectItem = (item) => {
    setSelectedItem(item);
    setRetraitForm(getInitialRetraitForm());
    setError("");
    setSuccess("");
  };

  const handleSaveRetrait = async (event) => {
    event.preventDefault();
    if (!selectedItem) return;

    if (!retraitForm.motifDeRetrait.trim()) {
      setError("سبب السحب إجباري.");
      return;
    }

    try {
      const response = await axios.post(`/api/acteursjudiciaires/${selectedItem.id}/retraits`, {
        dateDeRetrait: retraitForm.dateDeRetrait
          ? new Date(retraitForm.dateDeRetrait).toISOString()
          : new Date().toISOString(),
        motifDeRetrait: retraitForm.motifDeRetrait.trim(),
        effectuePar: retraitForm.effectuePar.trim(),
        notes: retraitForm.notes.trim(),
      });

      setSelectedItem(response.data);
      setRetraitForm(getInitialRetraitForm());
      setSuccess("تم تسجيل السحب بنجاح.");
      await fetchArchives();
    } catch (err) {
      setError(getErrorMessage(err, "تعذر تسجيل السحب."));
    }
  };

  const handleSaveRetour = async (retraitId) => {
    if (!selectedItem) return;

    try {
      const response = await axios.put(`/api/acteursjudiciaires/retraits/${retraitId}/retour`, {
        dateDeRetour: new Date().toISOString(),
        notes: retraitForm.notes.trim(),
      });

      setSelectedItem(response.data);
      setSuccess("تم تسجيل الإرجاع بنجاح.");
      await fetchArchives();
    } catch (err) {
      setError(getErrorMessage(err, "تعذر تسجيل الإرجاع."));
    }
  };

  return (
    <div className="page-container" dir="rtl">
      <h1 className="page-title">إدارة أرشيف الملفات القضائية</h1>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="registry-panel">
        <div className="registry-panel-header">
          <h3>الأرشيف</h3>
        </div>

        <div className="filters">
          <input
            value={motCle}
            onChange={(event) => setMotCle(event.target.value)}
            placeholder="البحث بالرقم الاستئنافي، المحكمة، الموضوع..."
          />
          <button type="button" className="btn-secondary" onClick={() => setMotCle("")}>
            إعادة تعيين
          </button>
        </div>

        <div className="data-table-wrapper">
          <table className="modern-table">
            <thead>
              <tr>
                <th>الرقم الاستئنافي للملف</th>
                <th>التاريخ</th>
                <th>المحكمة / المصدر</th>
                <th>الموضوع</th>
                <th>الموقع</th>
                <th>السحوبات</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: "center" }}>لا توجد ملفات مؤرشفة.</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.numeroDossier || "-"}</td>
                    <td>{formatDate(item.date)}</td>
                    <td>{item.tribunalSource || "-"}</td>
                    <td>{item.sujet || "-"}</td>
                    <td>{item.emplacement || "-"}</td>
                    <td>{item.retraitsCount ?? 0}</td>
                    <td className="action-icons">
                      <button type="button" onClick={() => selectItem(item)}>
                        إدارة السحب
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedItem && (
        <div className="form-card archive-service-panel">
          <div className="registry-panel-header">
            <div>
              <h3>تدبير السحب والإرجاع</h3>
              <p>{selectedItem.numeroDossier || "-"} - {selectedItem.sujet || "-"}</p>
            </div>
            <button type="button" className="btn-secondary" onClick={() => setSelectedItem(null)}>
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
                {(selectedItem.retraits || []).length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: "center" }}>لا توجد سحوبات.</td></tr>
                ) : (
                  selectedItem.retraits.map((retrait) => (
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
    </div>
  );
}

function getInitialRetraitForm() {
  return {
    dateDeRetrait: new Date().toISOString().slice(0, 10),
    motifDeRetrait: "",
    effectuePar: "",
    notes: "",
  };
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function getErrorMessage(error, fallback) {
  if (typeof error.response?.data === "string") return error.response.data;
  if (error.response?.data?.message) return error.response.data.message;
  if (error.message) return error.message;
  return fallback;
}

export default GererArchivesJuridiques;
