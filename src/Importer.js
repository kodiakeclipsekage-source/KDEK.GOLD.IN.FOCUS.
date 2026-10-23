import { h, Fragment, invalidate } from "./dom.js";
import {
  FileUp,
  Upload,
  FolderOpen,
  FileText,
  ShieldCheck,
  Check,
  ChevronRight,
  ChevronDown,
  Plus,
  CalendarDays,
  Pencil,
  X,
  TriangleAlert,
  Sparkles,
} from "./icons.js";
import {
  emptyLedger,
  mergeLedger,
  readBackup,
  validateTransaction,
  snapshotSchema,
  friendlyError,
} from "../shared/schema.js";
import { parseMts, safeAiTable } from "../shared/mts.js";
import { readPdf } from "./pdf.js";
import { getAiPrefs, requestAi } from "./ai.js";
import {
  Field,
  Dialog,
  TransactionFields,
  SnapshotFields,
  TradeTable,
  Badge,
  units,
  freshTransaction,
  freshSnapshot,
} from "./ui.js";
import {
  blankPurchase,
  purchaseValue,
  snapshotFor,
  validatePurchase,
  upsertPurchase,
  removePurchase,
} from "../shared/purchase-import.js";
import { PurchaseFields, PurchaseReview } from "./PurchaseImport.js";
let importGeneration = 0;
const importerState = {
  files: [],
  password: "",
  working: false,
  draft: null,
  source: "pdf",
  raw: "",
  warnings: [],
  review: false,
  edit: null,
  aiConsent: false,
  aiSummary: "",
  aiPreview: "",
  aiPrefs: null,
  manualPurchase: blankPurchase(),
};
function setFiles(value) {
  importerState.files = value;
  invalidate();
}
function setPassword(value) {
  importerState.password = value;
  invalidate();
}
function setWorking(value) {
  importerState.working = value;
  invalidate();
}
function setDraft(value) {
  importerState.draft = value;
  invalidate();
}
function setSource(value) {
  importerState.source = value;
  invalidate();
}
function setRaw(value) {
  importerState.raw = value;
  invalidate();
}
function setWarnings(value) {
  importerState.warnings = value;
  invalidate();
}
function setReview(value) {
  importerState.review = value;
  invalidate();
}
function setEdit(value) {
  importerState.edit = value;
  invalidate();
}
function setAiConsent(value) {
  importerState.aiConsent = value;
  invalidate();
}
function setAiSummary(value) {
  importerState.aiSummary = value;
  invalidate();
}
function setAiPreview(value) {
  importerState.aiPreview = value;
  invalidate();
}
function setAiPrefs(value) {
  importerState.aiPrefs = value;
  invalidate();
}
function setManualPurchase(value) {
  importerState.manualPurchase = value;
  invalidate();
}
function resetImporter() {
  importGeneration++;
  Object.assign(importerState, {
    files: [],
    password: "",
    working: false,
    draft: null,
    source: "pdf",
    raw: "",
    warnings: [],
    review: false,
    edit: null,
    aiConsent: false,
    aiSummary: "",
    aiPreview: "",
    aiPrefs: null,
    manualPurchase: blankPurchase(),
  });
  invalidate();
}
function Importer({ ledger, busy, user, confirmImport, notify }) {
  const {
    files,
    password,
    working,
    draft,
    source,
    raw,
    warnings,
    review,
    edit,
    aiConsent,
    aiSummary,
    aiPreview,
    aiPrefs,
    manualPurchase,
  } = importerState;
  function clearDraft() {
    setDraft(null);
    setManualPurchase(blankPurchase());
    setRaw("");
    setWarnings([]);
    setReview(false);
    setAiConsent(false);
    setAiSummary("");
    setAiPreview("");
  }
  async function extract() {
    if (!files.length) return;
    const version = importGeneration;
    setWorking(true);
    clearDraft();
    try {
      let combined = emptyLedger(),
        texts = [],
        warn = [];
      const isJson =
        files.length === 1 && files[0].name.toLowerCase().endsWith(".json");
      setSource(isJson ? "json" : "pdf");
      if (isJson) {
        if (files[0].size > 2e6) throw new Error("JSON ต้องไม่เกิน 2 MB");
        combined = readBackup(await files[0].text());
      } else {
        if (files.some((f) => /\.json$/i.test(f.name)))
          throw new Error("นำเข้า JSON ได้ครั้งละ 1 ไฟล์ และต้องแยกจาก PDF");
        if (files.length > 30)
          throw new Error("นำเข้าได้ครั้งละไม่เกิน 30 ไฟล์");
        for (const file of files) {
          const text = await readPdf(file, password);
          if (version !== importGeneration) return;
          texts.push(text);
          const parsed = parseMts(text);
          combined.transactions.push(...parsed.transactions);
          combined.snapshots.push(...parsed.snapshots);
          warn.push(...parsed.warnings);
        }
      }
      if (version !== importGeneration) return;
      setRaw(texts.join("\n\n──────────\n\n"));
      setWarnings([...new Set(warn)]);
      setDraft(combined);
      setFiles([]);
    } catch (e) {
      if (version === importGeneration) notify(friendlyError(e), true);
    } finally {
      if (version === importGeneration) {
        setPassword("");
        setWorking(false);
      }
    }
  }
  const simple =
    source === "pdf" &&
    draft &&
    draft.transactions.every(
      (t) => t.goldType === "GLDOZUSD" && t.type === "buy",
    );
  const txErrors =
    draft?.transactions.flatMap((t, i) =>
      (simple
        ? validatePurchase(purchaseValue(t, snapshotFor(t, draft.snapshots)))
        : validateTransaction(t)
      ).map((e) => `แถว ${i + 1}: ${e}`),
    ) || [];
  let mergeError = "",
    duplicates = 0;
  try {
    if (draft) duplicates = mergeLedger(ledger, draft).duplicates;
  } catch (e) {
    mergeError = friendlyError(e);
  }
  function choose(items, folder = false) {
    clearDraft();
    setFiles(
      [...items].filter((f) =>
        (folder ? /\.pdf$/i : /\.(pdf|json)$/i).test(f.name),
      ),
    );
    setPassword("");
  }
  function prepareAi() {
    try {
      setAiPreview(safeAiTable(draft.transactions));
      setAiPrefs(getAiPrefs());
      setAiConsent(false);
    } catch (e) {
      notify(friendlyError(e), true);
    }
  }
  return h(
    Fragment,
    null,
    h(
      "div",
      { className: "import-steps" },
      h(
        "div",
        { className: !draft ? "current" : "done" },
        h("span", null, draft ? h(Check, { size: 16 }) : 1),
        "เลือกเอกสาร",
      ),
      h("i", null),
      h(
        "div",
        { className: draft ? "current" : "" },
        h("span", null, "2"),
        "ตรวจสอบข้อมูล",
      ),
      h("i", null),
      h("div", null, h("span", null, "3"), "ยืนยันบันทึก"),
    ),
    !draft
      ? h(
          "div",
          { className: "import-layout" },
          h(
            "section",
            { className: "panel upload-panel" },
            h(
              "div",
              { className: "upload-target" },
              h(
                "span",
                { className: "upload-icon" },
                h(FileUp, { size: 32, strokeWidth: 1.4 }),
              ),
              h("h2", null, "เปิดใบรายงานของคุณ"),
              h(
                "p",
                null,
                "PDF ที่มีข้อความ หรือไฟล์สำรอง JSON",
                h("br", null),
                "เริ่มรองรับตาราง MTS Daily Statement",
              ),
              h(
                "div",
                { className: "button-row" },
                h(
                  "label",
                  { className: "button primary file-label" },
                  h(Upload, { size: 16 }),
                  "เลือกไฟล์",
                  h("input", {
                    "aria-label": "เลือกไฟล์นำเข้า",
                    type: "file",
                    accept: ".pdf,.json",
                    multiple: true,
                    disabled: working,
                    onChange: (e) => choose(e.target.files),
                  }),
                ),
                h(
                  "label",
                  { className: "button secondary file-label" },
                  h(FolderOpen, { size: 16 }),
                  "เลือกโฟลเดอร์",
                  h("input", {
                    "aria-label": "เลือกโฟลเดอร์ PDF",
                    type: "file",
                    webkitdirectory: "",
                    multiple: true,
                    disabled: working,
                    onChange: (e) => choose(e.target.files, true),
                  }),
                ),
              ),
              h(
                "small",
                null,
                "PDF ไม่เกิน 20 MB/ไฟล์ · ครั้งละไม่เกิน 30 ไฟล์",
              ),
            ),
            files.length > 0 &&
              h(
                "div",
                { className: "upload-selection" },
                h("strong", null, "เลือกแล้ว ", files.length, " ไฟล์"),
                h(
                  "ul",
                  null,
                  files
                    .slice(0, 5)
                    .map((f, i) =>
                      h("li", { key: i }, h(FileText, { size: 15 }), f.name),
                    ),
                ),
                files.length > 5 &&
                  h("small", null, "และอีก ", files.length - 5, " ไฟล์"),
                h(
                  Field,
                  {
                    label: "รหัสผ่าน PDF (ถ้ามี)",
                    hint: "ใช้ชั่วคราวสำหรับรอบนี้ ไฟล์หลายใบต้องใช้รหัสเดียวกัน",
                  },
                  h("input", {
                    "aria-label": "รหัสผ่าน PDF",
                    type: "password",
                    autoComplete: "off",
                    value: password,
                    onChange: (e) => setPassword(e.target.value),
                  }),
                ),
                h(
                  "button",
                  {
                    className: "button primary",
                    disabled: working,
                    onClick: extract,
                  },
                  working ? "กำลังอ่านบนอุปกรณ์…" : "อ่านและตรวจรายการ",
                  h(ChevronRight, { size: 17 }),
                ),
              ),
          ),
          h(
            "aside",
            { className: "import-info" },
            h("span", { className: "eyebrow" }, "PRIVATE BY DESIGN"),
            h("h2", null, "เอกสารส่วนตัว", h("br", null), "จัดการบนอุปกรณ์"),
            h(
              "div",
              null,
              h(ShieldCheck, { size: 20 }),
              h(
                "p",
                null,
                h("strong", null, "รหัสผ่านใช้เฉพาะครั้งนี้"),
                "ไม่บันทึกรหัสผ่านหรือ PDF ลงฐานข้อมูล",
              ),
            ),
            h(
              "div",
              null,
              h(FileText, { size: 20 }),
              h(
                "p",
                null,
                h("strong", null, "ตรวจเทียบกับต้นฉบับ"),
                "ค่าที่ขาดต้องตรวจและกรอกก่อนบันทึก",
              ),
            ),
            h(
              "div",
              null,
              h(Check, { size: 20 }),
              h(
                "p",
                null,
                h("strong", null, "คุณเป็นคนยืนยัน"),
                "อ่านไฟล์แล้ว ข้อมูลยังไม่ถูกบันทึก",
              ),
            ),
            h(
              "div",
              { className: "note" },
              "เลือกไฟล์ในโฟลเดอร์ pdf ของโปรเจกต์ผ่านปุ่มด้านบน โฟลเดอร์นี้ไม่เปิดเผยเป็น URL บนเว็บ",
            ),
          ),
        )
      : h(
          Fragment,
          null,
          h(
            "section",
            { className: "panel" },
            h(
              "div",
              { className: "section-heading" },
              h(
                "div",
                null,
                h("h2", null, "ตรวจรายการก่อนบันทึก"),
                h(
                  "p",
                  null,
                  draft.transactions.length,
                  " ธุรกรรม · ",
                  draft.snapshots.length,
                  " สรุปรายวัน · ข้ามข้อมูลซ้ำ ",
                  duplicates,
                ),
              ),
              h(
                "button",
                {
                  className: "button secondary",
                  disabled: working || busy,
                  onClick: clearDraft,
                },
                "เลือกเอกสารใหม่",
              ),
            ),
            h(
              "div",
              { className: "panel-body" },
              h(
                "div",
                { className: "note" },
                simple
                  ? "ตรวจข้อมูล 7 ช่องตามเอกสาร · GLDOZUSD ใช้ OZ / USD · ยังไม่บันทึกจนกว่าจะยืนยัน"
                  : "ยังไม่บันทึกข้อมูล ตรวจหน่วย สกุลเงิน ยอดเงิน และค่าธรรมเนียมเทียบกับต้นฉบับ ช่องค่าธรรมเนียมที่ไม่พบเริ่มเป็น 0 และต้องยืนยัน",
              ),
              (simple
                ? draft.transactions.length
                  ? warnings.filter((w) => /^พบบรรทัด|^พบรายการ/.test(w))
                  : []
                : warnings
              ).map((w, i) =>
                h(
                  "div",
                  { className: "inline-warning", key: i },
                  h(TriangleAlert, { size: 15 }),
                  w,
                ),
              ),
              mergeError &&
                h(
                  "div",
                  { role: "alert", className: "note error-note" },
                  mergeError,
                ),
              txErrors.map((e, i) =>
                h("p", { className: "inline-warning", key: i }, e),
              ),
              h(
                "div",
                { className: "button-row" },
                simple
                  ? draft.transactions.length > 0 &&
                      h(
                        "button",
                        {
                          className: "button secondary",
                          disabled: working,
                          onClick: () =>
                            setEdit({
                              kind: "purchase",
                              value: blankPurchase(),
                            }),
                        },
                        h(Plus, { size: 15 }),
                        "เพิ่มข้อมูล 7 ช่อง",
                      )
                  : h(
                      Fragment,
                      null,
                      h(
                        "button",
                        {
                          className: "button secondary",
                          disabled: working,
                          onClick: () =>
                            setEdit({
                              kind: "transaction",
                              value: freshTransaction(),
                            }),
                        },
                        h(Plus, { size: 15 }),
                        "เพิ่มแถวที่อ่านไม่ได้",
                      ),
                      h(
                        "button",
                        {
                          className: "button secondary",
                          disabled: working,
                          onClick: () =>
                            setEdit({
                              kind: "snapshot",
                              value: freshSnapshot(),
                            }),
                        },
                        h(CalendarDays, { size: 15 }),
                        "เพิ่มสรุปตามเอกสาร",
                      ),
                    ),
              ),
            ),
            simple &&
              draft.transactions.length === 0 &&
              h(
                "section",
                { className: "manual-purchase panel-body" },
                h("h3", null, "กรอกข้อมูลจากเอกสาร 7 ช่อง"),
                h(
                  "p",
                  { className: "note" },
                  "ไฟล์นี้อ่านข้อความได้ แต่ยังแยกตารางอัตโนมัติไม่ได้ กรอกข้อมูลด้านล่าง แล้วกด “ใช้ข้อมูล 7 ช่องนี้” ก่อนยืนยันบันทึก",
                ),
                h(
                  "form",
                  {
                    onSubmit: (e) => {
                      e.preventDefault();
                      const errors = validatePurchase(manualPurchase);
                      if (errors.length)
                        return notify(errors.join(" / "), true);
                      setDraft(upsertPurchase(draft, manualPurchase));
                      setWarnings([]);
                      setReview(false);
                    },
                  },
                  h(PurchaseFields, {
                    value: manualPurchase,
                    onChange: setManualPurchase,
                  }),
                  h(
                    "div",
                    { className: "button-row" },
                    h(
                      "button",
                      {
                        className: "button primary",
                        disabled: working || busy,
                      },
                      "ใช้ข้อมูล 7 ช่องนี้",
                    ),
                  ),
                ),
              ),
            simple &&
              h(PurchaseReview, {
                draft,
                onEdit: (t, snapshot) =>
                  setEdit({
                    kind: "purchase",
                    value: purchaseValue(t, snapshot),
                    original: t,
                    snapshot,
                  }),
                onDelete: (t, snapshot) => {
                  setDraft(removePurchase(draft, t, snapshot));
                  setReview(false);
                },
              }),
            !simple &&
              draft.transactions.length > 0 &&
              h(TradeTable, {
                rows: draft.transactions,
                onEdit: (t) =>
                  setEdit({ kind: "transaction", value: { ...t } }),
                onDelete: (t) => {
                  setDraft({
                    ...draft,
                    transactions: draft.transactions.filter(
                      (r) => r.id !== t.id,
                    ),
                  });
                  setReview(false);
                  setAiPreview("");
                },
              }),
            !simple &&
              draft.snapshots.length > 0 &&
              h(
                "div",
                { className: "panel-body draft-snapshots" },
                draft.snapshots.map((s) =>
                  h(
                    "div",
                    { key: s.id },
                    h(
                      "span",
                      null,
                      s.date,
                      " · ",
                      s.provider,
                      " · ",
                      s.goldType,
                      " · ",
                      units[s.unit],
                      " · ",
                      s.currency,
                      h(
                        "small",
                        null,
                        "ยกมา ",
                        s.opening,
                        " / คงเหลือ ",
                        s.closing,
                        " / เฉลี่ยปิด ",
                        s.average ?? "ไม่ทราบ",
                      ),
                    ),
                    h(
                      "button",
                      {
                        className: "icon-button",
                        "aria-label": "แก้ไขสรุปก่อนนำเข้า",
                        onClick: () =>
                          setEdit({ kind: "snapshot", value: { ...s } }),
                      },
                      h(Pencil, { size: 15 }),
                    ),
                    h(
                      "button",
                      {
                        className: "icon-button danger",
                        "aria-label": "ลบสรุปก่อนนำเข้า",
                        onClick: () => {
                          setDraft({
                            ...draft,
                            snapshots: draft.snapshots.filter(
                              (r) => r.id !== s.id,
                            ),
                          });
                          setReview(false);
                        },
                      },
                      h(X, { size: 15 }),
                    ),
                  ),
                ),
              ),
            raw &&
              h(
                "details",
                { className: "source-text" },
                h(
                  "summary",
                  null,
                  "ดูข้อความต้นฉบับ (อยู่บนอุปกรณ์เท่านั้น) ",
                  h(ChevronDown, { size: 16 }),
                ),
                h("pre", null, raw),
              ),
            h(
              "div",
              { className: "panel-body confirmation" },
              h(
                "label",
                { className: "checkbox" },
                h("input", {
                  type: "checkbox",
                  disabled:
                    !draft.transactions.length && !draft.snapshots.length,
                  checked: review,
                  onChange: (e) => setReview(e.target.checked),
                }),
                h(
                  "span",
                  null,
                  simple
                    ? "ฉันตรวจข้อมูลทั้ง 7 ช่องกับเอกสารและยืนยันความถูกต้องแล้ว"
                    : "ฉันตรวจเทียบข้อมูลทุกแถวกับต้นฉบับ รวมถึงค่าธรรมเนียม และยืนยันความถูกต้องแล้ว",
                ),
              ),
              h(
                "button",
                {
                  className: "button primary",
                  disabled:
                    working ||
                    busy ||
                    !review ||
                    !!mergeError ||
                    txErrors.length > 0 ||
                    (!draft.transactions.length && !draft.snapshots.length),
                  onClick: async () => {
                    const version = importGeneration;
                    if (await confirmImport(draft, source)) {
                      if (version === importGeneration) clearDraft();
                    }
                  },
                },
                h(Check, { size: 17 }),
                busy ? "กำลังบันทึก…" : "ยืนยันและบันทึก",
              ),
            ),
          ),
          !simple &&
            source === "pdf" &&
            draft.transactions.length > 0 &&
            h(
              "section",
              { className: "panel" },
              h(
                "div",
                { className: "section-heading" },
                h(
                  "div",
                  null,
                  h(
                    "h2",
                    null,
                    h(Sparkles, { size: 18 }),
                    " ผู้ช่วยจัดตาราง AI (เลือกใช้)",
                  ),
                  h("p", null, "ใช้ผู้ให้บริการที่เลือกในหน้าตั้งค่าเท่านั้น"),
                ),
                h(
                  "button",
                  {
                    className: "button secondary",
                    disabled: working,
                    onClick: prepareAi,
                  },
                  "เตรียมตารางที่ลบข้อมูลส่วนตัว",
                ),
              ),
              aiPreview &&
                h(
                  "div",
                  { className: "panel-body" },
                  h(
                    "p",
                    null,
                    "ผู้ให้บริการ: ",
                    h("strong", null, aiPrefs?.provider),
                    " · โมเดล: ",
                    h("strong", null, aiPrefs?.model || "ยังไม่เลือก"),
                  ),
                  h(
                    "p",
                    { className: "muted" },
                    "ส่งเฉพาะข้อความต่อไปนี้ เลขอ้างอิงถูกแทนด้วย ROW_N ไม่ส่งชื่อ ประเภททองที่กรอกอิสระ PDF หรือรหัสผ่าน",
                  ),
                  h("pre", { className: "ai-preview" }, aiPreview),
                  h(
                    "label",
                    { className: "checkbox" },
                    h("input", {
                      type: "checkbox",
                      checked: aiConsent,
                      onChange: (e) => setAiConsent(e.target.checked),
                    }),
                    h(
                      "span",
                      null,
                      "ฉันตรวจข้อความด้านบนแล้ว และอนุญาตให้ส่งตารางนี้ไปยังผู้ให้บริการที่เลือก",
                    ),
                  ),
                  h(
                    "button",
                    {
                      className: "button secondary",
                      disabled: working || !aiConsent,
                      onClick: async () => {
                        const version = importGeneration;
                        setWorking(true);
                        try {
                          const result = await requestAi(
                            aiPrefs,
                            user,
                            aiPreview,
                          );
                          if (version !== importGeneration) return;
                          const rows = result.result.rows.map((r) => {
                            const original = draft.transactions[r.row - 1];
                            const { row, ...fields } = r;
                            return { ...original, ...fields };
                          });
                          for (const r of rows) {
                            const errors = validateTransaction(r);
                            if (errors.length)
                              throw new Error(
                                "ผล AI ไม่ผ่านการตรวจ: " + errors.join(" / "),
                              );
                          }
                          setDraft({ ...draft, transactions: rows });
                          setReview(false);
                          setAiPreview("");
                          setAiSummary(result.result.summary);
                          notify(
                            "AI จัดตารางแล้ว กรุณาตรวจเทียบใหม่ก่อนยืนยัน",
                          );
                        } catch (e) {
                          if (version === importGeneration)
                            notify(friendlyError(e), true);
                        } finally {
                          if (version === importGeneration) setWorking(false);
                        }
                      },
                    },
                    h(Sparkles, { size: 16 }),
                    working ? "กำลังเรียก AI…" : "ส่งตารางให้ AI",
                  ),
                ),
              aiSummary &&
                h(
                  "div",
                  { className: "panel-body" },
                  h(Badge, { tone: "amber" }, "ข้อความจาก AI · กรุณาตรวจสอบ"),
                  h("p", null, aiSummary),
                ),
            ),
        ),
    edit &&
      h(
        Dialog,
        { title: "แก้ไขข้อมูลก่อนนำเข้า", onClose: () => setEdit(null) },
        h(
          "form",
          {
            onSubmit: (e) => {
              e.preventDefault();
              if (edit.kind === "purchase") {
                const errors2 = validatePurchase(edit.value);
                if (errors2.length) return notify(errors2.join(" / "), true);
                setDraft(
                  upsertPurchase(
                    draft,
                    edit.value,
                    edit.original,
                    edit.snapshot,
                  ),
                );
                setReview(false);
                setEdit(null);
                return;
              }
              const errors =
                edit.kind === "transaction"
                  ? validateTransaction(edit.value)
                  : snapshotSchema.safeParse(edit.value).success
                    ? []
                    : ["สรุปรายวันไม่ถูกต้อง"];
              if (errors.length) return notify(errors.join(" / "), true);
              const key =
                edit.kind === "transaction" ? "transactions" : "snapshots";
              const rows = draft[key].filter((t) => t.id !== edit.value.id);
              setDraft({ ...draft, [key]: [...rows, edit.value] });
              setReview(false);
              setAiPreview("");
              setEdit(null);
            },
          },
          edit.kind === "purchase"
            ? h(PurchaseFields, {
                value: edit.value,
                onChange: (value) => setEdit({ ...edit, value }),
              })
            : edit.kind === "transaction"
              ? h(TransactionFields, {
                  value: edit.value,
                  onChange: (value) => setEdit({ ...edit, value }),
                })
              : h(SnapshotFields, {
                  value: edit.value,
                  onChange: (value) => setEdit({ ...edit, value }),
                }),
          h(
            "div",
            { className: "modal-footer" },
            h(
              "button",
              { className: "button primary" },
              "ปรับข้อมูลในหน้าตรวจ",
            ),
          ),
        ),
      ),
  );
}
export { Importer as default, resetImporter };
