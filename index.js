const { Map, Set } = require('immutable');
const { standardTokenizer, asciiFoldingTokenizer } = require('../tokenizers');
// const data = require('./data.json');

const emptyMap = new Map();
const emptySet = new Set();

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
        // Name: { type: 'text', analyzer: 'asciifolding' },
        Name: { type: 'text', analyzer: 'standard' },
        Code: { type: 'text', analyzer: 'standard' },
      },
    } = config;
    const mappingFields = Object.keys(mapping);


    this.docKey = docKey;
    this.mapping = mapping;

    this.fieldCountIndex = emptyMap;
    this.fieldLengthIndex = emptyMap;

    this.documentIndex = emptyMap;
    this.idTokensIndex = mappingFields.reduce((acc, field) => acc.set(field, emptyMap), emptyMap);
    this.tokenToIdsIndex = mappingFields.reduce((acc, field) => acc.set(field, emptyMap), emptyMap);
  }

  add(document = {}) {
    const { docKey, mapping, documentIndex, tokenToIdsIndex } = this;
    const { [docKey]: id } = document;
    this.documentIndex = documentIndex.set(id, document);

    this.tokenToIdsIndex = tokenToIdsIndex.map((fieldValue, field) => {
      const { [field]: value = '' } = document;
      const { [field]: { analyzer: analyzerName = 'standard' } = {} } = mapping;
      const docTerms = getAnalyzer(analyzerName)(`${value}`);
      const termLength = docTerms.length;

      this.idTokensIndex = this.idTokensIndex.setIn([field, id], docTerms);
      this.fieldLengthIndex = this.fieldLengthIndex.update(field, 0, length => length + termLength);
      this.fieldCountIndex = this.fieldCountIndex.update(field, 0, count => (
        count + (termLength ? 1 : 0)
      ));

      return docTerms.reduce((acc, term) => (
        acc.update(term, emptySet, listIds => listIds.add(id))
      ), fieldValue);
    });
  }

  // delete(documentId) {
  //   const { documentIndex, tokenToIdsIndex } = this;
  //
  //   const document = documentIndex.get(documentId);
  //   this.documentIndex = documentIndex.delete(documentId);
  // }

  // type = 'most_fields'
  search(keyword = '') {
    const {
      mapping,
      documentIndex,
      idTokensIndex,
      fieldCountIndex,
      fieldLengthIndex,
      tokenToIdsIndex,
    } = this;
    console.log('idTokensIndex', idTokensIndex.toJS());
    console.log('tokenToIdsIndex', tokenToIdsIndex.toJS());

    const documentIds = tokenToIdsIndex.reduce((acc, fieldValue, field) => {
      const { [field]: { analyzer = 'standard' } = {} } = mapping;
      const docTerms = getAnalyzer(analyzer)(`${keyword}`);

      const docIds = docTerms.reduce((accum, term, index) => {
        const idsTerm = fieldValue.get(term, emptySet);
        return index === 0 ? idsTerm : accum.intersect(idsTerm);
      }, emptySet);

      const docFieldFreq = docIds.count();
      const docFieldCount = fieldCountIndex.get(field, 1);
      const docFieldLength = fieldLengthIndex.get(field, 0);

      const avgdl = docFieldLength / docFieldCount;
      const idf = Math.log(1 + (docFieldCount - docFieldFreq + 0.5) / (docFieldFreq + 0.5));

      const scores = docIds.reduce((accDoc, docId) => {
        const tokens = idTokensIndex.getIn([field, docId]);
        const freq = tokens.reduce((total, token) => total + (docTerms.includes(token) ? 1 : 0), 0);
        const dl = tokens.length;

        const score = idf * freq * (K1 + 1) / (freq + K1 * (1 - B + B * dl / avgdl));

        return accDoc.set(docId, score);
      }, emptyMap);

      return scores.reduce((accum, score, key) => (
        accum.update(key, 0, val => val + score)
      ), acc);
    }, emptyMap);

    return documentIds
      .sort((a, b) => b - a)
      .reduce((acc, score, documentId) => ([
        ...acc,
        { score, source: documentIndex.get(documentId) },
      ]), []);
  }
}

module.exports = Store;

const store = new Store();
[
  // { Id: 1, Code: 'aaa', Name: 'aaa bbb ccc' },
  // { Id: 2, Code: 'bbb', Name: 'bbb ccc ddd' },
  // { Id: 3, Code: 'ccc', Name: 'ccc ddd eee' },
  { Id: 1, Code: 'aaa', Name: 'quick brown fox' },
  // { Id: 1, Code: '1', Name: 'The quick brown fox' },
  // { Id: 2, Code: '2', Name: 'The quick brown fox jumps over the lazy dog' },
  // { Id: 3, Code: '3', Name: 'The quick brown fox jumps hahaha over the quick dog' },
  // { Id: 4, Code: '4', Name: 'Brown fox hahaha brown dog' },
].forEach((doc) => { store.add(doc); });

const results = store.search('quick fox');
// const results = store.search('hahaha');
console.log(results);
