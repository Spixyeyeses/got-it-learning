(function configureLearningAssistant(global) {
  global.LEARNING_AI_CONFIG = {
    endpoint: '',
    mode: 'local-safe-fallback',
    maxHintCharacters: 600,
    allowedPurpose: 'age-appropriate-layered-hint',
    policy: {
      currentQuestionOnly: true,
      openChat: false,
      requestPersonalData: false,
      revealAnswerBeforeAttempt: false,
      retainStudentPrompt: false
    }
  };
})(window);
