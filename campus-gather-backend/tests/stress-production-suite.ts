import jwt from "jsonwebtoken";
import { prisma, pool } from "../src/app/lib/prisma.js";

const BASE_URL = "http://localhost:5000/api/v1";
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || "access_secret";

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runTest(suite: string, name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    results.push({ suite, name, passed: true });
  } catch (err: any) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         Reason: ${err.message}`);
    results.push({ suite, name, passed: false, error: err.message });
  }
}

async function login(email: string, password = "Password@123"): Promise<string> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json: any = await res.json();
  if (!json.success || !json.data?.accessToken) {
    throw new Error(`Login failed for ${email}: ${json.message || JSON.stringify(json)}`);
  }
  return json.data.accessToken;
}

async function main() {
  console.log("\n========================================================");
  console.log("🧪 A-TO-Z PRODUCTION STRESS TEST & DATABASE SIMULATION SUITE");
  console.log("   Target: " + BASE_URL);
  console.log("========================================================\n");

  // ─────────────────────────────────────────────────────────────
  // 1. DATABASE GROUND TRUTH
  // ─────────────────────────────────────────────────────────────
  console.log("▶ SUITE 1: Database Ground Truth");
  await runTest("Database Ground Truth", "1.1 Exactly 38 CSE sections in database", async () => {
    const sectionCount = await prisma.section.count();
    assert(sectionCount === 38, `Expected 38 sections, found ${sectionCount}`);
  });

  await runTest("Database Ground Truth", "1.2 Exactly 180 registered students in users table", async () => {
    const studentCount = await prisma.user.count();
    assert(studentCount === 180, `Expected 180 students, found ${studentCount}`);
  });

  await runTest("Database Ground Truth", "1.3 Allowed students roster (1,253 total, 180 claimed, 1,073 unclaimed)", async () => {
    const totalAllowed = await prisma.allowedStudent.count();
    const claimedAllowed = await prisma.allowedStudent.count({ where: { isClaimed: true } });
    const unclaimedAllowed = await prisma.allowedStudent.count({ where: { isClaimed: false } });
    assert(totalAllowed >= 1253, `Expected at least 1253 allowed students, found ${totalAllowed}`);
    assert(claimedAllowed === 180, `Expected 180 claimed students, found ${claimedAllowed}`);
    assert(unclaimedAllowed === totalAllowed - 180, `Expected ${totalAllowed - 180} unclaimed, found ${unclaimedAllowed}`);
  });

  // ─────────────────────────────────────────────────────────────
  // 2. AUTH & WHITELIST
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ SUITE 2: Auth & Whitelist Enforcement");
  await runTest("Auth & Whitelist", "2.1 Unclaimed student ID verification returns 200 with official name", async () => {
    const unclaimed = await prisma.allowedStudent.findFirst({ where: { isClaimed: false } });
    assert(!!unclaimed, "No unclaimed student found in db");
    const res = await fetch(`${BASE_URL}/auth/verify-student/${unclaimed!.studentId}`);
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    const json: any = await res.json();
    assert(json.success === true, "Response success was false");
    assert(json.data.fullName === unclaimed!.fullName, `Expected ${unclaimed!.fullName}, got ${json.data.fullName}`);
    assert(json.data.studentId === unclaimed!.studentId, `Expected ${unclaimed!.studentId}, got ${json.data.studentId}`);
  });

  await runTest("Auth & Whitelist", "2.2 Already-claimed student ID verification returns 409 Conflict", async () => {
    const res = await fetch(`${BASE_URL}/auth/verify-student/11230121177`);
    assert(res.status === 409, `Expected 409 Conflict, got ${res.status}`);
    const json: any = await res.json();
    assert(json.success === false, "Expected failure response");
    assert(/already registered/i.test(json.message), `Expected 'already registered' message, got: ${json.message}`);
  });

  await runTest("Auth & Whitelist", "2.3 Invalid non-existent student ID returns 404 Not Found", async () => {
    const res = await fetch(`${BASE_URL}/auth/verify-student/99999999999`);
    assert(res.status === 404, `Expected 404 Not Found, got ${res.status}`);
    const json: any = await res.json();
    assert(json.success === false, "Expected failure response");
    assert(/not found/i.test(json.message), `Expected 'not found' message, got: ${json.message}`);
  });

  await runTest("Auth & Whitelist", "2.4 Stale/non-existent JWT user ID returns 401 Unauthorized (zero 500 crashes)", async () => {
    const staleToken = jwt.sign(
      { userId: 99999999, email: "ghost@fest.cse", role: "STUDENT", sectionId: 1 },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
    const res = await fetch(`${BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${staleToken}` },
    });
    assert(res.status === 401, `Expected 401 Unauthorized, got ${res.status}`);
    const json: any = await res.json();
    assert(json.success === false, "Expected failure response");
    assert(/Session expired or user no longer exists/i.test(json.message), `Unexpected message: ${json.message}`);
  });

  // ─────────────────────────────────────────────────────────────
  // 3. ROLE HIERARCHY & PROMOTION RULES
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ SUITE 3: Role Hierarchy & Promotion Rules");
  const adminToken = await login("yeasir@csefest.com");
  const convenorToken = await login("labib@csefest.com");

  const targetStudent = await prisma.user.findFirstOrThrow({
    where: { studentId: "11230121180" }, // Sudipto Paul
  });

  await runTest("Role Hierarchy", "3.1 CONVENOR promoting STUDENT -> CR returns 200 OK", async () => {
    const res = await fetch(`${BASE_URL}/users/${targetStudent.id}/role`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${convenorToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "CR" }),
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    const json: any = await res.json();
    assert(json.data.role === "CR", `Expected role CR, got ${json.data.role}`);
  });

  await runTest("Role Hierarchy", "3.2 CONVENOR demoting CR -> STUDENT returns 200 OK", async () => {
    const res = await fetch(`${BASE_URL}/users/${targetStudent.id}/role`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${convenorToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "STUDENT" }),
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    const json: any = await res.json();
    assert(json.data.role === "STUDENT", `Expected role STUDENT, got ${json.data.role}`);
  });

  await runTest("Role Hierarchy", "3.3 CONVENOR attempting to promote to SUPER_ADMIN returns 403 Forbidden", async () => {
    const res = await fetch(`${BASE_URL}/users/${targetStudent.id}/role`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${convenorToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "SUPER_ADMIN" }),
    });
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  await runTest("Role Hierarchy", "3.4 CONVENOR attempting to promote to CONVENOR returns 403 Forbidden", async () => {
    const res = await fetch(`${BASE_URL}/users/${targetStudent.id}/role`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${convenorToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "CONVENOR" }),
    });
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  await runTest("Role Hierarchy", "3.5 SUPER_ADMIN promoting STUDENT -> CONVENOR returns 200 OK", async () => {
    const res = await fetch(`${BASE_URL}/users/${targetStudent.id}/role`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "CONVENOR" }),
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    const json: any = await res.json();
    assert(json.data.role === "CONVENOR", `Expected role CONVENOR, got ${json.data.role}`);

    // Revert back to STUDENT
    await fetch(`${BASE_URL}/users/${targetStudent.id}/role`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "STUDENT" }),
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. SEMESTER FEE & CR COLLECTION GUARDS
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ SUITE 4: Semester Fee & CR Collection Guards");
  const section1A = await prisma.section.findUniqueOrThrow({ where: { code: "1A" } });
  const cr1A = await prisma.user.findFirstOrThrow({
    where: { sectionId: section1A.id, role: "CR" },
  });
  const student1A = await prisma.user.findFirstOrThrow({
    where: { sectionId: section1A.id, role: "STUDENT" },
  });
  const cr1AToken = await login(cr1A.email);

  await runTest("Fee & CR Guards", "4.1 CR of 1A (festFee === 0) attempting PAID_TO_CR returns 400 Bad Request", async () => {
    const res = await fetch(`${BASE_URL}/users/${student1A.id}/fee-status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${cr1AToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ festFeeStatus: "PAID_TO_CR" }),
    });
    assert(res.status === 400, `Expected 400 Bad Request, got ${res.status}`);
    const json: any = await res.json();
    assert(/not been set/i.test(json.message), `Unexpected message: ${json.message}`);
  });

  const cr8AToken = await login("rufida@csefest.com");
  const unpaid8A = await prisma.user.findFirstOrThrow({
    where: { section: { code: "8A" }, festFeeStatus: "UNPAID", role: "STUDENT" },
  });

  await runTest("Fee & CR Guards", "4.2 CR of 8A marking 8A student PAID_TO_CR returns 200 OK (paidAmount: 1500)", async () => {
    const res = await fetch(`${BASE_URL}/users/${unpaid8A.id}/fee-status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${cr8AToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ festFeeStatus: "PAID_TO_CR" }),
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    const json: any = await res.json();
    assert(json.data.festFeeStatus === "PAID_TO_CR", `Expected PAID_TO_CR, got ${json.data.festFeeStatus}`);
    assert(json.data.paidAmount === 1500, `Expected paidAmount 1500, got ${json.data.paidAmount}`);

    // Revert back to UNPAID to keep exact dataset baseline
    await fetch(`${BASE_URL}/users/${unpaid8A.id}/fee-status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${cr8AToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ festFeeStatus: "UNPAID" }),
    });
  });

  const student7A = await prisma.user.findFirstOrThrow({
    where: { section: { code: "7A" }, role: "STUDENT" },
  });

  await runTest("Fee & CR Guards", "4.3 CR of 8A attempting to mark 7A student returns 403 Forbidden", async () => {
    const res = await fetch(`${BASE_URL}/users/${student7A.id}/fee-status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${cr8AToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ festFeeStatus: "PAID_TO_CR" }),
    });
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
    const json: any = await res.json();
    assert(/only update fee status for students in your section/i.test(json.message), `Unexpected message: ${json.message}`);
  });

  const student8AToken = await login("sudipto@csefest.com");
  await runTest("Fee & CR Guards", "4.4 STUDENT of 8A fetching GET /users receives ONLY 8A classmates (200 OK)", async () => {
    const res = await fetch(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${student8AToken}` },
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    const json: any = await res.json();
    assert(json.data.length === 20, `Expected 20 classmates in 8A, got ${json.data.length}`);
    for (const u of json.data) {
      assert(u.section.code === "8A", `Found non-8A user: ${u.name} in section ${u.section?.code}`);
    }
  });

  await runTest("Fee & CR Guards", "4.5 SUPER_ADMIN / CONVENOR fetching GET /users?limit=2000 receives all 180 students", async () => {
    const res = await fetch(`${BASE_URL}/users?limit=2000`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    const json: any = await res.json();
    assert(json.meta.total === 180, `Expected meta total 180, got ${json.meta.total}`);
    assert(json.data.length === 180, `Expected 180 users returned, got ${json.data.length}`);
  });

  // ─────────────────────────────────────────────────────────────
  // 5. KIT DELIVERY RULES
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ SUITE 5: Kit Delivery Rules");
  const unpaidStudent = await prisma.user.findFirstOrThrow({
    where: { festFeeStatus: "UNPAID", role: "STUDENT" },
  });
  const paidWithoutKit = await prisma.user.findFirstOrThrow({
    where: { festFeeStatus: "PAID_TO_CR", kitDelivered: false, role: "STUDENT" },
  });

  await runTest("Kit Delivery Rules", "5.1 Marking kitDelivered: true on UNPAID student returns 400 Bad Request", async () => {
    const res = await fetch(`${BASE_URL}/users/${unpaidStudent.id}/kit-status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ kitDelivered: true }),
    });
    assert(res.status === 400, `Expected 400 Bad Request, got ${res.status}`);
    const json: any = await res.json();
    assert(/Cannot deliver Fest Kit to an unpaid student/i.test(json.message), `Unexpected message: ${json.message}`);
  });

  await runTest("Kit Delivery Rules", "5.2 Marking kitDelivered: true on PAID_TO_CR student returns 200 OK", async () => {
    const res = await fetch(`${BASE_URL}/users/${paidWithoutKit.id}/kit-status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ kitDelivered: true }),
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    const json: any = await res.json();
    assert(json.data.kitDelivered === true, "kitDelivered was not set to true");
  });

  await runTest("Kit Delivery Rules", "5.3 Resetting PAID_TO_CR student back to UNPAID resets kitDelivered to false", async () => {
    const res = await fetch(`${BASE_URL}/users/${paidWithoutKit.id}/fee-status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ festFeeStatus: "UNPAID" }),
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    const json: any = await res.json();
    assert(json.data.festFeeStatus === "UNPAID", `Expected UNPAID, got ${json.data.festFeeStatus}`);
    assert(json.data.kitDelivered === false, `Expected kitDelivered: false, got ${json.data.kitDelivered}`);

    // Restore back to original state: PAID_TO_CR, kitDelivered: false
    await fetch(`${BASE_URL}/users/${paidWithoutKit.id}/fee-status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ festFeeStatus: "PAID_TO_CR" }),
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. CASH HANDOVER & ANTI-FRAUD MATH
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ SUITE 6: Cash Handover & Anti-Fraud Math");
  const convenorUser = await prisma.user.findFirstOrThrow({ where: { role: "CONVENOR" } });

  await runTest("Cash Handover Math", "6.1 CR attempting to hand over more cash than collected returns 400 Bad Request", async () => {
    const res = await fetch(`${BASE_URL}/cash-handovers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cr8AToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        receivedById: convenorUser.id,
        amount: 80000, // 8A total collection is only 22,500
        notes: "Fraudulent excess handover attempt",
      }),
    });
    assert(res.status === 400, `Expected 400 Bad Request, got ${res.status}`);
    const json: any = await res.json();
    assert(/exceeds total collected fees/i.test(json.message), `Unexpected message: ${json.message}`);
  });

  let testHandoverId = 0;
  await runTest("Cash Handover Math", "6.2 CR submitting valid handover returns 201 Created (PENDING, does NOT increase availableBalance)", async () => {
    // Current available balance before handover
    const beforeSummaryRes = await fetch(`${BASE_URL}/analytics/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const beforeSummary: any = await beforeSummaryRes.json();
    const balanceBefore = beforeSummary.data.availableBalance;

    const res = await fetch(`${BASE_URL}/cash-handovers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cr8AToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        receivedById: convenorUser.id,
        amount: 1500,
        notes: "Automated test valid handover",
      }),
    });
    assert(res.status === 201, `Expected 201 Created, got ${res.status}`);
    const json: any = await res.json();
    assert(json.data.status === "PENDING", `Expected status PENDING, got ${json.data.status}`);
    testHandoverId = json.data.id;

    // Verify balance is unchanged
    const afterSummaryRes = await fetch(`${BASE_URL}/analytics/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const afterSummary: any = await afterSummaryRes.json();
    assert(afterSummary.data.availableBalance === balanceBefore, `Balance changed before verification!`);
  });

  await runTest("Cash Handover Math", "6.3 Convenor verifying handover returns 200 OK and increases availableBalance by exact amount", async () => {
    const beforeSummaryRes = await fetch(`${BASE_URL}/analytics/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const beforeSummary: any = await beforeSummaryRes.json();
    const balanceBefore = beforeSummary.data.availableBalance;

    const res = await fetch(`${BASE_URL}/cash-handovers/${testHandoverId}/verify`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${convenorToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "VERIFIED" }),
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    const json: any = await res.json();
    assert(json.data.status === "VERIFIED", `Expected status VERIFIED, got ${json.data.status}`);

    const afterSummaryRes = await fetch(`${BASE_URL}/analytics/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const afterSummary: any = await afterSummaryRes.json();
    assert(afterSummary.data.availableBalance === balanceBefore + 1500, `Expected balance increase of 1500, got ${afterSummary.data.availableBalance - balanceBefore}`);

    // Cleanup test handover
    await prisma.cashHandover.delete({ where: { id: testHandoverId } });
  });

  // ─────────────────────────────────────────────────────────────
  // 7. COMMITTEE BUDGETS, EXPENSES & INFLOWS
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ SUITE 7: Committee Budgets, Expenses & Inflows");
  const commFood = await prisma.committee.findUniqueOrThrow({ where: { name: "Food" } });
  let testExpenseId = 0;

  await runTest("Committee & Budgets", "7.1 Logging expense within committee's remaining budget returns 201 Created", async () => {
    const res = await fetch(`${BASE_URL}/expenses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        committeeId: commFood.id,
        itemTitle: "Automated Test Juice Packs",
        amount: 2000,
        voucherNote: "Stress test voucher",
      }),
    });
    assert(res.status === 201, `Expected 201 Created, got ${res.status}`);
    const json: any = await res.json();
    assert(json.data.amount === 2000, `Expected 2000, got ${json.data.amount}`);
    testExpenseId = json.data.id;
  });

  await runTest("Committee & Budgets", "7.2 Logging expense exceeding committee's remaining budget returns 400 Bad Request", async () => {
    const res = await fetch(`${BASE_URL}/expenses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        committeeId: commFood.id,
        itemTitle: "Excessive Luxury Catering",
        amount: 90000, // Budget is 100k, spent is already 32k
        voucherNote: "Exceeds remaining budget",
      }),
    });
    assert(res.status === 400, `Expected 400 Bad Request, got ${res.status}`);
    const json: any = await res.json();
    assert(/exceeds the committee's remaining allocated budget/i.test(json.message), `Unexpected message: ${json.message}`);

    // Cleanup test expense
    if (testExpenseId) {
      await prisma.expense.delete({ where: { id: testExpenseId } });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 8. ANALYTICS & T-SHIRT MATRIX RECONCILIATION
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ SUITE 8: Analytics & T-Shirt Matrix Exact Reconciliation");
  await runTest("Analytics & Matrix", "8.1 Treasury exact mathematical reconciliation: availableBalance === totalVerifiedByConvenor + totalInflows - totalExpenses", async () => {
    const res = await fetch(`${BASE_URL}/analytics/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    const { data }: any = await res.json();

    const expectedBalance = data.totalVerifiedByConvenor + data.totalInflows - data.totalExpenses;
    assert(
      data.availableBalance === expectedBalance,
      `Formula mismatch: expected ${expectedBalance}, got ${data.availableBalance}`
    );
    assert(data.availableBalance === 100000, `Expected exactly 100,000 BDT, got ${data.availableBalance}`);
    assert(data.totalVerifiedByConvenor === 59000, `Expected 59,000 BDT verified, got ${data.totalVerifiedByConvenor}`);
    assert(data.totalInflows === 95000, `Expected 95,000 BDT inflows, got ${data.totalInflows}`);
    assert(data.totalExpenses === 54000, `Expected 54,000 BDT expenses, got ${data.totalExpenses}`);
    assert(data.totalPendingHandover === 11400, `Expected 11,400 BDT pending, got ${data.totalPendingHandover}`);
  });

  await runTest("Analytics & Matrix", "8.2 T-Shirt Matrix totals: sum(tshirtBreakdown) === 180 and sum(paidTshirtBreakdown) === totalPaidStudents (110)", async () => {
    const res = await fetch(`${BASE_URL}/analytics/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    const { data }: any = await res.json();

    const totalTshirts = data.tshirtBreakdown.reduce((sum: number, item: any) => sum + item._count._all, 0);
    const totalPaidTshirts = data.paidTshirtBreakdown.reduce((sum: number, item: any) => sum + item._count._all, 0);
    const totalDeliveredTshirts = data.deliveredTshirtBreakdown.reduce((sum: number, item: any) => sum + item._count._all, 0);

    assert(totalTshirts === 180, `Expected sum of tshirtBreakdown === 180, got ${totalTshirts}`);
    assert(totalPaidTshirts === 110, `Expected sum of paidTshirtBreakdown === 110, got ${totalPaidTshirts}`);
    assert(data.totalStudents === 180, `Expected totalStudents === 180, got ${data.totalStudents}`);
    assert(data.totalPaidStudents === 110, `Expected totalPaidStudents === 110, got ${data.totalPaidStudents}`);
    assert(data.totalKitsDelivered === 45, `Expected totalKitsDelivered === 45, got ${data.totalKitsDelivered}`);
    assert(totalDeliveredTshirts === 45, `Expected deliveredTshirtBreakdown sum === 45, got ${totalDeliveredTshirts}`);
  });

  // ─────────────────────────────────────────────────────────────
  // FINAL REPORT
  // ─────────────────────────────────────────────────────────────
  console.log("\n========================================================");
  console.log("🏁 TEST SUITE RUN RESULTS SUMMARY");
  console.log("========================================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(` • Total Assertions: ${total}`);
  console.log(` • Passed:           ${passed} ✅`);
  console.log(` • Failed:           ${failed} ❌`);
  console.log(` • Success Rate:     ${Math.round((passed / total) * 100)}%\n`);

  if (failed > 0) {
    console.error("❌ FAILED TESTS:");
    for (const r of results.filter((r) => !r.passed)) {
      console.error(`  - [${r.suite}] ${r.name}: ${r.error}`);
    }
    process.exit(1);
  } else {
    console.log("🎉 ALL PRODUCTION STRESS TESTS & BOUNDARY GUARDS PASSED 100%!");
  }
}

main()
  .catch((err) => {
    console.error("Unhandled Suite Error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
