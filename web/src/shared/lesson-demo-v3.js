(function initializeLessonDemoV3(global) {
  function localize(value, lang) {
    if (value && typeof value === 'object' && !Array.isArray(value)) return String(value[lang] ?? value.zh ?? value.en ?? '');
    return String(value ?? '');
  }

  function answerText(question, lang) {
    if (!question) return lang === 'zh' ? '跟着例题步骤得到答案。' : 'Follow the example steps to reach the answer.';
    const type = question.type || 'single_choice';
    if (['single_choice', 'mc', 'meaning', 'synonym', 'grammar', 'reading'].includes(type) && Array.isArray(question.options)) {
      return localize(question.options[Number(question.answer)], lang);
    }
    if (type === 'boolean') return question.answer ? (lang === 'zh' ? '正确' : 'True') : (lang === 'zh' ? '错误' : 'False');
    if (type === 'ordering' && Array.isArray(question.items) && Array.isArray(question.answer)) {
      return question.answer.map(index => localize(question.items[index], lang)).join(' → ');
    }
    const answer = question.answer !== undefined ? question.answer : Array.isArray(question.answers) ? question.answers[0] : '';
    return Array.isArray(answer) ? answer.join('、') : localize(answer, lang);
  }

  function build(lesson, lang = 'zh', subject = 'math') {
    if (!lesson) return null;
    const knowledgeLesson = global.KnowledgeLessonLibraryV1?.resolve(subject, lesson, lang);
    if (knowledgeLesson) {
      return {
        authored: true,
        source: knowledgeLesson.source,
        title: knowledgeLesson.title || localize(lesson.title, lang),
        goal: knowledgeLesson.when,
        durationMinutes: knowledgeLesson.durationMinutes,
        definition: knowledgeLesson.definition,
        core: knowledgeLesson.core,
        when: knowledgeLesson.when,
        visual: knowledgeLesson.visual,
        steps: knowledgeLesson.steps,
        examplePrompt: knowledgeLesson.example.prompt,
        exampleSteps: knowledgeLesson.example.steps,
        exampleAnswer: knowledgeLesson.example.answer,
        exampleQuestionId: knowledgeLesson.example.questionId,
        takeaway: knowledgeLesson.core,
        commonMistake: knowledgeLesson.commonMistake
      };
    }

    const title = localize(lesson.title, lang) || (lang === 'zh' ? '知识点' : 'Knowledge point');
    const representative = (lesson.questions || [])[0] || null;
    const hints = Array.isArray(lesson.hints) ? lesson.hints.map(hint => localize(hint.text || hint, lang)).filter(Boolean) : [];
    const objectives = Array.isArray(lesson.objectives) ? lesson.objectives.map(item => localize(item, lang)).filter(Boolean) : [];
    const concept = localize(lesson.description, lang) || (lang === 'zh' ? `这节课学习“${title}”的基本方法。` : `This lesson introduces the core method for “${title}.”`);
    const defaultSteps = lang === 'zh'
      ? [`先读清题目，找出它在考查“${title}”的哪一部分。`, '观察已知信息和问题之间的关系，再选择对应的方法。', '完成后把结果放回题目检查一次。']
      : [`Read carefully and identify which part of “${title}” is being tested.`, 'Connect the given information to the question and choose the matching method.', 'Put the result back into the question and check it.'];
    const explanation = localize(representative?.explanation, lang);
    return {
      authored: false,
      title,
      goal: localize(lesson.learningGoal, lang) || objectives[0] || concept,
      durationMinutes: 2,
      definition: concept,
      core: objectives[0] || concept,
      when: lang === 'zh' ? `当题目考查“${title}”时使用。` : `Use this when the question tests “${title}.”`,
      visual: 'evidence',
      steps: hints.length >= 2 ? hints.slice(0, 3) : defaultSteps,
      examplePrompt: localize(representative?.question, lang) || (lang === 'zh' ? `用刚才的方法完成一道“${title}”例题。` : `Use the method to complete an example about “${title}.”`),
      exampleSteps: explanation ? [explanation] : [defaultSteps[1], defaultSteps[2]],
      exampleAnswer: answerText(representative, lang),
      takeaway: objectives[0] || (lang === 'zh' ? '先判断知识点和已知信息，再按步骤完成并检查。' : 'Identify the concept and given information, then solve step by step and check.'),
      commonMistake: localize(lesson.commonMistakes?.[0], lang) || (lang === 'zh' ? '不要只看数字或选项就猜答案，要先判断题目真正问什么。' : 'Do not guess from the numbers or options; identify what the question asks first.')
    };
  }

  global.LessonDemoV3 = Object.freeze({ build, answerText });
})(globalThis);
