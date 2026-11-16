import { Server } from "node:http";
import app from "./app.js";
import { envVars } from "./app/config/env.js";
import { prisma, pool } from "./app/lib/prisma.js";

const PORT = Number(envVars.PORT) || 5000;
let server: Server;

const bootstrap = async () => {
    try {
        server = app.listen(PORT, "0.0.0.0", () => {
            console.log(`Server is running on http://0.0.0.0:${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

const gracefulShutdown = async (signal: string) => {
    console.log(`Received ${signal}. Gracefully shutting down...`);
    if (server) {
        server.close(async () => {
            console.log("HTTP server closed.");
            try {
                await prisma.$disconnect();
                await pool.end();
                console.log("Database connections closed.");
                process.exit(0);
            } catch (err) {
                console.error("Error during graceful shutdown:", err);
                process.exit(1);
            }
        });
    } else {
        process.exit(0);
    }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

bootstrap().catch((error) => {
    console.error("Error in bootstrap:", error);
    process.exit(1);
});
