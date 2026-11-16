import dotenv from "dotenv";
import status from "http-status";
import AppError from "../errorHelpers/AppError.js";

dotenv.config();

interface EnvConfig {
    PORT: string;
    NODE_ENV: string;
    DATABASE_URL: string;
    FRONTEND_URL: string;
    JWT_ACCESS_SECRET: string;
    JWT_REFRESH_SECRET: string;
    JWT_ACCESS_EXPIRES_IN: string;
    JWT_REFRESH_EXPIRES_IN: string;
    BREVO_API_KEY: string;
    BREVO_SENDER_EMAIL: string;
}

const loadEnvVariables = (): EnvConfig => {
    const requiredEnvVariables = [
        "PORT",
        "NODE_ENV",
        "DATABASE_URL",
        "FRONTEND_URL",
        "JWT_ACCESS_SECRET",
        "JWT_REFRESH_SECRET",
        "JWT_ACCESS_EXPIRES_IN",
        "JWT_REFRESH_EXPIRES_IN",
    ];

    requiredEnvVariables.forEach((variable) => {
        if (!process.env[variable]) {
            throw new AppError(
                status.INTERNAL_SERVER_ERROR,
                `Environment variable ${variable} is required but not set in .env file.`
            );
        }
    });

    return {
        PORT: process.env.PORT as string,
        NODE_ENV: process.env.NODE_ENV as string,
        DATABASE_URL: process.env.DATABASE_URL as string,
        FRONTEND_URL: process.env.FRONTEND_URL as string,
        JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET as string,
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET as string,
        JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN as string,
        JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN as string,
        BREVO_API_KEY: (process.env.BREVO_API_KEY || "") as string,
        BREVO_SENDER_EMAIL: (process.env.BREVO_SENDER_EMAIL || "") as string,
    };
};

export const envVars = loadEnvVariables();
