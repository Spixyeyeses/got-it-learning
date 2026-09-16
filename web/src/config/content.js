(function configureLearningContent(global) {
  const localSources = ['math', 'english', 'science'].map(subject => ({
    subject,
    url: `./data/${subject}.json?content=2`,
    format: 'nameless-json-v1'
  }));

  global.NAMELESS_CONTENT_CONFIG = {
    version: 3,
    catalogUrl: './data/curriculum/catalog.v3.json',
    provider: {
      id: 'transition-library',
      name: '迁移课程库',
      kind: 'compatibility',
      notice: '当前内容用于迁移验证；正式发布时须替换为已授权内容源。'
    },
    sources: localSources,
    compatibilitySources: localSources,
    manifestUrl: global.NAMELESS_CONTENT_MANIFEST_URL || '',
    acceptedFormats: ['gotit-curriculum-v3', 'nameless-json-v2'],
    interchangeTarget: 'qti-3.0',
    contentPolicy: {
      requireAttribution: true,
      requireLicense: true,
      requireStableIds: true
    }
  };
})(window);
