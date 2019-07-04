/**
 * Created by ngnhat on Sat May 25 2019
 */
const { Map, Set } = require('immutable');
const bm25Scoring = require('./scoring/bm25');
const { initMapping, getAnalyzer } = require('./src/mapping');
const buildClause = require('./src/query');

class ElasticLike {
  constructor(config = {}) {
    const { docKey = 'id', mapping = {} } = config;
    const _mapping = initMapping(mapping);

    this.docKey = docKey;
    this.mapping = _mapping;

    this.fieldCountIndex = Map();
    this.fieldLengthIndex = Map();

    this.documentIndex = Map();
    this.docIdTokensIndex = _mapping.reduce((acc, _, field) => (
      acc.set(field, Map())
    ), Map());
    this.tokenDocIdsIndex = _mapping.reduce((acc, _, field) => (
      acc.set(field, Map())
    ), Map());
  }

  add(document = {}) {
    const { docKey, mapping, documentIndex, tokenDocIdsIndex } = this;
    let { docIdTokensIndex, fieldLengthIndex, fieldCountIndex } = this;
    const { [docKey]: docId } = document;

    if (!docId) { return false; }

    this.documentIndex = documentIndex.set(docId, document);

    this.tokenDocIdsIndex = tokenDocIdsIndex.map((tokenDocIds, field) => {
      const { [field]: value = '' } = document;
      const analyzerName = mapping.getIn([field, 'analyzer'], 'standard');
      const _docTerms = getAnalyzer(analyzerName)(`${value}`);
      const termLength = _docTerms.length;

      const docTerms = _docTerms.reduce((acc, term) => (
        acc.update(term, 0, count => count + 1)
      ), Map());

      docIdTokensIndex = docIdTokensIndex
        .setIn([field, docId, 'terms'], docTerms)
        .setIn([field, docId, 'termsLength'], termLength);
      fieldLengthIndex = fieldLengthIndex.update(field, 0, length => length + termLength);
      fieldCountIndex = fieldCountIndex.update(field, 0, count => (
        count + (termLength ? 1 : 0)
      ));

      return docTerms.reduce((acc, _, term) => (
        acc.update(term, Set(), listIds => listIds.add(docId))
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
  search(_clause = {}) {
    const { documentIndex } = this;
    const clause = buildClause(_clause);
    const docIds = this.calcIds(clause);
    const docScoreIndex = this.calculate(clause, docIds);

    return docScoreIndex
      .sort((a, b) => b - a)
      .reduce((acc, score, docId) => ([
        ...acc,
        { score, source: documentIndex.get(docId) },
      ]), []);
  }

  calcIds(clause = {}, docIdsMustAppear) {
    const { match, bool } = clause;

    if (match) {
      return this.calcIdsByMatchClause(match, docIdsMustAppear);
    }

    const { must, should } = bool;

    const mustIds = must.reduce((accIds, _clause) => (
      this.calcIds(_clause, accIds)
    ), docIdsMustAppear);

    if (mustIds) {
      return mustIds;
    }

    return should.reduce((accIds, _clause) => (
      accIds.concat(this.calcIds(_clause, docIdsMustAppear))
    ), Set());
  }

  calcIdsByMatchClause(matchClause = {}, docIdsMustAppear) {
    const { query, field } = matchClause;
    const { mapping, docIdTokensIndex, tokenDocIdsIndex } = this;
    const analyzer = mapping.getIn([field, 'search_analyzer'], 'standard');
    const docTerms = getAnalyzer(analyzer)(`${query}`);

    const terms = docTerms.reduce((acc, term) => (
      acc.update(term, 0, count => count + 1)
    ), Map());

    return terms.reduce((acc, count, term) => {
      const ids = tokenDocIdsIndex
        .getIn([field, term], Set())
        .filter(docId => count <= docIdTokensIndex.getIn([field, docId, 'terms', term], 0));

      return Set.isSet(acc) ? acc.intersect(ids) : ids;
    }, docIdsMustAppear);
  }

  calculate(clause = {}, docIdsMustAppear) {
    if (clause.match) {
      return this.calculateScore(clause.match, docIdsMustAppear);
    }

    const { must, should } = clause.bool;

    const docScoreIndex = must.reduce((accDocScore, _clause) => {
      const docScore = this.calculate(_clause, docIdsMustAppear);

      return docScore.reduce((accScore, score, docId) => (
        accScore.update(docId, 0, currentScore => currentScore + score)
      ), accDocScore || Map());
    }, undefined);

    const docScoreIndex2 = should.reduce((accDocScore, _clause) => {
      const docScore = this.calculate(_clause, docIdsMustAppear);

      return docScore.reduce((accScore, score, docId) => (
        accScore.update(docId, 0, currentScore => currentScore + score)
      ), accDocScore);
    }, docScoreIndex || Map());

    return docScoreIndex2;
  }

  calculateScore(matchClause = {}, docIdsMustAppear) {
    const { query, field, boost } = matchClause;
    const { mapping, fieldCountIndex, fieldLengthIndex, docIdTokensIndex, tokenDocIdsIndex } = this;
    const analyzer = mapping.getIn([field, 'search_analyzer'], 'standard');

    const docFieldCount = fieldCountIndex.get(field, 0);
    const docFieldLength = fieldLengthIndex.get(field, 0);
    const avgdl = docFieldLength / Math.max(docFieldCount, 1);
    const docTerms = getAnalyzer(analyzer)(`${query}`);

    const terms = docTerms.reduce((acc, term) => (
      acc.update(term, 0, count => count + 1)
    ), Map());

    const docIds = terms.reduce((acc, count, term) => {
      const ids = tokenDocIdsIndex
        .getIn([field, term], Set())
        .filter(docId => count <= docIdTokensIndex.getIn([field, docId, 'terms', term], 0));

      return Set.isSet(acc) ? acc.intersect(ids) : ids;
    }, docIdsMustAppear);

    return docIds.reduce((accScore, docId) => {
      const score = terms.reduce((sumScore, _, term) => {
        const dl = docIdTokensIndex.getIn([field, docId, 'termsLength'], 0);
        const freq = docIdTokensIndex.getIn([field, docId, 'terms', term], 0);
        const docFieldFreq = tokenDocIdsIndex.getIn([field, term], Set()).count();
        const idf = Math.log(1 + (docFieldCount - docFieldFreq + 0.5) / (docFieldFreq + 0.5));

        return sumScore + bm25Scoring({ idf, freq, dl, avgdl });
      }, 0);

      return accScore.set(docId, score * boost);
    }, Map());
  }
}

module.exports = ElasticLike;
