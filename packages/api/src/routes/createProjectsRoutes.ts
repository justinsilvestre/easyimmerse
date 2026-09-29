import type { FastifyPluginAsync } from "fastify";
import type { NewProject, Project } from "../contract.ts";
import type { Database } from "../database/openDatabase.ts";
import { projects } from "../database/schema.ts";

type ProjectRow = typeof projects.$inferSelect;

const newProjectSchema = {
  type: "object",
  required: ["name", "targetLanguage"],
  properties: {
    name: { type: "string", minLength: 1 },
    targetLanguage: { type: "string", minLength: 1 },
  },
};

export function createProjectsRoutes(database: Database): FastifyPluginAsync {
  return async (server) => {
    server.get("/projects", async (): Promise<Project[]> => {
      const rows = await database.select().from(projects);
      return rows.map(toProject);
    });

    server.post<{ Body: NewProject }>(
      "/projects",
      { schema: { body: newProjectSchema } },
      async (request, reply): Promise<Project> => {
        const row = await insertProject(database, request.body);
        reply.code(201);
        return toProject(row);
      },
    );
  };
}

async function insertProject(database: Database, newProject: NewProject) {
  const values = { ...newProject, createdAt: new Date() };
  const [row] = await database.insert(projects).values(values).returning();
  if (!row) throw new Error("The project was not saved.");
  return row;
}

function toProject(row: ProjectRow): Project {
  return { ...row, createdAt: row.createdAt.toISOString() };
}
