import { buildApp } from "./app";

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;
  const app = await buildApp();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Tilted server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
