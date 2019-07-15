/**
 * Created by ngnhat on Mon July 15 2019
 */
const { Map, fromJS, List } = require('immutable');
const { asciiFolding, nGramTokenizerCreater, edgeNGramTokenizerCreater } = require('tokenizers');

const analyzerFilter = (str = '', filters = []) => {
  if (!(filters instanceof Array)) {
    throw new Error('');
  }

  return filters.reduce((accStr, filterName) => {
    const filterFunc = {
      asciifolding: asciiFolding,
    }[filterName];

    return filterFunc ? filterFunc(accStr) : accStr;
  }, str);
};

const analyzerStore = (analysisConfig = {}) => {
  const config = fromJS(analysisConfig);

  return config.get('analyzer').reduce((acc, analyzerConfig, analyzerName) => {
    const tokenizerName = analyzerConfig.get('tokenizer', 'standard');
    const analyzerFilters = analyzerConfig.get('filter', List()).toJS();

    const tokenizer = config.getIn(['tokenizer', tokenizerName]);

    if (!tokenizer) {
      throw new Error(`the tokenizer ${tokenizerName} is not exists`);
    }

    const minGram = tokenizer.get('min_gram');
    const maxGram = tokenizer.get('max_gram');
    const tokenizerType = tokenizer.get('type');
    const tokenChars = tokenizer.get('token_chars');

    if (!minGram || !maxGram || !tokenChars) {
      throw new Error(`the tokenizer ${tokenizerName} is invalid`);
    }

    const tokenizerCreater = {
      ngram: nGramTokenizerCreater,
      edge_ngram: edgeNGramTokenizerCreater,
    }[tokenizerType];

    if (!tokenizerCreater) {
      throw new Error(`the tokenizer type ${tokenizerType} is not supported`);
    }

    const tokenizerFunc = tokenizerCreater({
      min: minGram,
      max: maxGram,
      tokenChars: tokenChars.toJS(),
    });

    const analyzerFunction = str => tokenizerFunc(analyzerFilter(str, analyzerFilters));

    return acc.set(analyzerName, analyzerFunction);
  }, Map());
};

module.exports = analyzerStore;
