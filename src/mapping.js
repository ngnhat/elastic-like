/**
 * Created by ngnhat on Mon July 01 2019
 */
const { fromJS } = require('immutable');
const { standardTokenizer, asciiFoldingTokenizer } = require('tokenizers');

const initMapping = (_mapping = {}) => {
  const mapping = fromJS(_mapping);

  return mapping.map(fieldMapping => (
    fieldMapping.update('type', (value = 'text') => value)
      .update('analyzer', (value = 'standard') => value)
      .update('search_analyzer', (value = fieldMapping.get('analyzer', 'standard')) => value)
  ));
};

const analyzerMapping = {
  standard: standardTokenizer,
  asciifolding: asciiFoldingTokenizer,
};

const getAnalyzer = (analyzerName = 'standard') => (
  analyzerMapping[analyzerName] || standardTokenizer
);

module.exports = {
  initMapping,
  getAnalyzer,
};
