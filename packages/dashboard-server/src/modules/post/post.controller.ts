import type { Application } from "express";
import type { Controller } from "../controller.model.js";
import { Container } from "#container";
import { SessionController } from "../session/session.controller.js";
import { PostService } from "./post.service.js";
import { ImageRepository } from "./image.repository.js";

export class PostController implements Controller {
  constructor(
    private readonly session: SessionController,
    private readonly service: PostService,
    private readonly imageRepo: ImageRepository,
  ) {}

  async register(app: Application) {
    app.get("/api/posts/providers", this.session.isAuthenticated, async (_req, res) => {
      res.json(this.service.listProviders());
    });

    app.get("/api/posts", this.session.isAuthenticated, async (_req, res) => {
      const posts = await this.service.listPosts();
      res.json(posts);
    });

    app.delete(
      "/api/posts/:jobId",
      this.session.isAuthenticated,
      async (req, res) => {
        const jobId = Number(req.params.jobId);
        await this.service.deletePost(jobId);
        res.json({ ok: true });
      },
    );

    app.post("/api/posts", this.session.isAuthenticated, async (req, res) => {
      const { providers, text, imageIds, key, runAfter, embed } = req.body;
      const ids = await this.service.createPost(
        providers,
        text,
        imageIds ?? [],
        key,
        runAfter,
        embed,
      );
      res.json({ ids });
    });

    app.post(
      "/api/posts/images",
      this.session.isAuthenticated,
      async (req, res) => {
        const { data, mimeType } = req.body;
        const buffer = Buffer.from(data, "base64");
        const id = await this.imageRepo.insert(buffer, mimeType);
        res.json({ id });
      },
    );

    app.get(
      "/api/posts/images",
      this.session.isAuthenticated,
      async (_req, res) => {
        const images = await this.imageRepo.findAll();
        const jobs = await this.service.listPosts();
        const refs = new Map<number, string[]>();
        for (const item of jobs) {
          const payload = item.job.payload as {
            imageIds?: number[];
            embed?: { imageId?: number };
          };
          const ref = item.job.uniqueKey ?? `job-${item.job.id}`;
          if (payload.imageIds) {
            for (const id of payload.imageIds) {
              if (!refs.has(id)) refs.set(id, []);
              refs.get(id)!.push(ref);
            }
          }
          if (payload.embed?.imageId != null) {
            const id = payload.embed.imageId;
            if (!refs.has(id)) refs.set(id, []);
            refs.get(id)!.push(ref);
          }
        }
        res.json(
          images.map((img) => ({
            ...img,
            references: refs.get(img.id) ?? [],
          })),
        );
      },
    );

    app.get(
      "/api/posts/images/:id",
      this.session.isAuthenticated,
      async (req, res) => {
        const id = Number(req.params.id);
        const image = await this.imageRepo.findById(id);
        if (!image) {
          res.status(404).json({ error: "Image not found" });
          return;
        }
        res.set("Content-Type", image.mimeType);
        res.send(Buffer.from(image.data));
      },
    );

    app.delete(
      "/api/posts/images/:id",
      this.session.isAuthenticated,
      async (req, res) => {
        const id = Number(req.params.id);
        await this.imageRepo.deleteByIds([id]);
        res.json({ ok: true });
      },
    );
  }
}

Container.register(PostController, [
  SessionController,
  PostService,
  ImageRepository,
]);
