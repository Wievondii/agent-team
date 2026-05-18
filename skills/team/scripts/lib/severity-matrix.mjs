// agent-team/scripts/lib/severity-matrix.mjs
// Bug 严重度推导：impact × frequency 二维矩阵。
const matrix = {
  data_loss_or_crash: {
    always: 'critical',
    intermittent: 'critical',
    rare: 'high',
  },
  feature_unusable: {
    always: 'critical',
    intermittent: 'high',
    rare: 'medium',
  },
  feature_partially_unusable: {
    always: 'high',
    intermittent: 'medium',
    rare: 'low',
  },
  poor_ux: {
    always: 'medium',
    intermittent: 'low',
    rare: 'low',
  },
  cosmetic: {
    always: 'low',
    intermittent: 'cosmetic',
    rare: 'cosmetic',
  },
};

export function deriveSeverity(impact, frequency) {
  return matrix[impact]?.[frequency] ?? 'medium';
}

export function getMatrix() {
  return matrix;
}
