import { test, expect } from "@playwright/test";
import path from "node:path";

async function nav(page, label) {
  await page
    .locator("nav")
    .getByRole("button", { name: label, exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: label, exact: true }),
  ).toBeVisible();
}

test("native dialogs retain typed input, trap focus and restore focus on Escape", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const add = page.getByRole("button", { name: "เพิ่มรายการ", exact: true });
  await add.click();
  const dialog = page.getByRole("dialog");
  const reference = dialog.getByLabel("เลขอ้างอิงธุรกรรม");
  await reference.pressSequentially("NATIVE-INPUT");
  await expect(reference).toHaveValue("NATIVE-INPUT");
  await expect(reference).toBeFocused();
  await reference.evaluate((input) => input.setSelectionRange(7, 7));
  await reference.pressSequentially("SAFE-");
  await expect(reference).toHaveValue("NATIVE-SAFE-INPUT");
  const close = dialog.getByRole("button", { name: "ปิด", exact: true });
  const save = dialog.getByRole("button", { name: "บันทึกรายการ" });
  await save.focus();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(save).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(add).toBeFocused();
  expect(errors).toEqual([]);
});

test("file selection and expanded source text survive native form updates", async ({
  page,
}) => {
  await page.goto("/");
  await nav(page, "นำเข้าเอกสาร");
  const file = page.getByLabel("เลือกไฟล์นำเข้า", { exact: true });
  await file.setInputFiles(path.resolve("tests/fixtures/helloworld.pdf"));
  const password = page.getByLabel("รหัสผ่าน PDF", { exact: true });
  await password.pressSequentially("temporary");
  await expect(password).toHaveValue("temporary");
  expect(await file.evaluate((input) => input.files.length)).toBe(1);
  await password.fill("");
  await page.getByRole("button", { name: "อ่านและตรวจรายการ" }).click();
  const details = page.locator("details.source-text");
  await details.locator("summary").click();
  await page
    .locator(".manual-purchase")
    .getByLabel("น้ำหนักซื้อ (OZ)", { exact: true })
    .fill("0.00240");
  await expect(details).toHaveAttribute("open", "");
  await expect(details.locator("pre")).toBeVisible();
});

test("daily summaries, calculation preferences and AI settings persist", async ({
  page,
}) => {
  const errors = [];
  const calls = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/config", (route) =>
    route.fulfill({ json: { local: true } }),
  );
  await page.route("**/api/ai", (route) => {
    calls.push(route.request().postDataJSON());
    return route.fulfill({ json: { model: "synthetic-model" } });
  });
  await page.goto("/");
  await nav(page, "สรุปรายวัน");
  await page.getByRole("button", { name: "เพิ่มสรุปรายวัน" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("วันที่เอกสาร").fill("2026-10-17");
  await dialog.getByLabel("ประเภททอง", { exact: true }).fill("GLDOZUSD");
  await dialog.getByLabel("หน่วยน้ำหนัก").selectOption("oz");
  await dialog.getByLabel("สกุลเงิน", { exact: true }).selectOption("USD");
  await dialog.getByLabel("น้ำหนักยกมา").fill("0.00241");
  await dialog.getByLabel("น้ำหนักคงเหลือ").fill("0.00481");
  await dialog.getByLabel("ราคาเฉลี่ยปิดตามเอกสาร (ถ้ามี)").fill("4158.00");
  await dialog.getByRole("button", { name: "บันทึกรายการ" }).click();
  await expect(dialog).toHaveCount(0);
  await nav(page, "ตั้งค่า");
  await page.getByRole("checkbox").check();
  await page.getByLabel("ชื่อโมเดล").pressSequentially("synthetic-model");
  await page
    .getByRole("button", { name: "ทดสอบการเชื่อมต่อ", exact: true })
    .click();
  await expect(
    page.getByText("ทดสอบการสร้างคำตอบและ schema สำเร็จ · synthetic-model"),
  ).toBeVisible();
  expect(calls).toHaveLength(1);
  expect(calls[0]).toMatchObject({
    provider: "local",
    model: "synthetic-model",
    table: "",
    test: true,
  });
  await nav(page, "รายการซื้อ–ขาย");
  await nav(page, "ตั้งค่า");
  await expect(page.getByLabel("ชื่อโมเดล")).toHaveValue("synthetic-model");
  await page.reload();
  await nav(page, "ตั้งค่า");
  await expect(page.getByRole("checkbox")).toBeChecked();
  await expect(page.getByLabel("ชื่อโมเดล")).toHaveValue("synthetic-model");
  await nav(page, "สรุปรายวัน");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test(
  "leaving import discards a late PDF extraction result",
  { tag: "@dev" },
  async ({ page, baseURL }) => {
    test.skip(
      !baseURL?.endsWith(":5173"),
      "PDF extraction stub uses the development module.",
    );
    await page.route("**/src/pdf.js*", (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body: 'export async function readPdf(){await new Promise(resolve=>{window.finishPdf=resolve;});return "Hello from delayed PDF";}',
      }),
    );
    await page.goto("/");
    await nav(page, "นำเข้าเอกสาร");
    await page
      .getByLabel("เลือกไฟล์นำเข้า", { exact: true })
      .setInputFiles(path.resolve("tests/fixtures/helloworld.pdf"));
    await page.getByRole("button", { name: "อ่านและตรวจรายการ" }).click();
    await page.waitForFunction(() => typeof window.finishPdf === "function");
    await nav(page, "รายการซื้อ–ขาย");
    await page.evaluate(() => window.finishPdf());
    await nav(page, "นำเข้าเอกสาร");
    await expect(
      page.getByRole("heading", { name: "เปิดใบรายงานของคุณ" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "ตรวจรายการก่อนบันทึก" }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(() =>
        localStorage.getItem("kodiak:ledger:v1:device"),
      ),
    ).toBeNull();
  },
);
