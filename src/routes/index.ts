import { eq } from "drizzle-orm";
import { Elysia, t } from "elysia";

import { db } from "~/db/client";
import { Result } from "~/db/schema";
import { env } from "~/env";
import Index from "~/html/pages/index/page";
import { renderReact } from "~/html/server";
import { createHash, nanoid } from "~/lib/crypto";
import { getFilePath } from "~/lib/file";
import { DEFAULT_COOKIE_OPTS, jwt } from "~/lib/jwt";

export const index = new Elysia()
  .use(jwt)
  .get("/", async ({ cookie, jwt }) => {
    const data = await db.select().from(Result);
    data.sort((a, b) => b.expiresAt.getTime() - a.expiresAt.getTime());

    return renderReact(
      Index,
      { results: data.reverse() },
      {
        title: "demucs-web",
        description:
          "Separate vocals from music tracks with AI-powered tool. Upload your audio file and let the magic happen.",
        clientScript: "src/html/pages/index/client.ts",
      },
    );
  })
  .post(
    "/",
    async ({ body, error, jwt, cookie, redirect }) => {
      if (body.file.type.split("/")[0] !== "audio") {
        return error(400);
      }

      const model = body.model;
      let stems = 4;
      const lowerModel = model.toLowerCase();
      if (model === "htdemucs_6s") stems = 6;
      else if (model === "2stems" || lowerModel.includes("roformer") || lowerModel.includes("mdx") || model.endsWith(".ckpt") || model.endsWith(".onnx")) stems = 2;

      const twoStems = stems === 2;

      const id = nanoid();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7); // 7 days

      const extension = body.file.name.split(".").pop();
      const filename = `original.${extension}`;
      await Bun.write(getFilePath(id, filename), body.file);

      await db.insert(Result).values({
        id,
        name: body.file.name.split(".").shift() ?? "",
        status: "processing",
        twoStems,
        stems,
        model,
        createdAt: now,
        expiresAt,
      });

      const data = JSON.stringify({
        id,
        filename,
        two_stems: twoStems,
        stems,
        model,
        hash: createHash(id),
      });

      const apiUrl = new URL(`${env.DEMUCS_API}/predict`);
      const http =
        apiUrl.protocol === "https:"
          ? await import("node:https")
          : await import("node:http");

      const req = http.request(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
          Authorization: `Bearer ${env.DEMUCS_API_KEY}`,
        },
      });

      req.on("error", async (e) => {
        console.error(e);
        await db
          .update(Result)
          .set({ status: "error" })
          .where(eq(Result.id, id));
      });
      req.write(data);
      req.end();

      const jwtData = await jwt.verify(cookie.auth.value);
      cookie.auth.set({
        value: await jwt.sign({
          results: jwtData ? [...jwtData.results, id] : [id],
        }),
        ...DEFAULT_COOKIE_OPTS,
      });

      return redirect(`/result/${id}`, 303);
    },
    {
      body: t.Object({
        model: t.String({ default: "htdemucs" }),
        file: t.File(),
      }),
    },
  )
  .post(
    "/enhance",
    async ({ body, error, jwt, cookie, redirect }) => {
      console.log("=== ENHANCE ROUTE HIT ===");
      console.log("BODY:", body);
      const id = nanoid();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7); // 7 days

      let filename = "original.mp3";
      let originalName = "Enhanced Audio";

      if (body.sourceResultId && body.sourceFilename) {
        // We are enhancing an existing file (like vocals.mp3 from a separation)
        const sourcePath = getFilePath(body.sourceResultId, body.sourceFilename);
        const file = Bun.file(sourcePath);
        if (!(await file.exists())) return error(404, "Source file not found");
        
        await Bun.write(getFilePath(id, filename), await file.arrayBuffer());
        originalName = `${body.sourceFilename.split('.')[0]} (Enhanced)`;
      } else if (body.file) {
        // Direct file upload
        if (body.file.type.split("/")[0] !== "audio") return error(400);
        const extension = body.file.name.split(".").pop();
        filename = `original.${extension}`;
        await Bun.write(getFilePath(id, filename), body.file);
        originalName = body.file.name.split(".").shift() ?? "Enhanced Audio";
      } else {
        return error(400, "Must provide either file or sourceResultId/sourceFilename");
      }

      // Collect enhancer settings
      const enhancerSettings = {
        dereverb: body.dereverb === "on",
        dereverb_model: body.dereverb_model,
        eq: body.eq === "on",
        eq_warmth: parseFloat(body.eq_warmth || "0"),
        eq_harshness: parseFloat(body.eq_harshness || "0"),
        eq_air: parseFloat(body.eq_air || "0"),
        dynamics: body.dynamics === "on",
        compressor_threshold: parseFloat(body.compressor_threshold || "0"),
        compressor_ratio: parseFloat(body.compressor_ratio || "1"),
      };

      await db.insert(Result).values({
        id,
        name: originalName,
        status: "processing",
        twoStems: false,
        stems: 1,
        model: "vocal-enhancer",
        createdAt: now,
        expiresAt,
        enhancerSettings: JSON.stringify(enhancerSettings),
      });

      const data = JSON.stringify({
        id,
        filename,
        two_stems: false,
        stems: 1,
        model: "vocal-enhancer",
        hash: createHash(id),
        enhancer_settings: enhancerSettings,
      });

      const apiUrl = new URL(`${env.DEMUCS_API}/predict`);
      const http = apiUrl.protocol === "https:" ? await import("node:https") : await import("node:http");

      const req = http.request(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
          Authorization: `Bearer ${env.DEMUCS_API_KEY}`,
        },
      });

      req.on("error", async (e) => {
        console.error(e);
        await db.update(Result).set({ status: "error" }).where(eq(Result.id, id));
      });
      req.write(data);
      req.end();

      const jwtData = await jwt.verify(cookie.auth.value);
      cookie.auth.set({
        value: await jwt.sign({
          results: jwtData ? [...jwtData.results, id] : [id],
        }),
        ...DEFAULT_COOKIE_OPTS,
      });

      return redirect(`/result/${id}`, 303);
    },
    {
      body: t.Object({
        file: t.Optional(t.Any()),
        sourceResultId: t.Optional(t.String()),
        sourceFilename: t.Optional(t.String()),
        dereverb: t.Optional(t.String()),
        dereverb_model: t.Optional(t.String()),
        eq: t.Optional(t.String()),
        eq_warmth: t.Optional(t.String()),
        eq_harshness: t.Optional(t.String()),
        eq_air: t.Optional(t.String()),
        dynamics: t.Optional(t.String()),
        compressor_threshold: t.Optional(t.String()),
        compressor_ratio: t.Optional(t.String()),
      }),
    }
  );
