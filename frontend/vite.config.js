import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const imageKitAuthHandler = require("./api/imagekit-auth.js");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  Object.assign(process.env, env);

  return {
    plugins: [
      react(),
      {
        name: "campusconnect-api",

        configureServer(server) {
          server.middlewares.use(
            "/api/imagekit-auth",
            async (req, res, next) => {
              if (req.method !== "GET") {
                return next();
              }

              try {
                await imageKitAuthHandler(req, res);
              } catch (error) {
                console.error(
                  "LOCAL IMAGEKIT API ERROR:",
                  error
                );

                if (!res.headersSent) {
                  res.statusCode = 500;
                  res.setHeader(
                    "Content-Type",
                    "application/json"
                  );

                  res.end(
                    JSON.stringify({
                      error:
                        "Unable to authenticate ImageKit upload.",
                    })
                  );
                }
              }
            }
          );
        },
      },
    ],

    server: {
      host: "0.0.0.0",
      port: Number(process.env.PORT) || 5173,
      strictPort: true,
    },
  };
});