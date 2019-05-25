const { Map, Set } = require('immutable');
const { standardTokenizer, asciiFoldingTokenizer } = require('tokenizers');

const analyzerMapping = {
  standard: standardTokenizer,
  asciifolding: asciiFoldingTokenizer,
};

const getAnalyzer = (analyzerName = 'standard') => (
  analyzerMapping[analyzerName] || standardTokenizer
);

const B = 0.75;
const K1 = 1.2;

class Store {
  constructor(config = {}) {
    const {
      docKey = 'Id',
      mapping = {
        Code: { type: 'text', analyzer: 'standard' },
        Name: { type: 'text', analyzer: 'standard' },
      },
    } = config;
    const mappingFields = Object.keys(mapping);


    this.docKey = docKey;
    this.mapping = mapping;

    this.fieldCountIndex = new Map();
    this.fieldLengthIndex = new Map();

    this.documentIndex = new Map();
    this.docIdTokensIndex = mappingFields.reduce((acc, field) => (
      acc.set(field, new Map())
    ), new Map());
    this.tokenDocIdsIndex = mappingFields.reduce((acc, field) => (
      acc.set(field, new Map())
    ), new Map());
  }

  add(document = {}) {
    const { docKey, mapping, documentIndex, tokenDocIdsIndex } = this;
    const { [docKey]: id } = document;
    this.documentIndex = documentIndex.set(id, document);

    this.tokenDocIdsIndex = tokenDocIdsIndex.map((fieldValue, field) => {
      const { [field]: value = '' } = document;
      const { [field]: { analyzer: analyzerName = 'standard' } = {} } = mapping;
      const docTerms = getAnalyzer(analyzerName)(`${value}`);
      const termLength = docTerms.length;

      this.docIdTokensIndex = this.docIdTokensIndex.setIn([field, id], docTerms);
      this.fieldLengthIndex = this.fieldLengthIndex.update(field, 0, length => length + termLength);
      this.fieldCountIndex = this.fieldCountIndex.update(field, 0, count => (
        count + (termLength ? 1 : 0)
      ));

      return docTerms.reduce((acc, term) => (
        acc.update(term, new Set(), listIds => listIds.add(id))
      ), fieldValue);
    });
  }

  search(keyword = '') {
    const {
      mapping,
      documentIndex,
      fieldCountIndex,
      fieldLengthIndex,
      docIdTokensIndex,
      tokenDocIdsIndex,
    } = this;

    const documentIds = tokenDocIdsIndex.reduce((acc, fieldValue, field) => {
      const { [field]: { analyzer = 'standard' } = {} } = mapping;
      const docFieldCount = fieldCountIndex.get(field, 1);
      const docFieldLength = fieldLengthIndex.get(field, 0);
      const docTerms = getAnalyzer(analyzer)(`${keyword}`);

      const scoreDocs = docTerms.reduce((accum, term) => {
        const idsTerm = fieldValue.get(term, new Set());
        const docFieldFreq = idsTerm.count();
        const avgdl = docFieldLength / docFieldCount;
        const idf = Math.log(1 + (docFieldCount - docFieldFreq + 0.5) / (docFieldFreq + 0.5));

        const scores = idsTerm
          .filter((docId) => { // operator=and
            const tokens = docIdTokensIndex.getIn([field, docId]);
            return docTerms.every(docTerm => tokens.includes(docTerm));
          })
          .reduce((accDoc, docId) => {
            const tokens = docIdTokensIndex.getIn([field, docId]);
            const dl = tokens.length;

            const freq = tokens.filter(token => token === term).length;
            const score = idf * freq * (K1 + 1) / (freq + K1 * (1 - B + B * dl / avgdl));

            return accDoc.set(docId, score);
          }, new Map());

        return scores.reduce((accScore, score, docId) => (
          accScore.update(docId, 0, currentScore => currentScore + score)
        ), accum);
      }, acc);

      return scoreDocs;
    }, new Map());

    return documentIds
      .sort((a, b) => b - a)
      .reduce((acc, score, documentId) => ([
        ...acc,
        { score, source: documentIndex.get(documentId) },
      ]), []);
  }
}

module.exports = Store;
