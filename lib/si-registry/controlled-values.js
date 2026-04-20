import controlledVocabularies from '../../data/si-registry/controlled-vocabularies.json' with { type: 'json' };

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

export function getControlledVocabulary(field) {
  return hasOwn(controlledVocabularies, field) ? [...controlledVocabularies[field]] : [];
}

export function isControlledVocabularyValue(field, value) {
  return getControlledVocabulary(field).includes(value);
}

export function assertControlledVocabularyValue(field, value) {
  if (!isControlledVocabularyValue(field, value)) {
    throw new Error(`Invalid ${field}: ${value}`);
  }
}
