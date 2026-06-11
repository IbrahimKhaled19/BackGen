import type { Server } from "http";
import { prisma } from "../config/database.js";

export function attachGracefulShutdown(server: Server, signals: NodeJS.EventEmitter["eventNames"] extends (infer T)[] ? T : never = ["SIGTERM", "SIGINT"] as never): void {
  for (const signal of signals as string[]) {
    process.once(signal, () => {
      // eslint-disable-next-line no-console
      console.log(`[shutdown] received ${signal}, closing server...`);
      server.close(async (err) => {
        if (err) {
          // eslint-disable-next-line no-console
          console.error("[shutdown] error during close:", err);
          process.exit(1);
        }
        try {
          await prisma.$disconnect();
          // eslint-disable-next-line no-console
          console.log("[shutdown] prisma disconnected, exiting");
          process.exit(0);
        } catch (disconnectErr) {
          // eslint-disable-next-line no-console
          console.error("[shutdown] disconnect failed:", disconnectErr);
          process.exit(1);
        }
      });

      // Force-exit if shutdown takes too long
      setTimeout(() => {
        // eslint-disable-next-line no-console
        console.error("[shutdown] forced exit after 10s");
        process.exit(1);
      }, 10_000).unref();
    });
  }
}
