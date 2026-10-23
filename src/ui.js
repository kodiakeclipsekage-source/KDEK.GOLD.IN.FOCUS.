import { h } from "./dom.js";
import {
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Pencil,
  Trash2,
} from "./icons.js";
const units = { g: "กรัม", baht: "บาททอง", oz: "ทรอยออนซ์", kg: "กิโลกรัม" };
const now = () =>
  new Date()
    .toLocaleString("sv-SE", { timeZone: "Asia/Bangkok" })
    .replace(" ", "T")
    .slice(0, 16);
const num = (s, d = 2) =>
  s === null || s === void 0
    ? "—"
    : Number(s).toLocaleString("th-TH", {
        minimumFractionDigits: d,
        maximumFractionDigits: d,
      });
const dayLabel = (s) =>
  new Date(s.slice(0, 10) + "T12:00:00+07:00").toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const uid = () => crypto.randomUUID();
const freshTransaction = () => ({
  id: uid(),
  date: now(),
  type: "buy",
  provider: "MTS",
  reference: "",
  goldType: "",
  weight: "",
  unit: "",
  unitPrice: "",
  amount: "",
  currency: "",
  fee: "0",
});
const freshSnapshot = () => ({
  id: uid(),
  date: now().slice(0, 10),
  provider: "MTS",
  goldType: "",
  unit: "",
  currency: "",
  opening: "",
  closing: "",
  average: null,
  openingAverage: null,
});
let fieldId = 0;
function Field({ label, children, hint }) {
  const id = "field-" + ++fieldId;
  children.id = id;
  if (hint) children.setAttribute("aria-describedby", id + "-hint");
  return h(
    "div",
    { className: "field" },
    h("label", { htmlFor: id }, label),
    children,
    hint && h("small", { id: id + "-hint" }, hint),
  );
}
function Badge({ children, tone = "green" }) {
  return h("span", { className: "badge " + tone }, children);
}
function Empty({ icon: Icon = Coins, title, children, action }) {
  return h(
    "div",
    { className: "empty" },
    h(
      "div",
      { className: "empty-symbol" },
      h(Icon, { size: 30, strokeWidth: 1.3 }),
    ),
    h("h3", null, title),
    h("p", null, children),
    action,
  );
}
function Dialog({ title, onClose, children }) {
  const panel = h(
    "section",
    {
      className: "modal",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": title,
    },
    h(
      "div",
      { className: "modal-title" },
      h("h2", null, title),
      h(
        "button",
        { className: "icon-button", onClick: onClose, "aria-label": "ปิด" },
        h(X, { size: 20 }),
      ),
    ),
    children,
  );
  panel._closeDialog = onClose;
  return h(
    "div",
    {
      className: "modal-backdrop",
      onClick: (e) => e.target === e.currentTarget && onClose(),
    },
    panel,
  );
}
function TransactionFields({ value, onChange }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  return h(
    "div",
    { className: "form-grid" },
    h(
      Field,
      { label: "ประเภท" },
      h(
        "select",
        { value: value.type, onChange: (e) => set("type", e.target.value) },
        h("option", { value: "buy" }, "ซื้อทอง"),
        h("option", { value: "sell" }, "ขายทอง"),
      ),
    ),
    h(
      Field,
      { label: "วันเวลา (ประเทศไทย)" },
      h("input", {
        "aria-label": "วันเวลา",
        required: true,
        type: "datetime-local",
        step: "1",
        value: value.date,
        onChange: (e) => set("date", e.target.value),
      }),
    ),
    h(
      Field,
      { label: "ผู้ให้บริการ" },
      h("input", {
        required: true,
        value: value.provider,
        onChange: (e) => set("provider", e.target.value),
      }),
    ),
    h(
      Field,
      {
        label: "เลขอ้างอิงธุรกรรม",
        hint: "ใช้เลขรายการ ห้ามใช้เลขบัญชีหรือชื่อบุคคล",
      },
      h("input", {
        required: true,
        value: value.reference,
        onChange: (e) => set("reference", e.target.value),
        placeholder: "เช่น BUY-001",
      }),
    ),
    h(
      Field,
      { label: "ประเภททอง" },
      h("input", {
        required: true,
        value: value.goldType,
        onChange: (e) => set("goldType", e.target.value),
        placeholder: "เช่น 96.5% หรือ 99.99%",
      }),
    ),
    h(
      Field,
      { label: "หน่วยน้ำหนัก" },
      h(
        "select",
        {
          required: true,
          value: value.unit,
          onChange: (e) => set("unit", e.target.value),
        },
        h("option", { value: "" }, "เลือกตามเอกสาร"),
        Object.entries(units).map(([k, v]) =>
          h("option", { key: k, value: k }, v),
        ),
      ),
    ),
    h(
      Field,
      { label: "น้ำหนัก" },
      h("input", {
        required: true,
        inputMode: "decimal",
        value: value.weight,
        onChange: (e) => set("weight", e.target.value),
        placeholder: "0.00000000",
      }),
    ),
    h(
      Field,
      { label: "ราคาต่อหน่วย" },
      h("input", {
        required: true,
        inputMode: "decimal",
        value: value.unitPrice,
        onChange: (e) => set("unitPrice", e.target.value),
        placeholder: "0.00",
      }),
    ),
    h(
      Field,
      {
        label: "ยอดเงินก่อนค่าธรรมเนียม",
        hint: "กรอกยอดตามเอกสาร แยกจากค่าที่คำนวณ",
      },
      h("input", {
        required: true,
        inputMode: "decimal",
        value: value.amount,
        onChange: (e) => set("amount", e.target.value),
        placeholder: "0.00",
      }),
    ),
    h(
      Field,
      { label: "สกุลเงิน" },
      h(
        "select",
        {
          required: true,
          value: value.currency,
          onChange: (e) => set("currency", e.target.value),
        },
        h("option", { value: "" }, "เลือกตามเอกสาร"),
        ["THB", "USD", "EUR"].map((v) => h("option", { key: v }, v)),
      ),
    ),
    h(
      Field,
      { label: "ค่าธรรมเนียมเพิ่มเติม" },
      h("input", {
        required: true,
        inputMode: "decimal",
        value: value.fee,
        onChange: (e) => set("fee", e.target.value),
      }),
    ),
  );
}
function SnapshotFields({ value, onChange }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  return h(
    "div",
    { className: "form-grid" },
    h(
      Field,
      { label: "วันที่เอกสาร" },
      h("input", {
        required: true,
        type: "date",
        value: value.date,
        onChange: (e) => set("date", e.target.value),
      }),
    ),
    h(
      Field,
      { label: "ผู้ให้บริการ" },
      h("input", {
        required: true,
        value: value.provider,
        onChange: (e) => set("provider", e.target.value),
      }),
    ),
    h(
      Field,
      { label: "ประเภททอง" },
      h("input", {
        required: true,
        value: value.goldType,
        onChange: (e) => set("goldType", e.target.value),
      }),
    ),
    h(
      Field,
      { label: "หน่วยน้ำหนัก" },
      h(
        "select",
        {
          required: true,
          value: value.unit,
          onChange: (e) => set("unit", e.target.value),
        },
        h("option", { value: "" }, "เลือกหน่วย"),
        Object.entries(units).map(([k, v]) =>
          h("option", { key: k, value: k }, v),
        ),
      ),
    ),
    h(
      Field,
      { label: "สกุลเงิน" },
      h(
        "select",
        {
          required: true,
          value: value.currency,
          onChange: (e) => set("currency", e.target.value),
        },
        h("option", { value: "" }, "เลือกสกุลเงิน"),
        ["THB", "USD", "EUR"].map((v) => h("option", { key: v }, v)),
      ),
    ),
    ["opening", "closing", "average", "openingAverage"].map((k, i) =>
      h(
        Field,
        {
          key: k,
          label: [
            "น้ำหนักยกมา",
            "น้ำหนักคงเหลือ",
            "ราคาเฉลี่ยปิดตามเอกสาร (ถ้ามี)",
            "ต้นทุนเฉลี่ยยกมาที่ทราบ (ถ้ามี)",
          ][i],
        },
        h("input", {
          required: i < 2,
          inputMode: "decimal",
          value: value[k] ?? "",
          onChange: (e) =>
            set(k, e.target.value === "" && i >= 2 ? null : e.target.value),
        }),
      ),
    ),
  );
}
function TradeTable({ rows, onEdit, onDelete }) {
  return h(
    "div",
    { className: "table-scroll" },
    h(
      "table",
      null,
      h(
        "thead",
        null,
        h(
          "tr",
          null,
          h("th", null, "วัน / เลขอ้างอิง"),
          h("th", null, "รายการ"),
          h("th", null, "ทอง / ผู้ให้บริการ"),
          h("th", { className: "right" }, "น้ำหนัก"),
          h("th", { className: "right" }, "ราคาต่อหน่วย"),
          h("th", { className: "right" }, "ยอดเงิน"),
          h("th", null),
        ),
      ),
      h(
        "tbody",
        null,
        rows.map((t) =>
          h(
            "tr",
            { key: t.id },
            h(
              "td",
              null,
              h("strong", null, dayLabel(t.date)),
              h("small", null, t.date.slice(11), " · ", t.reference),
            ),
            h(
              "td",
              null,
              h(
                Badge,
                { tone: t.type === "buy" ? "green" : "amber" },
                t.type === "buy"
                  ? h(ArrowDownLeft, { size: 13 })
                  : h(ArrowUpRight, { size: 13 }),
                " ",
                t.type === "buy" ? "ซื้อ" : "ขาย",
              ),
            ),
            h(
              "td",
              null,
              t.goldType || "ยังไม่ระบุ",
              h("small", null, t.provider),
            ),
            h(
              "td",
              { className: "right mono" },
              num(t.weight, 4),
              h("small", null, units[t.unit] || "ยังไม่ระบุหน่วย"),
            ),
            h("td", { className: "right mono" }, num(t.unitPrice)),
            h(
              "td",
              { className: "right mono" },
              h("strong", null, num(t.amount)),
              h(
                "small",
                null,
                t.currency || "ยังไม่ระบุสกุลเงิน",
                " · ค่าธรรมเนียม ",
                num(t.fee),
              ),
            ),
            h(
              "td",
              null,
              h(
                "div",
                { className: "row-actions" },
                onEdit &&
                  h(
                    "button",
                    {
                      className: "icon-button",
                      "aria-label": "แก้ไข " + t.reference,
                      onClick: () => onEdit(t),
                    },
                    h(Pencil, { size: 15 }),
                  ),
                onDelete &&
                  h(
                    "button",
                    {
                      className: "icon-button danger",
                      "aria-label": "ลบ " + t.reference,
                      onClick: () => onDelete(t),
                    },
                    h(Trash2, { size: 15 }),
                  ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
export {
  Badge,
  Dialog,
  Empty,
  Field,
  SnapshotFields,
  TradeTable,
  TransactionFields,
  dayLabel,
  freshSnapshot,
  freshTransaction,
  now,
  num,
  uid,
  units,
};
