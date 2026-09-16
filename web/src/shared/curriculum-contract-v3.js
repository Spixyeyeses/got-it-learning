(function initializeCurriculumContractV3(global) {
  const REVIEW_STAGES = ['draft', 'structure-checked', 'answer-checked', 'content-reviewed', 'releasable'];
  const ITEM_TYPES = new Set(['single_choice', 'multiple_choice', 'boolean', 'number', 'text', 'fill_blank', 'short_response', 'ordering', 'matching', 'reading']);
  const ASSESSMENT_ROLES = new Set(['recognition', 'application', 'misconception', 'transfer']);

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  function isLocalized(value) {
    return !!value && typeof value.zh === 'string' && value.zh.trim() && typeof value.en === 'string' && value.en.trim();
  }

  function validateDemo(demo, lessonId, requireReleasable) {
    if (!demo && !requireReleasable) return;
    assert(demo && Number.isInteger(demo.durationMinutes) && demo.durationMinutes >= 1 && demo.durationMinutes <= 10, `${lessonId}: 课前讲解时长无效`);
    assert(isLocalized(demo.concept) && isLocalized(demo.takeaway) && isLocalized(demo.commonMistake), `${lessonId}: 课前讲解内容不完整`);
    assert(Array.isArray(demo.steps) && demo.steps.length >= 2 && demo.steps.length <= 5 && demo.steps.every(isLocalized), `${lessonId}: 讲解步骤不完整`);
    assert(isLocalized(demo.example?.prompt) && isLocalized(demo.example?.answer), `${lessonId}: 讲解例题不完整`);
    assert(Array.isArray(demo.example?.steps) && demo.example.steps.length && demo.example.steps.length <= 5 && demo.example.steps.every(isLocalized), `${lessonId}: 例题步骤不完整`);
  }

  function reviewStageAtLeast(stage, minimum) {
    return REVIEW_STAGES.indexOf(stage) >= REVIEW_STAGES.indexOf(minimum);
  }

  function validateCatalog(catalog) {
    assert(catalog?.schemaVersion === 3, '课程目录版本必须为 3');
    assert(catalog.jurisdiction === 'CN-MAINLAND', '课程目录地区必须为中国大陆');
    assert(Array.isArray(catalog.sources) && catalog.sources.length >= 3, '课程目录缺少官方来源');
    assert(Array.isArray(catalog.subjects) && catalog.subjects.length >= 16, '课程目录必须登记义务教育全部课程标准');
    assert(Array.isArray(catalog.standards) && catalog.standards.length, '课程目录缺少课程标准');
    assert(Array.isArray(catalog.textbookSeries), '课程目录缺少教材版本登记');
    assert(Array.isArray(catalog.packages), '课程目录缺少内容包清单');
    const sourceIds = new Set();
    for (const source of catalog.sources) {
      assert(source?.id && !sourceIds.has(source.id), `官方来源编号缺失或重复：${source?.id || '?'}`);
      sourceIds.add(source.id);
      assert(source.title && source.authority && source.url, `${source.id}: 官方来源信息不完整`);
    }
    const standardIds = new Set();
    for (const standard of catalog.standards) {
      assert(standard?.id && !standardIds.has(standard.id), `课程标准编号缺失或重复：${standard?.id || '?'}`);
      standardIds.add(standard.id);
      assert(isLocalized(standard.title) && sourceIds.has(standard.sourceId), `${standard.id}: 课程标准来源无效`);
    }
    const subjectIds = new Set();
    for (const subject of catalog.subjects) {
      assert(subject?.id && !subjectIds.has(subject.id), `课程编号缺失或重复：${subject?.id || '?'}`);
      subjectIds.add(subject.id);
      assert(isLocalized(subject.title) && standardIds.has(subject.standardId), `课程信息不完整：${subject.id}`);
    }
    const textbookIds = new Set();
    for (const series of catalog.textbookSeries) {
      assert(series?.id && !textbookIds.has(series.id), `教材版本编号缺失或重复：${series?.id || '?'}`);
      textbookIds.add(series.id);
      assert(series.title && series.publisher && sourceIds.has(series.catalogSourceId), `${series.id}: 教材版本信息不完整`);
      assert(Array.isArray(series.subjectIds) && series.subjectIds.every(id => subjectIds.has(id)), `${series.id}: 教材学科映射无效`);
    }
    const packageIds = new Set();
    for (const packageRef of catalog.packages) {
      assert(packageRef?.id && !packageIds.has(packageRef.id), `内容包编号缺失或重复：${packageRef?.id || '?'}`);
      packageIds.add(packageRef.id);
      assert(packageRef.manifestUrl && subjectIds.has(packageRef.subjectId), `${packageRef.id}: 内容包目录信息不完整`);
      if (packageRef.textbookSeriesId) assert(textbookIds.has(packageRef.textbookSeriesId), `${packageRef.id}: 教材版本不存在`);
    }
    return catalog;
  }

  function validatePackageManifest(manifest, packageRef = { id: manifest?.id, enabled: false }) {
    assert(manifest?.schemaVersion === 3, `${packageRef.id}: 内容包版本必须为 3`);
    assert(manifest.id === packageRef.id, `${packageRef.id}: 内容包编号不一致`);
    assert(manifest.jurisdiction === 'CN-MAINLAND', `${manifest.id}: 地区无效`);
    assert(manifest.subjectId && Number.isInteger(manifest.grade), `${manifest.id}: 学科或年级缺失`);
    assert(['6-3', '5-4', 'both'].includes(manifest.academicSystem), `${manifest.id}: 学制无效`);
    assert(['first', 'second', 'full-year', 'module'].includes(manifest.term), `${manifest.id}: 学期无效`);
    assert(manifest.provider?.id && manifest.provider?.license && manifest.provider?.sourceUrl && manifest.provider?.contentKind, `${manifest.id}: 来源或授权声明缺失`);
    assert(Array.isArray(manifest.standardRefs) && manifest.standardRefs.length, `${manifest.id}: 课程标准映射缺失`);
    assert(manifest.textbookMapping?.status && manifest.textbookMapping?.rights, `${manifest.id}: 教材版权状态缺失`);
    assert(manifest.release?.version && manifest.release?.publishedAt && Array.isArray(manifest.release.reviewedBy), `${manifest.id}: 发布记录不完整`);
    assert(REVIEW_STAGES.includes(manifest.release.reviewStage), `${manifest.id}: 内容审核阶段无效`);
    if (packageRef.enabled) {
      assert(manifest.release.status !== 'retired', `${manifest.id}: 已停用内容包不能启用`);
      assert(manifest.release.reviewStage === 'releasable', `${manifest.id}: 内容尚未达到可发布阶段`);
    }
    assert(Array.isArray(manifest.shards) && manifest.shards.length, `${manifest.id}: 没有内容分片`);
    const shardIds = new Set();
    const shardUrls = new Set();
    for (const shard of manifest.shards) {
      assert(shard?.id && !shardIds.has(shard.id), `${manifest.id}: 分片编号缺失或重复`);
      assert(shard.url && !shardUrls.has(shard.url), `${manifest.id}: 分片地址缺失或重复`);
      shardIds.add(shard.id);
      shardUrls.add(shard.url);
      assert(['lesson-items', 'knowledge', 'mixed'].includes(shard.kind), `${shard.id}: 分片类型无效`);
      if (shard.sha256) assert(/^[a-f0-9]{64}$/.test(shard.sha256), `${shard.id}: 分片校验值无效`);
      if (shard.itemCount !== undefined) assert(Number.isInteger(shard.itemCount) && shard.itemCount >= 0, `${shard.id}: 题目数量无效`);
    }
    return manifest;
  }

  function validateDeterministicItem(item, lessonId, { requireReleasable = true } = {}) {
    assert(ITEM_TYPES.has(item.type), `${item.id}: 题型无效`);
    assert(ASSESSMENT_ROLES.has(item.assessmentRole), `${item.id}: 考查角色无效`);
    assert(typeof item.variantGroup === 'string' && item.variantGroup.trim(), `${item.id}: 变式组缺失`);
    assert(Number.isInteger(item.difficulty) && item.difficulty >= 1 && item.difficulty <= 5, `${item.id}: 难度必须为1到5`);
    assert(isLocalized(item.question) && isLocalized(item.explanation), `${item.id}: 题干或解析不完整`);
    assert(item.source?.providerItemId && item.source?.origin && item.source?.licenseId, `${item.id}: 来源与许可编号缺失`);
    assert(REVIEW_STAGES.includes(item.review?.status), `${item.id}: 题目审核阶段无效`);
    if (reviewStageAtLeast(item.review.status, 'structure-checked')) assert(item.review.structureChecked === true, `${item.id}: 结构尚未校验`);
    if (reviewStageAtLeast(item.review.status, 'answer-checked')) assert(item.review.answerChecked === true, `${item.id}: 答案尚未校验`);
    if (reviewStageAtLeast(item.review.status, 'content-reviewed')) assert(item.review.contentReviewed === true, `${item.id}: 内容尚未复核`);
    if (requireReleasable) {
      assert(item.review.status === 'releasable', `${item.id}: 题目尚未达到可发布阶段`);
      assert(item.review.structureChecked === true, `${item.id}: 结构尚未校验`);
      assert(item.review.answerChecked === true, `${item.id}: 答案尚未校验`);
      assert(item.review.contentReviewed === true, `${item.id}: 内容尚未复核`);
    }
    const hasAnswer = item.answer !== undefined || Array.isArray(item.answers) && item.answers.length;
    assert(hasAnswer, `${item.id}: 缺少答案`);
    if (item.type === 'single_choice') {
      assert(Array.isArray(item.options) && item.options.length >= 2, `${item.id}: 单选题缺少选项`);
      assert(Number.isInteger(item.answer) && item.answer >= 0 && item.answer < item.options.length, `${item.id}: 单选答案越界`);
    } else if (item.type === 'multiple_choice') {
      const answers = Array.isArray(item.answer) ? item.answer : item.answers;
      assert(Array.isArray(item.options) && item.options.length >= 2 && Array.isArray(answers) && answers.length, `${item.id}: 多选题结构不完整`);
      assert(new Set(answers).size === answers.length && answers.every(index => Number.isInteger(index) && index >= 0 && index < item.options.length), `${item.id}: 多选答案无效`);
    } else if (item.type === 'boolean') {
      assert(typeof item.answer === 'boolean', `${item.id}: 判断题答案必须为布尔值`);
    } else if (item.type === 'number') {
      assert(typeof item.answer === 'number' && Number.isFinite(item.answer), `${item.id}: 数值题答案无效`);
    } else if (item.type === 'ordering') {
      assert(Array.isArray(item.items) && item.items.length >= 2, `${item.id}: 排序题缺少元素`);
      assert(Array.isArray(item.answer) && item.answer.length === item.items.length, `${item.id}: 排序答案数量不匹配`);
      assert(new Set(item.answer).size === item.answer.length && item.answer.every(index => Number.isInteger(index) && index >= 0 && index < item.items.length), `${item.id}: 排序答案不是有效排列`);
    } else if (['text', 'fill_blank', 'short_response'].includes(item.type)) {
      assert(item.answer !== '' || Array.isArray(item.answers) && item.answers.length, `${item.id}: 文本答案为空`);
    }
    assert(item.knowledgeId, `${lessonId}: 题目 ${item.id} 缺少知识点`);
  }

  function validateShard(shard, manifest, shardRef = null, { requireReleasable = true } = {}) {
    assert(shard?.schemaVersion === 3 && shard.packageId === manifest.id, `${manifest.id}: 分片归属无效`);
    assert(Array.isArray(shard.knowledge) && shard.knowledge.length, `${manifest.id}: 分片缺少知识点`);
    assert(Array.isArray(shard.units) && shard.units.length, `${manifest.id}: 分片缺少单元`);
    const localIds = new Set();
    for (const node of shard.knowledge) {
      assert(node?.id && !localIds.has(node.id), `${manifest.id}: 重复知识点 ${node?.id || '?'}`);
      localIds.add(node.id);
      assert(isLocalized(node.title) && node.domain && Array.isArray(node.objectives) && node.objectives.length, `${manifest.id}: 知识点结构不完整`);
      assert(Array.isArray(node.prerequisites) && Array.isArray(node.misconceptions), `${node.id}: 先修知识或常见错误缺失`);
    }
    const unitIds = new Set();
    const unitOrders = new Set();
    let itemCount = 0;
    for (const unit of shard.units) {
      assert(unit?.id && !unitIds.has(unit.id) && isLocalized(unit.title) && Array.isArray(unit.lessons) && unit.lessons.length, `${manifest.id}: 单元结构不完整或重复`);
      assert(Number.isInteger(unit.order) && unit.order > 0 && !unitOrders.has(unit.order), `${unit.id}: 单元顺序无效或重复`);
      unitIds.add(unit.id);
      unitOrders.add(unit.order);
      const lessonOrders = new Set();
      for (const lesson of unit.lessons) {
        assert(lesson?.id && isLocalized(lesson.title) && isLocalized(lesson.description) && isLocalized(lesson.learningGoal), `${unit.id}: 课次信息不完整`);
        validateDemo(lesson.demo, lesson.id, requireReleasable);
        assert(Number.isInteger(lesson.order) && lesson.order > 0 && !lessonOrders.has(lesson.order), `${lesson.id}: 课次顺序无效或重复`);
        lessonOrders.add(lesson.order);
        assert(Array.isArray(lesson.knowledgeIds) && lesson.knowledgeIds.length, `${lesson.id}: 课次知识点缺失`);
        assert(Array.isArray(lesson.prerequisiteKnowledgeIds), `${lesson.id}: 先修知识字段缺失`);
        assert(Array.isArray(lesson.commonMistakes) && lesson.commonMistakes.length, `${lesson.id}: 常见错误缺失`);
        assert(Array.isArray(lesson.legacyAliases), `${lesson.id}: 旧记录别名字段缺失`);
        assert(Array.isArray(lesson.hints) && lesson.hints.length === 3, `${lesson.id}: 必须提供三层提示`);
        assert(lesson.hints.map(hint => hint.level).sort().join(',') === '1,2,3', `${lesson.id}: 提示层级必须为1、2、3`);
        assert(lesson.hints.every(hint => ['direction', 'steps', 'example'].includes(hint.kind) && isLocalized(hint.text)), `${lesson.id}: 提示内容不完整`);
        assert(lesson.reviewPolicy?.masteryThreshold >= 1 && lesson.reviewPolicy?.masteryThreshold <= 100, `${lesson.id}: 掌握阈值无效`);
        assert(Array.isArray(lesson.reviewPolicy?.intervalDays) && lesson.reviewPolicy.intervalDays.length && lesson.reviewPolicy.intervalDays.every(day => Number.isInteger(day) && day > 0), `${lesson.id}: 复习间隔无效`);
        assert(REVIEW_STAGES.includes(lesson.reviewStage), `${lesson.id}: 课次审核阶段无效`);
        if (requireReleasable) assert(lesson.reviewStage === 'releasable', `${lesson.id}: 课次尚未达到可发布阶段`);
        assert(Array.isArray(lesson.items) && lesson.items.length, `${lesson.id}: 没有题目`);
        const lessonRoles = new Set();
        const lessonTypes = new Set();
        const lessonVariantGroups = new Set();
        for (const item of lesson.items) {
          assert(item?.id, `${lesson.id}: 题目编号缺失`);
          validateDeterministicItem(item, lesson.id, { requireReleasable });
          lessonRoles.add(item.assessmentRole);
          lessonTypes.add(item.type);
          lessonVariantGroups.add(item.variantGroup);
          itemCount += 1;
        }
        if (requireReleasable) {
          assert(lessonRoles.has('application'), `${lesson.id}: 题池缺少直接应用题`);
          assert(lessonRoles.has('misconception') || lessonRoles.has('transfer'), `${lesson.id}: 题池缺少易错辨析或迁移题`);
          assert(lessonVariantGroups.size >= Math.min(5, lesson.items.length), `${lesson.id}: 不同变式组不足以组成一轮练习`);
          assert(lessonTypes.size >= Math.min(3, lesson.items.length), `${lesson.id}: 题型种类不足`);
        }
      }
    }
    if (shardRef?.itemCount !== undefined) assert(shardRef.itemCount === itemCount, `${shardRef.id}: 清单题目数量与分片不一致`);
    return shard;
  }

  function validatePackageDocuments(manifest, shards) {
    assert(Array.isArray(shards) && shards.length === manifest.shards.length, `${manifest.id}: 内容分片数量不完整`);
    const knowledgeIds = new Set();
    const lessonIds = new Set();
    const itemIds = new Set();
    const providerItemIds = new Set();
    const aliases = new Set();
    const usedKnowledge = new Set();
    for (const shard of shards) {
      for (const node of shard.knowledge) {
        assert(!knowledgeIds.has(node.id), `${manifest.id}: 跨分片重复知识点 ${node.id}`);
        knowledgeIds.add(node.id);
      }
    }
    for (const shard of shards) {
      for (const node of shard.knowledge) {
        for (const prerequisite of node.prerequisites) {
          assert(prerequisite !== node.id && knowledgeIds.has(prerequisite), `${node.id}: 先修知识不存在或指向自身 ${prerequisite}`);
        }
      }
      for (const unit of shard.units) {
        for (const lesson of unit.lessons) {
          assert(!lessonIds.has(lesson.id), `${manifest.id}: 跨分片重复课次 ${lesson.id}`);
          lessonIds.add(lesson.id);
          for (const id of [...lesson.knowledgeIds, ...lesson.prerequisiteKnowledgeIds]) assert(knowledgeIds.has(id), `${lesson.id}: 未找到知识点 ${id}`);
          lesson.knowledgeIds.forEach(id => usedKnowledge.add(id));
          for (const alias of lesson.legacyAliases) {
            assert(!aliases.has(alias), `${manifest.id}: 旧记录别名重复 ${alias}`);
            aliases.add(alias);
          }
          for (const item of lesson.items) {
            assert(!itemIds.has(item.id), `${manifest.id}: 跨分片重复题目 ${item.id}`);
            assert(!providerItemIds.has(item.source.providerItemId), `${manifest.id}: 来源题目编号重复 ${item.source.providerItemId}`);
            assert(lesson.knowledgeIds.includes(item.knowledgeId), `${item.id}: 题目知识点不属于当前课次`);
            itemIds.add(item.id);
            providerItemIds.add(item.source.providerItemId);
          }
        }
      }
    }
    for (const id of knowledgeIds) assert(usedKnowledge.has(id), `${manifest.id}: 存在未被课次使用的知识点 ${id}`);
    return { knowledgeCount: knowledgeIds.size, lessonCount: lessonIds.size, itemCount: itemIds.size };
  }

  function countShardItems(shard) {
    return shard.units.reduce((total, unit) => total + unit.lessons.reduce((sum, lesson) => sum + lesson.items.length, 0), 0);
  }

  global.CurriculumContractV3 = Object.freeze({
    REVIEW_STAGES: [...REVIEW_STAGES],
    reviewStageAtLeast,
    validateCatalog,
    validatePackageManifest,
    validateShard,
    validatePackageDocuments,
    countShardItems
  });
})(globalThis);
