import { h } from "./dom.js";
import { Pencil, Trash2 } from "./icons.js";
import { Field } from "./ui.js";
import {
  snapshotFor,
  purchaseValue,
  documentNumber,
  documentDate,
} from "../shared/purchase-import.js";
function PurchaseFields({ value, onChange }) {
  const set = (key, next) => onChange({ ...value, [key]: next });
  return h(
    "div",
    { className: "form-grid" },
    h(
      Field,
      { label: "วันที่ซื้อ" },
      h("input", {
        required: true,
        type: "datetime-local",
        step: "1",
        value: value.date,
        onChange: (e) => set("date", e.target.value),
      }),
    ),
    h(
      Field,
      { label: "ประเภททอง" },
      h("input", {
        required: true,
        value: value.goldType,
        onChange: (e) => set("goldType", e.target.value.toUpperCase()),
      }),
    ),
    h(
      Field,
      { label: "น้ำหนักซื้อ (OZ)" },
      h("input", {
        required: true,
        inputMode: "decimal",
        value: value.weight,
        onChange: (e) => set("weight", e.target.value),
        placeholder: "0.00240",
      }),
    ),
    h(
      Field,
      { label: "ราคาต่อหน่วย (USD/OZ)" },
      h("input", {
        required: true,
        inputMode: "decimal",
        value: value.unitPrice,
        onChange: (e) => set("unitPrice", e.target.value),
        placeholder: "4162.66",
      }),
    ),
    h(
      Field,
      { label: "จำนวนเงินซื้อ (USD)" },
      h("input", {
        required: true,
        inputMode: "decimal",
        value: value.amount,
        onChange: (e) => set("amount", e.target.value),
        placeholder: "10.00",
      }),
    ),
    h(
      Field,
      { label: "ทองคงเหลือสิ้นวัน (OZ)" },
      h("input", {
        required: true,
        inputMode: "decimal",
        value: value.closing,
        onChange: (e) => set("closing", e.target.value),
        placeholder: "0.00481",
      }),
    ),
    h(
      Field,
      { label: "ราคาเฉลี่ยคงเหลือ (USD/OZ)" },
      h("input", {
        required: true,
        inputMode: "decimal",
        value: value.average,
        onChange: (e) => set("average", e.target.value),
        placeholder: "4158.0",
      }),
    ),
  );
}
function PurchaseReview({ draft, onEdit, onDelete }) {
  return h(
    "div",
    { className: "purchase-review" },
    draft.transactions.map((t) => {
      const snapshot = snapshotFor(t, draft.snapshots),
        value = purchaseValue(t, snapshot);
      const rows = [
        ["วันที่ซื้อ", documentDate(value.date)],
        ["ประเภททอง", value.goldType || "—"],
        ["น้ำหนักซื้อ", documentNumber(value.weight) + " OZ"],
        ["ราคาต่อหน่วย", documentNumber(value.unitPrice)],
        ["จำนวนเงินซื้อ", documentNumber(value.amount)],
        ["ทองคงเหลือสิ้นวัน", documentNumber(value.closing) + " OZ"],
        ["ราคาเฉลี่ยคงเหลือ", documentNumber(value.average)],
      ];
      return h(
        "section",
        { key: t.id, className: "purchase-card" },
        h(
          "div",
          { className: "purchase-actions" },
          h(
            "button",
            { className: "text-button", onClick: () => onEdit(t, snapshot) },
            h(Pencil, { size: 14 }),
            "แก้ไขข้อมูล",
          ),
          h(
            "button",
            {
              className: "icon-button danger",
              "aria-label": "ลบรายการนำเข้า",
              onClick: () => onDelete(t, snapshot),
            },
            h(Trash2, { size: 15 }),
          ),
        ),
        h(
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
                h("th", null, "ข้อมูล"),
                h("th", null, "ค่าจากเอกสาร"),
              ),
            ),
            h(
              "tbody",
              null,
              rows.map(([label, value2]) =>
                h(
                  "tr",
                  { key: label },
                  h("th", { scope: "row" }, label),
                  h("td", { className: "mono" }, value2),
                ),
              ),
            ),
          ),
        ),
      );
    }),
  );
}
export { PurchaseFields, PurchaseReview };
