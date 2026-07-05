import type { FastifyInstance } from 'fastify';
import type { SkillRegistry } from '@wac/skills';
import type { SkillListResponse } from '@wac/shared';

export async function registerSkillRoutes(
  app: FastifyInstance,
  registry: SkillRegistry,
): Promise<void> {
  app.get('/api/skills', async (): Promise<SkillListResponse> => ({
    skills: registry.list(),
  }));
}
