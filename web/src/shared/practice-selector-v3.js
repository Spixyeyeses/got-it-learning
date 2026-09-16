(function initializePracticeSelectorV3(global) {
  const ASSESSMENT_ROLES = ['recognition', 'application', 'misconception', 'transfer'];

  function randomOrder(values, random) {
    return values
      .map((value, index) => ({ value, index, weight: random() }))
      .sort((a, b) => a.weight - b.weight || a.index - b.index)
      .map(entry => entry.value);
  }

  function itemId(item, index = 0) {
    return String(item?.id || `anonymous-${index}`);
  }

  function variantGroup(item, index = 0) {
    return String(item?.variantGroup || itemId(item, index));
  }

  function roleOf(item) {
    return ASSESSMENT_ROLES.includes(item?.assessmentRole) ? item.assessmentRole : 'recognition';
  }

  function typeOf(item) {
    return String(item?.type || 'single_choice');
  }

  function select(pool, count, options = {}) {
    const limit = Math.max(0, Math.floor(Number(count) || 0));
    if (!Array.isArray(pool) || !limit) return [];
    const random = typeof options.random === 'function' ? options.random : Math.random;
    const previous = options.previousIds instanceof Set ? options.previousIds : new Set(options.previousIds || []);
    const pinnedId = options.pinnedId ? String(options.pinnedId) : '';
    const unique = [];
    const ids = new Set();
    pool.forEach((item, index) => {
      const id = itemId(item, index);
      if (!ids.has(id)) {
        ids.add(id);
        unique.push({ item, id, group: variantGroup(item, index), role: roleOf(item), type: typeOf(item), fresh: !previous.has(id) });
      }
    });

    const chosen = [];
    const chosenIds = new Set();
    const groups = new Set();
    const roles = new Set();
    const types = new Set();
    const add = candidate => {
      if (!candidate || chosen.length >= limit || chosenIds.has(candidate.id) || groups.has(candidate.group)) return false;
      chosen.push(candidate);
      chosenIds.add(candidate.id);
      groups.add(candidate.group);
      roles.add(candidate.role);
      types.add(candidate.type);
      return true;
    };

    if (pinnedId) add(unique.find(candidate => candidate.id === pinnedId));

    const ordered = randomOrder(unique.filter(candidate => !chosenIds.has(candidate.id)), random)
      .sort((a, b) => Number(b.fresh) - Number(a.fresh));
    const available = predicate => ordered.find(candidate => !chosenIds.has(candidate.id) && !groups.has(candidate.group) && predicate(candidate));

    if (!roles.has('application')) add(available(candidate => candidate.role === 'application'));
    if (![...roles].some(role => role === 'misconception' || role === 'transfer')) {
      add(available(candidate => candidate.role === 'misconception')) || add(available(candidate => candidate.role === 'transfer'));
    }

    while (chosen.length < limit) {
      const newType = available(candidate => !types.has(candidate.type));
      if (!add(newType || available(() => true))) break;
    }

    return chosen.map(candidate => candidate.item);
  }

  function auditSelection(selection) {
    const items = Array.isArray(selection) ? selection : [];
    const ids = items.map(itemId);
    const groups = items.map(variantGroup);
    const roles = new Set(items.map(roleOf));
    return {
      count: items.length,
      uniqueIds: new Set(ids).size === ids.length,
      uniqueVariantGroups: new Set(groups).size === groups.length,
      typeCount: new Set(items.map(typeOf)).size,
      hasApplication: roles.has('application'),
      hasMisconceptionOrTransfer: roles.has('misconception') || roles.has('transfer')
    };
  }

  global.PracticeSelectorV3 = Object.freeze({ ASSESSMENT_ROLES: [...ASSESSMENT_ROLES], select, auditSelection });
})(globalThis);
