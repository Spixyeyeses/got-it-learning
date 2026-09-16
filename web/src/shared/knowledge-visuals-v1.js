(function initializeKnowledgeVisualsV1(global) {
  function esc(value) {
    return String(value ?? '').replace(/[&<>"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character]);
  }

  function numberLine() {
    return `<div class="kv-number-line"><span class="kv-arrow left">‹</span>${[-2, -1, 0, 1, 2, 3].map(value => `<i><b></b><em>${value}</em></i>`).join('')}<span class="kv-arrow right">›</span></div>`;
  }

  function pythagorean() {
    return `<div class="kv-pythagorean"><div class="kv-right-triangle"><i class="kv-leg-a"></i><i class="kv-leg-b"></i><i class="kv-hypotenuse"></i><span class="kv-right-angle"></span><b class="kv-label-a">a · 直角边</b><b class="kv-label-b">b · 直角边</b><b class="kv-label-c">c · 斜边</b></div><div class="kv-formula"><small>只用于直角三角形</small><strong>a² + b² = c²</strong><span>斜边 c 在直角的正对面，也是最长边</span></div></div>`;
  }

  function fraction() {
    return `<div class="kv-fraction"><div>${[0, 1, 2, 3].map(index => `<i class="${index === 0 ? 'filled' : ''}"></i>`).join('')}</div><strong><span>1</span><span>4</span></strong><p>整体被<strong>平均</strong>分成 4 份，取其中 1 份</p></div>`;
  }

  function geometry(type) {
    if (type === 'circle') return `<div class="kv-circle"><i></i><span>r · 半径</span><b>圆心</b></div>`;
    if (['triangle', 'right-triangle', 'similar-triangles'].includes(type)) return `<div class="kv-triangle"><i></i><span class="base">底</span><span class="height">高 ⟂ 底</span>${type === 'similar-triangles' ? '<b>对应角相等<br>对应边成比例</b>' : ''}</div>`;
    if (type === 'parallelogram') return `<div class="kv-parallelogram"><i></i><span>底</span><b>高 ⟂ 底</b></div>`;
    if (['box', 'prism'].includes(type)) return `<div class="kv-box"><i></i><i></i><i></i><span>底面积 × 高</span></div>`;
    return `<div class="kv-rectangle"><div><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><span>长</span><b>宽</b></div>`;
  }

  function axes(type) {
    return `<div class="kv-axes ${esc(type)}"><i class="x-axis"></i><i class="y-axis"></i><span class="axis-x">x</span><span class="axis-y">y</span><div class="kv-plot">${type === 'parabola' ? '<i class="curve left"></i><i class="curve right"></i><b></b>' : '<i class="line"></i><b></b><b></b>'}</div></div>`;
  }

  function clock() {
    return `<div class="kv-clock"><span>12</span><span>3</span><span>6</span><span>9</span><i class="hour"></i><i class="minute"></i><b></b></div>`;
  }

  function science(type) {
    if (type === 'circuit') return `<div class="kv-circuit"><i class="wire top"></i><i class="wire bottom"></i><i class="wire left"></i><i class="wire right"></i><span class="battery">＋ −</span><span class="lamp">灯</span><b>闭合通路 → 有持续电流</b></div>`;
    if (type === 'cell') return `<div class="kv-cell"><i></i><span class="nucleus">细胞核</span><span class="membrane">细胞膜</span><b>结构与功能相联系</b></div>`;
    if (type === 'particles') return `<div class="kv-particles">${Array.from({ length: 16 }, (_, index) => `<i style="--x:${(index * 37) % 92}%;--y:${(index * 53) % 78}%"></i>`).join('')}<span>微粒运动 · 碰撞 · 重新组合</span></div>`;
    if (type === 'light-rays') return `<div class="kv-light"><span>光源</span><i></i><i></i><i></i><b>传播方向 / 证据</b></div>`;
    if (type === 'forces') return `<div class="kv-forces"><span>物体</span><i class="force-right">力 F →</i><i class="force-down">↓ 重力</i><b>先选研究对象，再标方向</b></div>`;
    if (type === 'cycle') return `<div class="kv-cycle"><span>条件</span><span>过程</span><span>结果</span><i>→</i><i>→</i><b>↺</b></div>`;
    return `<div class="kv-evidence"><span>观察</span><i>→</i><span>比较</span><i>→</i><span>证据</span><i>→</i><strong>结论</strong><b>结论不能超出证据范围</b></div>`;
  }

  function sentence() {
    return `<div class="kv-sentence"><span>先找结构</span><div><i>主语</i><b>谓语</b><em>补充信息 / 语境</em></div><p>词形和语序都要服务于句子真正表达的意思</p></div>`;
  }

  function conceptual(type) {
    if (type === 'number-line') return numberLine();
    if (type === 'clock') return clock();
    if (type === 'fraction' || type === 'percent' || type === 'ratio') return fraction();
    if (['rectangle', 'square', 'area-model', 'geometry', 'parallelogram', 'triangle', 'right-triangle', 'similar-triangles', 'circle', 'box', 'prism'].includes(type)) return geometry(type);
    if (['axes', 'parabola', 'tangent', 'log-curve', 'exp-curve', 'limit-curve', 'integral-area'].includes(type)) return axes(type === 'parabola' ? 'parabola' : 'line');
    if (type === 'pythagorean') return pythagorean();
    if (type === 'sentence-structure') return sentence();
    if (['circuit', 'cell', 'particles', 'light-rays', 'forces', 'cycle', 'evidence'].includes(type)) return science(type);
    if (['place-value', 'array', 'bar', 'sequence', 'division', 'equation', 'chart', 'probability', 'motion', 'vector', 'vector-3d', 'matrix', 'venn', 'combinatorics', 'pascal', 'unit-circle', 'complex-plane', 'binomial', 'probability-tree', 'optimization', 'slope-field', 'number-sense', 'ruler', 'money', 'angle'].includes(type)) {
      return `<div class="kv-concept-map"><span>已知信息</span><i>→</i><strong>核心关系</strong><i>→</i><span>所求结果</span><b>每一步都能说清“为什么”</b></div>`;
    }
    return science('evidence');
  }

  function render(type, title, core) {
    return `<figure class="knowledge-visual-v1" data-visual="${esc(type || 'evidence')}"><figcaption><span>理解图</span><strong>${esc(title)}</strong></figcaption>${conceptual(type)}<p>${esc(core)}</p></figure>`;
  }

  global.KnowledgeVisualsV1 = Object.freeze({ render });
})(globalThis);
