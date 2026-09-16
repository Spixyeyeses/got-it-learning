(function initializeKnowledgeLessonLibraryV1(global) {
  const ENGLISH = {
    'vocabulary-in-context': ['语境词义', '不孤立背单词，而是根据所在短语、句子和上下文判断它在此处的准确含义。', '词义 = 常见含义 + 本句搭配 + 上下文主题；三者冲突时，以当前语境为准。', '题目询问某个词或短语“在文中是什么意思”时。', ['先读包含目标词的完整句子。', '找修饰词、搭配和前后句提供的线索。', '把候选含义放回原句，选语义自然且符合全文的一项。'], '只凭见过的第一个中文释义作答。'],
    'synonyms-in-context': ['语境近义词', '找出在当前句子中可以替换目标词、且不改变主要意思的表达。', '近义不等于任何场合都能互换，还要匹配词性、语气、搭配和上下文。', '题目要求选择 closest meaning、synonym 或替换表达时。', ['判断目标词在句中的词性。', '用上下文确定它此处的含义和语气。', '逐个代回候选词，排除意思或语法不合的项。'], '只看字典释义相近，却忽略词性和固定搭配。'],
    'subject-verb agreement': ['主谓一致', '谓语动词的单复数要与真正的主语一致。', '一般现在时中，第三人称单数主语用动词第三人称单数形式；复数主语用原形。', '句子主语和谓语之间隔着修饰语，或需要选择动词形式时。', ['先找到句子的真正主语。', '暂时划掉介词短语和插入语。', '判断主语单复数，再选择谓语形式。'], '让离谓语最近的名词误导判断。'],
    'there-be': ['There be 句型', 'There be 表示“某处存在某人或某物”。', 'be 动词通常与后面紧邻的第一个主语保持数的一致：There is a book；There are two books。', '描述存在、地点里有什么，或选择 is/are/was/were 时。', ['找出be后第一个名词。', '判断它的单复数和时态。', '选择对应be形式，再检查地点或时间信息。'], '把there误当成真正主语。'],
    'simple past': ['一般过去时', '一般过去时表示在过去已经发生并结束的动作或状态。', '规则动词加-ed；不规则动词使用过去式；常与 yesterday、last、ago 等过去时间线索连用。', '叙述已结束的经历、事件或过去状态时。', ['寻找过去时间线索。', '确认动作已经结束。', '把谓语变为正确过去式，并检查不规则变化。'], '句中已有did时，后面的实义动词仍误用过去式。'],
    'comparative': ['比较级', '比较级用于比较两个人或事物在某一方面的差异。', '短形容词常加-er，长形容词常用more；通常与than搭配。', '出现than，或题目明确比较两者时。', ['确认比较的是两个对象。', '判断形容词的比较级形式。', '检查than前后比较对象是否同类。'], '同时使用more和-er，形成重复比较。'],
    'modal verb': ['情态动词', '情态动词表达能力、许可、可能、义务或建议。', 'can、may、must、should 等后接动词原形，本身不随主语人称变化。', '句子要表达“能、可以、可能、必须、应该”时。', ['判断语气是能力、许可、可能还是义务。', '选择强弱合适的情态动词。', '确认后面的动词使用原形。'], '在情态动词后加to或把动词变为第三人称单数。'],
    'plural agreement': ['复数一致', '复数主语要求与之匹配的复数谓语、代词和限定形式。', '复数主语在一般现在时通常接动词原形；be用are/were。', '主语明确为多个对象，题目考查are/is或动词形式时。', ['找主语中心词。', '确认它是否为复数。', '让谓语和相关代词保持一致。'], '被主语前后的单数名词干扰。'],
    'reading-comprehension': ['阅读理解', '阅读理解要求答案有文本证据，而不是只凭常识猜测。', '答案应同时满足问题要求与原文信息；合理推断也必须能指出依据。', '询问事实、原因、主旨、推断或作者态度时。', ['圈出问题关键词。', '回原文定位同义表达和相关句。', '用证据核对每个选项，排除夸大或无依据内容。'], '选择现实中可能正确、但文中没有支持的选项。'],
    'past perfect': ['过去完成时', '过去完成时表示在另一个过去动作之前已经完成的动作。', '结构为 had + 过去分词，用来标明“过去的过去”。', '一个句子含两个过去事件，需要说明先后顺序时。', ['找出两个过去事件。', '判断哪一个先发生。', '较早的事件用had + 过去分词。'], '只要看见过去时间就使用过去完成时。'],
    'first conditional': ['第一条件句', '第一条件句描述未来真实可能发生的条件及其结果。', 'If + 一般现在时，主句用 will/can/may + 动词原形。', '讨论“如果某事发生，将会怎样”的现实可能时。', ['判断条件是否真实可能。', 'if从句使用一般现在时。', '主句使用合适的将来或情态表达。'], '在if从句中直接使用will。'],
    'passive voice': ['被动语态', '被动语态强调动作承受者或动作本身。', '结构为 be + 过去分词；be负责时态和数，过去分词表示动作。', '不知道执行者、执行者不重要，或需突出结果和对象时。', ['找出动作和承受动作的对象。', '按时态选择be形式。', '使用正确过去分词，必要时用by引出执行者。'], '只写过去分词而漏掉be动词。'],
    'agreement': ['一致关系', '句中有关联的主语、谓语、代词和数量表达要在人称与数上协调。', '先找中心成分，再让依赖它的形式保持一致。', '复杂主语、代词指代或数量结构中选择正确形式时。', ['确定控制一致关系的中心词。', '排除插入和修饰成分。', '检查谓语、代词及相关限定词。'], '机械地与最近的词保持一致。'],
    'reported question': ['间接疑问句', '间接疑问句把一个问题嵌入陈述句中。', '使用陈述语序：疑问词 + 主语 + 谓语；不再使用助动词倒装。', '句子含 asked、wondered、wanted to know 等“询问”表达时。', ['保留合适的疑问词。', '把问句语序还原为主语在前。', '根据主句时间调整时态和指代。'], '仍保留直接问句的倒装语序。'],
    'relative clause': ['定语从句', '定语从句放在名词后，补充说明这个人或事物。', 'who指人，which指物，that可指人或物；关系词在从句中承担成分。', '需要把两个句子连接起来修饰同一个名词时。', ['找到被修饰的先行词。', '判断先行词是人还是物。', '确定从句缺少主语、宾语或所属关系，再选关系词。'], '关系词已经作主语，却在从句中又重复一个代词。'],
    'third conditional': ['第三条件句', '第三条件句讨论与过去事实相反的假设及其结果。', 'If + had + 过去分词，主句 would/could/might have + 过去分词。', '表达“过去如果……本来就会……”的遗憾或反事实推测时。', ['确认条件发生在过去且事实相反。', 'if从句用过去完成时。', '主句用would/could/might have + 过去分词。'], '把它和现实可能的第一条件句混用。'],
    'subjunctive': ['虚拟语气', '虚拟语气表达建议、要求、必要性或非事实情况。', '在suggest、demand、essential等后的that从句中常用动词原形，be保持be。', '出现建议、命令、要求、必要性，且题目考查从句动词形式时。', ['识别触发虚拟语气的词。', '找到that从句。', '使用动词原形，不随主语变化。'], '按普通主谓一致把动词加-s。'],
    'inversion': ['倒装', '倒装把助动词、情态动词或be移到主语前，以满足特定结构或加强语气。', '否定或限制成分置于句首时，主句常部分倒装。', '句首出现never、rarely、only等触发词时。', ['识别句首触发成分。', '判断原句时态和谓语。', '补出合适助动词并放在主语前，实义动词用原形。'], '只把实义动词直接移到主语前。'],
    'perfect infinitive': ['完成不定式', '完成不定式表示不定式动作早于主句谓语所表示的时间。', '结构为 to have + 过去分词。', '推断、声称或评价一个更早已经发生的动作时。', ['比较两个动作的时间。', '确认不定式动作更早。', '使用to have + 过去分词。'], '漏掉have，变成普通不定式。'],
    'nominal clause': ['名词性从句', '名词性从句在句中整体充当主语、宾语、表语或同位语。', '先把整个从句看作一个名词单位，再判断主句结构和谓语一致。', 'what、whether、that等引导的一整段内容作句子成分时。', ['划出从句边界。', '判断它在主句中承担什么成分。', '检查连接词、语序和主句谓语。'], '把从句中的名词误当成主句主语。'],
    'participle clause': ['分词从句', '分词结构用现在分词或过去分词压缩从句，补充时间、原因、条件或状态。', '现在分词常表主动，过去分词常表被动或完成；其逻辑主语通常与主句主语一致。', '两个分句主语相同，需要简洁表达附加信息时。', ['找分词动作的逻辑主语。', '判断主动还是被动。', '选择-ing或过去分词，并检查与主句主语一致。'], '形成“悬垂分词”，即分词动作找不到正确主语。'],
    'inverted conditional': ['倒装条件句', '倒装条件句省略if，把had、were或should移到主语前。', 'Had I known = If I had known；Were it... = If it were...；Should you... = If you should...。', '正式语体中需要表达条件而省略if时。', ['识别原本的条件句类型。', '省略if。', '把had、were或should移到主语前，主句结构保持匹配。'], '省略if后却没有发生倒装。'],
    'negative inversion': ['否定倒装', '否定意义的副词或短语置于句首时，主句使用部分倒装。', 'Never/Rarely/Not until/Under no circumstances + 助动词 + 主语 + 动词。', '否定或限制表达被提前到句首以加强语气时。', ['圈出句首否定成分。', '根据原时态选助动词。', '助动词置于主语前，实义动词用原形。'], 'Not until引导的从句也错误倒装；真正倒装的是主句。'],
    'complex agreement': ['复杂主谓一致', '主语很长时，谓语仍由主语中心词决定，而不是由邻近名词决定。', '介词短语、同位语、定语从句通常不改变中心词的数。', '主语后带of短语、从句或多层修饰时。', ['找到完整主语边界。', '删去修饰语，留下中心词。', '按中心词单复数选择谓语。'], '把of后的复数名词当成主语。'],
    'irrealis mood': ['非现实语气', '非现实语气表达与现在事实相反、可能性很低或纯假设的情况。', '正式英语中，be常统一用were：If I were...；其他动词常用过去式表达现在非事实。', 'wish、if only或与现在事实相反的if从句中。', ['确认说的不是过去时间，而是现在非事实。', '从句用过去式，be优先用were。', '主句常用would/could + 动词原形。'], '看到过去式就误判成过去发生的真实事件。'],
    'inversion after only': ['Only 置首倒装', 'Only加状语置于句首时，主句部分倒装。', 'Only then/after/by/when... + 助动词 + 主语 + 动词；only修饰主语时通常不倒装。', '句首only限制时间、方式或条件时。', ['判断only修饰主语还是状语。', '若修饰状语，确定主句时态。', '把助动词移到主语前。'], '只要看到only就倒装，忽略它是否修饰主语。'],
    'parenthetical agreement': ['插入语中的一致判断', '插入语不决定主句谓语形式，主谓一致仍看插入语外的中心主语。', 'as well as、together with、including等附加成分通常不改变主语的数。', '主语与谓语之间插入补充说明时。', ['用逗号或结构识别插入语。', '暂时删去插入内容。', '按剩下的中心主语选择谓语。'], '让插入语中的复数名词控制谓语。'],
    'concessive clause': ['让步从句', '让步从句表示“尽管某条件成立，主句结果仍然发生”。', '常由although、though、even though、while引导；不能再与but重复连接。', '表达预期与实际结果之间的反差时。', ['找出让步事实和主要结论。', '选择语气合适的连接词。', '检查主从句逻辑，并避免although与but连用。'], '把让步关系误写成因果关系。'],
    'counterfactual conditional': ['反事实条件句', '反事实条件句讨论与真实情况相反的条件和推想结果。', '现在反事实常用过去式 + would；过去反事实常用had done + would have done。', '题目明确事实没有发生，却问“如果当时/现在不同会怎样”时。', ['先确定反事实发生在现在还是过去。', '选择对应的if从句时态。', '让主句结果结构与时间匹配。'], '条件从句和结果从句混用不同时间层次。'],
    'degree inversion': ['程度倒装', '某些表示程度的成分置于句首时，为强调而倒装主句。', 'So + 形容词/副词 + 助动词 + 主语 + that... 是常见结构。', '强调程度并引出结果，或题目出现so/such前置时。', ['识别被强调的程度成分。', '保留so/such与其中心词的搭配。', '把助动词或be移到主语前，再接结果从句。'], '混淆so + 形容词与such + 名词短语。'],
    'parallel passive construction': ['并列被动结构', '并列的动作如果共同作用于同一承受者，应保持结构和语态平行。', 'be + 过去分词 and 过去分词；共享助动词时，各并列动词都用过去分词。', '同一主语连续承受两个或多个动作时。', ['找出并列连接词。', '确认各动作都与同一主语构成被动。', '让每个并列动词使用过去分词，并保持时态一致。'], '第一个动词用过去分词，后一个却误用原形或过去式。'],
    'embedded interrogative': ['嵌入式疑问句', '嵌入式疑问句把疑问内容放进更大的句子，内部使用陈述语序。', '疑问词/whether + 主语 + 谓语；主句才决定整体是否使用问号。', '出现know、ask、determine、explain等后接疑问信息时。', ['确定嵌入部分从哪里开始。', '选择合适疑问词或whether。', '恢复主语在谓语前的陈述语序。'], '把do/does/did保留在嵌入问句中。'],
    'restrictive-adverb inversion': ['限制副词倒装', '表示“几乎不、仅在某条件下”的限制副词前置时，主句部分倒装。', 'Hardly/Scarcely/Barely/Only + 助动词 + 主语 + 动词。', '正式表达中将限制条件放到句首强调时。', ['识别限制副词及其作用范围。', '判断需要倒装的主句。', '按时态补助动词并使用动词原形。'], '倒装了从句，却没有倒装真正受限制的主句。']
  };

  const SCIENCE_VISUALS = [
    [/电路|电场|电势|电磁|欧姆|磁极|电池|交流/, 'circuit'],
    [/细胞|DNA|基因|遗传|免疫|蛋白质|PCR|酶|分裂/, 'cell'],
    [/光|影子|月相|月食|恒星|轨道|引力/, 'light-rays'],
    [/力|运动|速度|动量|抛体|振动|波|机械|压强|浮力|摩擦|功与能|转动/, 'forces'],
    [/食物链|生态|种群|群落|碳循环|生命周期|栖息地|植物|传粉/, 'cycle'],
    [/水|天气|气候|地层|岩石|侵蚀|板块|土壤/, 'cycle'],
    [/反应|化学|酸碱|溶解|浓度|平衡|摩尔|元素|有机|热力学|吉布斯|熵/, 'particles'],
    [/图像|模型|统计|误差|证据|因果|伦理|重复|有效性/, 'evidence'],
  ];

  function localize(value, lang) {
    if (value && typeof value === 'object' && !Array.isArray(value)) return String(value[lang] ?? value.zh ?? value.en ?? '');
    return String(value ?? '');
  }

  function answerText(question, lang) {
    if (!question) return '';
    const type = question.type || 'single_choice';
    if (['single_choice', 'mc', 'meaning', 'synonym', 'grammar', 'reading'].includes(type) && Array.isArray(question.options)) {
      return localize(question.options[Number(question.answer)], lang);
    }
    if (type === 'boolean') return question.answer ? (lang === 'zh' ? '正确' : 'True') : (lang === 'zh' ? '错误' : 'False');
    if (type === 'ordering' && Array.isArray(question.items) && Array.isArray(question.answer)) return question.answer.map(index => localize(question.items[index], lang)).join(' → ');
    const answer = question.answer !== undefined ? question.answer : Array.isArray(question.answers) ? question.answers[0] : '';
    return Array.isArray(answer) ? answer.join('、') : localize(answer, lang);
  }

  function lessonQuestions(lesson) {
    return Array.isArray(lesson?.questions) ? lesson.questions : Array.isArray(lesson?.items) ? lesson.items : [];
  }

  function knowledgeKey(lesson, lang) {
    const first = lessonQuestions(lesson)[0];
    return localize(first?.knowledge, lang === 'en' ? 'en' : 'zh') || localize(lesson?.title, lang);
  }

  function workedExampleSteps(question, lang, steps, answer, context = {}) {
    const prompt = localize(question?.question, lang);
    const givenExplanation = localize(question?.explanation, lang);
    if (givenExplanation) return [givenExplanation];
    const zh = lang === 'zh';
    if (context.subject === 'math') {
      const numbers = (prompt.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
      if (context.knowledge === '勾股定理' && numbers.length >= 2) {
        const [a, b] = numbers;
        const squareSum = a * a + b * b;
        return [
          `题目明确是直角三角形，已知两条直角边 ${a} 和 ${b}，所求是斜边 c。`,
          `代入 a²+b²=c²：c=√(${a}²+${b}²)=√${squareSum}。`,
          `√${squareSum}=${answer}，并且 ${answer} 比两条直角边都长，结果合理。`
        ];
      }
      const expression = prompt.split(/[=＝]/)[0]?.trim();
      if (expression && /[+\-×÷*/²√]/.test(expression)) {
        return [steps[0], `${zh ? '把当前题目的数代入并计算' : 'Substitute the values from this item'}：${expression} = ${answer}。`, zh ? '把结果放回原关系检查，数量和单位都应符合题意。' : 'Check the result against the original relation and units.'];
      }
      return [steps[0], `${zh ? '按核心关系处理题目给出的已知量，本题得到' : 'Apply the core relation to the given values'}：${answer}。`, steps.at(-1)];
    }
    if (context.subject === 'english') {
      return [steps[0], zh ? `检查词义、词性、语序或主谓形式后，只有“${answer}”能同时符合句子结构和语境。` : `After checking meaning, word class, order, and agreement, “${answer}” is the option that fits both structure and context.`, steps.at(-1)];
    }
    if (context.subject === 'science') {
      return [steps[0], zh ? `把各选项与本知识点的核心证据比较，符合证据的是：“${answer}”。` : `Compare each option with the core evidence; the supported statement is: “${answer}”.`, zh ? '其余选项要么把条件说得过于绝对，要么没有给出可检验的科学解释。' : 'The other options are either too absolute or lack a testable scientific explanation.'];
    }
    return steps;
  }

  function existingExample(lesson, lang, steps, context = {}) {
    const question = lessonQuestions(lesson)[0] || null;
    const prompt = localize(question?.question, lang);
    const answer = answerText(question, lang);
    return {
      prompt: prompt || (lang === 'zh' ? '当前题库暂无可示范题。' : 'No existing item is available for this demonstration.'),
      steps: workedExampleSteps(question, lang, steps, answer, context),
      answer,
      questionId: question?.id || ''
    };
  }

  function mathLesson(lesson, lang) {
    const key = knowledgeKey(lesson, 'zh');
    const content = global.MathKnowledgeLessonsV1?.get(key);
    if (!content) return null;
    return {
      source: 'math-authored', title: localize(lesson.title, lang), durationMinutes: 3,
      definition: content.what, core: content.core, when: content.when,
      steps: content.steps, visual: content.visual, commonMistake: content.mistake,
      example: existingExample(lesson, lang, content.steps, { subject: 'math', knowledge: key })
    };
  }

  function englishLesson(lesson, lang) {
    const key = knowledgeKey(lesson, 'en');
    const content = ENGLISH[key];
    if (!content) return null;
    const [title, definition, core, when, steps, mistake] = content;
    return {
      source: 'english-authored', title: lang === 'zh' ? title : localize(lesson.title, lang), durationMinutes: 3,
      definition, core, when, steps, visual: 'sentence-structure', commonMistake: mistake,
      example: existingExample(lesson, lang, steps, { subject: 'english', knowledge: key })
    };
  }

  function scienceLesson(lesson, lang) {
    const key = knowledgeKey(lesson, lang === 'en' ? 'en' : 'zh');
    const zhKey = knowledgeKey(lesson, 'zh');
    const question = lessonQuestions(lesson)[0];
    if (!key || !question) return null;
    const core = answerText(question, lang);
    const visual = SCIENCE_VISUALS.find(([pattern]) => pattern.test(zhKey))?.[1] || 'evidence';
    const zh = lang === 'zh';
    const steps = zh
      ? [`先明确“${zhKey}”题目研究的对象、条件和发生的现象。`, `用核心规律核对题目陈述：${core}`, '最后检查结论有没有超出证据范围，排除“所有、一定、只由”等过度绝对的说法。']
      : [`Identify the object, conditions, and observation in the “${key}” question.`, `Check the statement against the core principle: ${core}`, 'Check that the conclusion does not go beyond the evidence; reject unsupported absolute claims.'];
    return {
      source: 'science-existing-bank', title: key, durationMinutes: 3,
      definition: zh ? `“${zhKey}”研究相关现象怎样发生、受哪些条件影响，以及我们能用什么证据解释它。` : `“${key}” studies how the phenomenon occurs, what conditions affect it, and what evidence can explain it.`,
      core,
      when: zh ? `当题目要求解释“${zhKey}”的现象、判断变量影响，或选择最符合科学证据的结论时。` : `Use it when explaining a “${key}” phenomenon, judging the effect of a variable, or selecting the claim best supported by evidence.`,
      steps, visual,
      commonMistake: zh ? '把“可能影响”说成“唯一原因”，或用没有对照和测量的数据作绝对结论。' : 'Treating a possible factor as the only cause, or making an absolute claim without controls and measurements.',
      example: existingExample(lesson, lang, steps, { subject: 'science', knowledge: zhKey })
    };
  }

  function authoredLesson(lesson, lang) {
    const authored = lesson?.demo;
    if (!authored) return null;
    const steps = (authored.steps || []).map(step => localize(step, lang));
    return {
      source: 'curriculum-authored', title: localize(lesson.title, lang), durationMinutes: Number(authored.durationMinutes) || 3,
      definition: localize(authored.concept, lang),
      core: localize(authored.takeaway, lang),
      when: localize(lesson.learningGoal, lang) || localize(lesson.description, lang),
      steps,
      visual: /分|平均/.test(localize(lesson.title, 'zh')) ? 'fraction' : /数轴|比较/.test(localize(lesson.title, 'zh')) ? 'number-line' : 'number-sense',
      commonMistake: localize(authored.commonMistake, lang),
      example: existingExample(lesson, lang, (authored.example?.steps || steps).map(step => localize(step, lang)), { subject: 'math', knowledge: knowledgeKey(lesson, 'zh') })
    };
  }

  function resolve(subject, lesson, lang = 'zh') {
    return authoredLesson(lesson, lang)
      || (subject === 'math' ? mathLesson(lesson, lang) : null)
      || (subject === 'english' ? englishLesson(lesson, lang) : null)
      || (subject === 'science' ? scienceLesson(lesson, lang) : null);
  }

  global.KnowledgeLessonLibraryV1 = Object.freeze({ resolve, answerText, englishCount: Object.keys(ENGLISH).length });
})(globalThis);
