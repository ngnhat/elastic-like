/**
 * Created by ngnhat on Sat May 25 2019
 */
const { fromJS, Map } = require('immutable');

const mappingParsing = (_mapping = {}) => {
  const mapping = fromJS(_mapping);

  return mapping.map((fieldMapping, field) => {
    if (field.includes('.')) {
      throw new Error(`[Mapping Parsing Exception]: ${field}`);
    }

    if (fieldMapping.has('properties')) {
      if (fieldMapping.has('analyzer') || fieldMapping.has('search_analyzer')) {
        throw new Error(`[Mapping Parsing Exception]: ${field}`);
      }

      return fieldMapping
        .update('properties', Map(), (properties) => mappingParsing(properties));
    }

    return fieldMapping.update('type', (value = 'text') => value)
      .update('analyzer', (value = 'standard') => value)
      .update('search_analyzer', (value = fieldMapping.get('analyzer', 'standard')) => value)
      .update('fields', Map(), (fields) => mappingParsing(fields));
  });
};

module.exports = mappingParsing;
