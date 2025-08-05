// vite.config.ts
import { defineConfig } from "vite";

export default defineConfig(() => {
  return {
    server: {
      // https: {
      //   key: fs.readFileSync("key.pem"),
      //   cert: fs.readFileSync("cert.pem"),
      // },
      host: "0.0.0.0",
      port: 5173, // Or your desired port
    },
  };
});
