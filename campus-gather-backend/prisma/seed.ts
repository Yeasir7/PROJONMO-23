import * as fs from "fs";
import * as path from "path";
import { Role, TshirtSize } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { prisma, pool } from "../src/app/lib/prisma.js";

async function main() {
    console.log("🌱 Seeding CSE Fest 2026 Database...");

    // 1. Seed 38 Sections (Semesters 1 to 8)
    console.log("🏫 Seeding Sections...");
    // Delete phantom sections if they exist
    await prisma.section.deleteMany({
        where: { code: { in: ["4D", "6C", "6D", "7H", "7I", "7J"] } },
    });

    const semesterConfigs = [
        { semester: 8, fee: 1500, sections: ["A", "B", "C"] },
        { semester: 7, fee: 1200, sections: ["A", "B", "C", "D", "E", "F", "G"] },
        { semester: 6, fee: 1200, sections: ["A", "B"] },
        { semester: 5, fee: 0, sections: ["A", "B", "C", "D", "E"] },
        { semester: 4, fee: 0, sections: ["A", "B", "C"] },
        { semester: 3, fee: 0, sections: ["A", "B", "C", "D", "E", "F", "G"] },
        { semester: 2, fee: 0, sections: ["A", "B", "C", "D", "E", "F", "G"] },
        { semester: 1, fee: 0, sections: ["A", "B", "C", "D"] },
    ];

    for (const config of semesterConfigs) {
        for (const sectionName of config.sections) {
            const code = `${config.semester}${sectionName}`;

            await prisma.section.upsert({
                where: { code },
                update: {},
                create: {
                    semester: config.semester,
                    sectionName,
                    code,
                    festFee: config.fee,
                },
            });
        }
    }

    // 2. Seed All 13 Committees
    console.log("👥 Seeding 13 Fest Committees...");
    const committeesData = [
        { name: "Programming Contest", allocatedBudget: 25000, description: "Intra-department speed coding competition" },
        { name: "Project Showcase", allocatedBudget: 20000, description: "Software and hardware project demonstrations" },
        { name: "Poster Presentation", allocatedBudget: 15000, description: "Research and technical poster displays" },
        { name: "Formal", allocatedBudget: 15000, description: "Opening, closing, and award ceremonies" },
        { name: "Gaming Contest", allocatedBudget: 20000, description: "E-sports, eFootball, and LAN tournaments" },
        { name: "Female Indoor", allocatedBudget: 10000, description: "Indoor sports segments for female students" },
        { name: "Sponsor", allocatedBudget: 5000, description: "Industry sponsorships and partnerships" },
        { name: "Decoration and Stage", allocatedBudget: 35000, description: "Auditorium stage, lighting, and campus decor" },
        { name: "Food", allocatedBudget: 100000, description: "Student lunches, guest snacks, and refreshments" },
        { name: "Marketing Promotion & Graphics", allocatedBudget: 12000, description: "Social media, banners, and digital assets" },
        { name: "Discipline & Securities", allocatedBudget: 5000, description: "Crowd control, security, and event coordination" },
        { name: "Finance", allocatedBudget: 5000, description: "Accounts audit and fund reconciliation" },
        { name: "Cultural", allocatedBudget: 40000, description: "Stage drama, band performances, and cultural night" },
    ];

    for (const comm of committeesData) {
        await prisma.committee.upsert({
            where: { name: comm.name },
            update: {},
            create: comm,
        });
    }

    // 3. Seed Allowed Students (CSE Whitelist)
    console.log("📋 Seeding Allowed Students...");
    const allowedStudentsPath = path.join(process.cwd(), "prisma", "data", "allowed-students.json");
    if (fs.existsSync(allowedStudentsPath)) {
        const allowedStudentsRaw = fs.readFileSync(allowedStudentsPath, "utf-8");
        const allowedStudents: { studentId: string; fullName: string }[] = JSON.parse(allowedStudentsRaw);

        await prisma.allowedStudent.createMany({
            data: allowedStudents.map((student) => ({
                studentId: student.studentId,
                fullName: student.fullName,
                isClaimed: false,
            })),
            skipDuplicates: true,
        });

        console.log(`✅ Seeded ${allowedStudents.length} allowed students`);
    }

    // 4. Seed Super Admin (strictly sync name from allowed_students)
    console.log("👑 Seeding Super Admin...");
    const section8A = await prisma.section.findUnique({ where: { code: "8A" } });
    const adminPassword = await bcrypt.hash("Password@123", 10);
    const superAdminAllowed = await prisma.allowedStudent.findUniqueOrThrow({
        where: { studentId: "11230121177" },
    });

    await prisma.user.upsert({
        where: { studentId: "11230121177" },
        update: {
            name: superAdminAllowed.fullName,
        },
        create: {
            name: superAdminAllowed.fullName,
            email: "ibnayeasir@gmail.com",
            password: adminPassword,
            studentId: "11230121177",
            phone: "01863775368",
            role: Role.SUPER_ADMIN,
            tshirtSize: TshirtSize.XL,
            sectionId: section8A?.id,
        },
    });

    await prisma.allowedStudent.update({
        where: { studentId: "11230121177" },
        data: { isClaimed: true },
    });

    console.log("🚀 Database seeded successfully!");
}

main()
    .catch((e) => {
        console.error("❌ Seeding failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });