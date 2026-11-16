import { TshirtSize } from "@prisma/client";

export interface IRegisterStudentPayload {
    name: string;
    email: string;
    password: string;
    studentId: string;
    phone: string;
    sectionId: number;
    tshirtSize: TshirtSize;
}

export interface ILoginPayload {
    email: string;
    password: string;
}
