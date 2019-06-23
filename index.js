/**
 * Created by ngnhat on Sat May 25 2019
 */
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

class ElasticLike {
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
    let { docIdTokensIndex, fieldLengthIndex, fieldCountIndex } = this;
    const { [docKey]: docId } = document;

    if (!docId) { return false; }

    this.documentIndex = documentIndex.set(docId, document);

    this.tokenDocIdsIndex = tokenDocIdsIndex.map((tokenDocIds, field) => {
      const { [field]: value = '' } = document;
      const { [field]: { analyzer: analyzerName = 'standard' } = {} } = mapping;
      const _docTerms = getAnalyzer(analyzerName)(`${value}`);
      const termLength = _docTerms.length;

      const docTerms = _docTerms.reduce((acc, term) => (
        acc.update(term, 0, count => count + 1)
      ), new Map());

      docIdTokensIndex = docIdTokensIndex
        .setIn([field, docId, 'terms'], docTerms)
        .setIn([field, docId, 'termsLength'], termLength);
      fieldLengthIndex = fieldLengthIndex.update(field, 0, length => length + termLength);
      fieldCountIndex = fieldCountIndex.update(field, 0, count => (
        count + (termLength ? 1 : 0)
      ));

      return docTerms.reduce((acc, _, term) => (
        acc.update(term, new Set(), listIds => listIds.add(docId))
      ), tokenDocIds);
    });

    this.docIdTokensIndex = docIdTokensIndex;
    this.fieldLengthIndex = fieldLengthIndex;
    this.fieldCountIndex = fieldCountIndex;

    return true;
  }

  delete(docId) {
    if (!docId) { return false; }

    let { tokenDocIdsIndex, fieldLengthIndex, fieldCountIndex } = this;
    const { documentIndex, docIdTokensIndex } = this;

    this.docIdTokensIndex = docIdTokensIndex.map((docIdTokens, field) => {
      const tokens = docIdTokens.getIn([docId, 'terms'], []);
      const termLength = docIdTokens.getIn([docId, 'termsLength'], 0);

      tokenDocIdsIndex = tokens.reduce((acc, _, token) => {
        const newAcc = acc.deleteIn([field, token, docId]);
        const currentTokenDocIds = newAcc.getIn([field, token]);

        if (!currentTokenDocIds.count()) { return newAcc.deleteIn([field, token]); }

        return newAcc;
      }, tokenDocIdsIndex);

      fieldCountIndex = fieldCountIndex.update(field, 0, value => Math.max(value - 1, 0));
      fieldLengthIndex = fieldLengthIndex.update(field, 0, value => (
        Math.max(value - termLength, 0)
      ));

      return docIdTokens.delete(docId);
    });

    this.documentIndex = documentIndex.delete(docId);
    this.tokenDocIdsIndex = tokenDocIdsIndex;
    this.fieldLengthIndex = fieldLengthIndex;
    this.fieldCountIndex = fieldCountIndex;

    return true;
  }

  update(document = {}) {
    const { docKey } = this;
    const { [docKey]: docId } = document;

    if (!docId) { return false; }

    this.delete(docId);

    return this.add(document);
  }

  /**
   * the same as elasticsearch query with the following options:
   * query = multiple_match
   * type = most_fields
   * operator = and
   */
  search(keyword = '') {
    const {
      mapping,
      documentIndex,
      fieldCountIndex,
      fieldLengthIndex,
      docIdTokensIndex,
      tokenDocIdsIndex,
    } = this;

    const docScoreIndex = tokenDocIdsIndex.reduce((docScoreAcc, tokenDocIds, field) => {
      const { [field]: { analyzer = 'standard' } = {} } = mapping;
      const docFieldCount = fieldCountIndex.get(field, 1);
      const docFieldLength = fieldLengthIndex.get(field, 0);
      const docTerms = getAnalyzer(analyzer)(`${keyword}`);

      const terms = docTerms.reduce((acc, term) => (
        acc.update(term, 0, count => count + 1)
      ), new Map());

      return terms.reduce((fieldDocScoreAcc, _, term) => {
        const idsTerm = tokenDocIds.get(term, new Set());
        const docFieldFreq = idsTerm.count();
        const avgdl = docFieldLength / docFieldCount;
        const idf = Math.log(1 + (docFieldCount - docFieldFreq + 0.5) / (docFieldFreq + 0.5));

        const scores = idsTerm
          .filter((docId) => { // operator=and
            const tokens = docIdTokensIndex.getIn([field, docId, 'terms'], []);

            return terms.every((count, docTerm) => (
              tokens.has(docTerm) && count <= tokens.get(docTerm)
            ));
          }).reduce((accDoc, docId) => {
            const tokens = docIdTokensIndex.getIn([field, docId, 'terms'], []);
            const dl = docIdTokensIndex.getIn([field, docId, 'termsLength'], 0);

            const freq = tokens.filter((__, token) => token === term)
              .reduce((acc, count) => acc + count, 0);

            const score = idf * freq * (K1 + 1) / (freq + K1 * (1 - B + B * dl / avgdl));

            return accDoc.set(docId, score);
          }, new Map());

        return scores.reduce((accScore, score, docId) => (
          accScore.update(docId, 0, currentScore => currentScore + score)
        ), fieldDocScoreAcc);
      }, docScoreAcc);
    }, new Map());

    return docScoreIndex
      .sort((a, b) => b - a)
      .reduce((acc, score, documentId) => ([
        ...acc,
        { score, source: documentIndex.get(documentId) },
      ]), []);
  }
}

module.exports = ElasticLike;
