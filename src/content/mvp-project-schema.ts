import { z } from 'zod';

import type { MvpProjectCatalog } from '../domain/projects/types';
import { SkillGraphIdentifierSchema } from './skill-graph-schema';

const ProjectSchema = z
  .object({
    id: SkillGraphIdentifierSchema,
    title: z.string().trim().min(1).max(200),
    summary: z.string().trim().min(1).max(2_000),
    requiredLeafSkillIds: z.array(SkillGraphIdentifierSchema).min(1).max(8),
    deliverables: z.array(SkillGraphIdentifierSchema).min(1).max(12),
  })
  .strict();

export const MvpProjectCatalogSchema: z.ZodType<MvpProjectCatalog> = z
  .object({
    schemaVersion: z.literal(1),
    status: z.enum(['draft', 'reviewed']),
    projects: z.array(ProjectSchema).min(1).max(20),
  })
  .strict()
  .superRefine((catalog, refinement) => {
    const ids = new Set<string>();
    catalog.projects.forEach((project, index) => {
      if (ids.has(project.id)) {
        refinement.addIssue({
          code: 'custom',
          path: ['projects', index, 'id'],
          message: `Duplicate Project ID: ${project.id}.`,
        });
      }
      ids.add(project.id);
    });
  });
