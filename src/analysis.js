/**
 * Created by ngnhat on Sat May 25 2019
 */
const { fromJS, List, Map } = require('immutable');
const {
  asciiFolding,
  standardTokenizer,
  asciiFoldingTokenizer,
  nGramTokenizerCreater,
  edgeNGramTokenizerCreater,
} = require('tokenizes');

const initialAnalysisValue = Map()
  .set('standard', standardTokenizer)
  .set('asciifolding', asciiFoldingTokenizer);

const analyzerFilter = (str = '', filters = []) => {
  if (!(filters instanceof Array)) {
    throw new Error('[Filter Parsing Exception]');
  }

  return filters.reduce((accStr, filterName) => {
    const filterFunc = {
      asciifolding: asciiFolding,
    }[filterName];

    return filterFunc ? filterFunc(accStr) : accStr;
  }, str);
};

const analysisParsing = (_analysisConfig = {}) => {
  const analysisConfig = fromJS(_analysisConfig);
  const analyzerConfig = analysisConfig.get('analyzer', Map());
  const tokenizerConfig = analysisConfig.get('tokenizer', Map());

  return analyzerConfig.reduce((analysis, config, analyzerName) => {
    const tokenizerName = config.get('tokenizer', 'standard');
    const tokenizer = tokenizerConfig.get(tokenizerName);

    if (!tokenizer) {
      throw new Error(`[Analysis Parsing Exception] the tokenizer ${tokenizerName} is not exists`);
    }

    const minGram = tokenizer.get('min_gram');
    const maxGram = tokenizer.get('max_gram');
    const tokenizerType = tokenizer.get('type');
    const tokenChars = tokenizer.get('token_chars', List());
    const analyzerFilters = config.get('filter', List()).toJS();

    if (!minGram || !maxGram) {
      throw new Error(`[Analysis Parsing Exception] the tokenizer ${tokenizerName} is invalid`);
    }

    const tokenizerCreater = {
      ngram: nGramTokenizerCreater,
      edge_ngram: edgeNGramTokenizerCreater,
    }[tokenizerType];

    if (!tokenizerCreater) {
      throw new Error(`[Analysis Parsing Exception] the tokenizer type ${tokenizerType} is not supported`);
    }

    const tokenizerFunc = tokenizerCreater({
      min: minGram,
      max: maxGram,
      tokenChars: tokenChars.toJS(),
    });

    const analyzerFunction = (str) => tokenizerFunc(analyzerFilter(str, analyzerFilters));

    return analysis.set(analyzerName, analyzerFunction);
  }, initialAnalysisValue);
};

class Analysis {
  #analysis;

  constructor(config = {}) {
    this.#analysis = analysisParsing(config);
  }

  getTerms = (analyzerName = 'standard', str = '') => {
    const analyzer = this.#analysis.get(analyzerName);
    return analyzer ? analyzer(str) : str;
  }

  getCountedTerms = (analyzerName = 'standard', str = '') => {
    const terms = this.getTerms(analyzerName, str);
    return terms.reduce((acc, term) => acc.update(term, 0, (count) => count + 1), Map());
  }

  calcDocTerms = (mapping, document, originalField) => (
    mapping.reduce((docTermsAcc, fieldMapping, field) => {
      const { [originalField || field]: value = '' } = document;
      const properties = fieldMapping.get('properties', Map());

      if (!properties.isEmpty() && value instanceof Object) {
        const childrenDocuments = List([].concat(value));
        const propertiesMapping = fieldMapping.get('properties', Map());
        const type = fieldMapping.get('type');

        if (type === 'nested') {
          return childrenDocuments.reduce((newFieldAcc, childrenDocument) => {
            const nestedTerm = this.calcDocTerms(propertiesMapping, childrenDocument);

            return propertiesMapping.reduce((acc, _, childrenField) => (
              acc.update(`${field}.${childrenField}`, List(), (list) => (
                list.push(nestedTerm.get(childrenField, Map()))
              ))
            ), newFieldAcc);
          }, docTermsAcc);
        }

        return childrenDocuments.reduce((newFieldAcc, childrenDocument) => (
          this.calcDocTerms(propertiesMapping, childrenDocument)
            .mapKeys((childrenField) => `${field}.${childrenField}`)
            .reduce((fieldAcc, termCount, childrenField) => (
              fieldAcc.update(childrenField, Map(), (oldTermCount) => (
                termCount.reduce((termAcc, count, term) => (
                  termAcc.update(term, 0, (oldCount) => oldCount + count)
                ), oldTermCount)
              ))
            ), newFieldAcc)
        ), docTermsAcc);
      }

      if (typeof value !== 'object') {
        const fields = fieldMapping.get('fields', Map());
        const analyzerName = fieldMapping.get('analyzer', 'standard');
        const terms = this.getCountedTerms(analyzerName, value);

        const fieldTermCount = docTermsAcc.update(field, Map(), (oldTerms) => (
          terms.reduce((termsAcc, count, term) => (
            termsAcc.update(term, 0, (oldCount) => oldCount + count)
          ), oldTerms)
        ));

        if (fields.isEmpty()) {
          return fieldTermCount;
        }

        return this.calcDocTerms(fields, document, field)
          .mapKeys((key) => `${field}.${key}`)
          .reduce((fieldAcc, termCount, childrenField) => (
            fieldAcc.update(childrenField, Map(), (oldTermCount) => (
              termCount.reduce((termAcc, count, term) => (
                termAcc.update(term, 0, (oldCount) => oldCount + count)
              ), oldTermCount)
            ))
          ), fieldTermCount);
      }

      return docTermsAcc;
    }, Map())
  );
}

module.exports = Analysis;
