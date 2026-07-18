import { FoundationKnowledgeSchema } from './foundation-schema';

const completeFoundationItem = {
  schemaVersion: 1,
  id: 'computer-basics.file-system',
  type: 'foundation',
  title: '文件系统是什么',
  domain: 'computer-basics',
  track: 'computer-basics',
  skills: ['computer-basics'],
  level: 'beginner',
  order: 1,
  estimatedMinutes: 8,
  content: {
    simpleExplanation: '文件系统帮助电脑有序地保存和查找信息。',
    analogy: '它像一座有编号楼层和房间的图书馆。',
    technicalExplanation: '目录组织文件，路径描述文件在层级结构中的位置。',
    example: '排查配置时，可以沿着路径定位并读取正确的文件。',
    commonMistakes: '不要把文件名、目录名和完整路径混为一谈。',
  },
  relatedCases: ['case.file-path-debugging'],
};

function candidate() {
  return structuredClone(completeFoundationItem);
}

describe('FoundationKnowledgeSchema', () => {
  it('accepts one complete Foundation item', () => {
    expect(FoundationKnowledgeSchema.safeParse(candidate()).success).toBe(true);
  });

  it('rejects an item with a missing authored explanation', () => {
    const item = candidate() as Record<string, unknown>;
    const content = item.content as Record<string, unknown>;
    delete content.simpleExplanation;

    expect(FoundationKnowledgeSchema.safeParse(item).success).toBe(false);
  });

  it.each([
    ['Skill', 'skills', ['computer-basics', 'computer-basics']],
    [
      'Case',
      'relatedCases',
      ['case.file-path-debugging', 'case.file-path-debugging'],
    ],
  ])('rejects duplicate %s IDs', (_label, field, duplicateIds) => {
    const item = candidate() as Record<string, unknown>;
    item[field] = duplicateIds;

    expect(FoundationKnowledgeSchema.safeParse(item).success).toBe(false);
  });

  it('rejects executable authored text', () => {
    const item = candidate();
    item.content.technicalExplanation =
      '[运行这段内容](javascript:alert(document.cookie))';

    expect(FoundationKnowledgeSchema.safeParse(item).success).toBe(false);
  });

  it('rejects an ID outside the lowercase dot/dash-safe convention', () => {
    const item = candidate();
    item.id = '../Foundation Item';

    expect(FoundationKnowledgeSchema.safeParse(item).success).toBe(false);
  });

  it.each([0, -1])('rejects non-positive order %s', (order) => {
    const item = candidate();
    item.order = order;

    expect(FoundationKnowledgeSchema.safeParse(item).success).toBe(false);
  });

  it.each([0, -1])(
    'rejects non-positive estimated minutes %s',
    (estimatedMinutes) => {
      const item = candidate();
      item.estimatedMinutes = estimatedMinutes;

      expect(FoundationKnowledgeSchema.safeParse(item).success).toBe(false);
    },
  );
});
