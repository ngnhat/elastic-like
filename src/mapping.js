/**
 * Created by ngnhat on Mon July 01 2019
 */
const { Map, fromJS } = require('immutable');
const { standardTokenizer, asciiFoldingTokenizer } = require('tokenizers');

const initMapping = (_mapping = {}) => {
  const mapping = fromJS(_mapping);

  return mapping.map((fieldMapping, field) => {
    if (field.includes('.')) {
      throw new Error(`[mapper_parsing_exception]: ${field}`);
    }

    if (fieldMapping.has('properties')) {
      if (fieldMapping.has('analyzer') || fieldMapping.has('search_analyzer')) {
        throw new Error(`[mapper_parsing_exception]: ${field}`);
      }

      return fieldMapping
        .update('properties', Map(), properties => initMapping(properties));
    }

    return fieldMapping.update('type', (value = 'text') => value)
      .update('analyzer', (value = 'standard') => value)
      .update('search_analyzer', (value = fieldMapping.get('analyzer', 'standard')) => value)
      .update('fields', Map(), fields => initMapping(fields));
  });
};

const analyzerMapping = {
  standard: standardTokenizer,
  asciifolding: asciiFoldingTokenizer,
};

const analysis = (analyzerName = 'standard', string = '') => {
  const analyzer = analyzerMapping[analyzerName] || standardTokenizer;
  return analyzer(`${string}`);
};

module.exports = {
  analysis,
  initMapping,
};
