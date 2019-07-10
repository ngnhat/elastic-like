/**
 * Created by ngnhat on Sat May 25 2019
 */
const { List, Map, Set } = require('immutable');
const bm25Scoring = require('./scoring/bm25');
const { initMapping, analysis } = require('./src/mapping');
const buildClause = require('./src/query');

class TermFrequency {
  constructor() {
    this.fieldCountIndex = Map();
    this.fieldLengthIndex = Map();
    this.docIdTokensIndex = Map();
    this.tokenDocIdsIndex = Map();
  }

  add(id, field, terms) {
    const termsLength = terms.reduce((length, count) => length + count, 0);

    this.docIdTokensIndex = this.docIdTokensIndex
      .updateIn([field, id, 'terms'], Map(), tokens => (
        tokens.mergeWith((oldValue, newValue) => oldValue + newValue, terms)
      ))
      .updateIn([field, id, 'termsLength'], 0, oldLength => oldLength + termsLength);

    this.fieldLengthIndex = this.fieldLengthIndex
      .update(field, 0, length => length + termsLength);
    this.fieldCountIndex = this.fieldCountIndex
      .update(field, 0, count => count + (termsLength ? 1 : 0));

    this.tokenDocIdsIndex = this.tokenDocIdsIndex.update(field, Map(), tokenDocIds => (
      terms.reduce((acc, _, term) => (
        acc.update(term, Set(), listIds => listIds.add(id))
      ), tokenDocIds)
    ));
  }

  delete(id) {
    if (!id) { return false; }

    let { tokenDocIdsIndex, fieldLengthIndex, fieldCountIndex } = this;

    this.docIdTokensIndex = this.docIdTokensIndex.map((docIdTokens, field) => {
      const tokens = docIdTokens.getIn([id, 'terms'], []);
      const termsLength = docIdTokens.getIn([id, 'termsLength'], 0);

      tokenDocIdsIndex = tokens.reduce((acc, _, token) => {
        const newAcc = acc.deleteIn([field, token, id]);
        const currentTokenDocIds = newAcc.getIn([field, token]);

        if (!currentTokenDocIds.count()) {
          return newAcc.deleteIn([field, token]);
        }

        return newAcc;
      }, tokenDocIdsIndex);

      fieldCountIndex = fieldCountIndex.update(field, 0, value => Math.max(value - 1, 0));
      fieldLengthIndex = fieldLengthIndex.update(field, 0, value => (
        Math.max(value - termsLength, 0)
      ));

      return docIdTokens.delete(id);
    });

    this.tokenDocIdsIndex = tokenDocIdsIndex;
    this.fieldLengthIndex = fieldLengthIndex;
    this.fieldCountIndex = fieldCountIndex;

    return true;
  }

  getFieldCount(field) {
    return this.fieldCountIndex.get(field, 0);
  }

  getFieldLength(field) {
    return this.fieldLengthIndex.get(field, 0);
  }

  getAvgdl(field) {
    const docFieldCount = this.fieldCountIndex.get(field, 0);
    const docFieldLength = this.fieldLengthIndex.get(field, 0);

    return docFieldLength / Math.max(docFieldCount, 1);
  }

  getIdsByTerm(field, term, count = 0) {
    return this.tokenDocIdsIndex
      .getIn([field, term], Set())
      .filter(docId => count <= this.docIdTokensIndex.getIn([field, docId, 'terms', term], 0));
  }

  getDl(id, field) {
    return this.docIdTokensIndex.getIn([field, id, 'termsLength'], 0);
  }

  getFreq(id, field, term) {
    return this.docIdTokensIndex.getIn([field, id, 'terms', term], 0);
  }

  getFieldFreq(field, term) {
    return this.tokenDocIdsIndex.getIn([field, term], Set()).count();
  }
}

const fieldTermCalc = (mapping, document, originalField) => (
  mapping.reduce((docTermsAcc, fieldMapping, field) => {
    const { [originalField || field]: value = '' } = document;
    const properties = fieldMapping.get('properties', Map());

    if (!properties.isEmpty() && value instanceof Object) {
      return List([].concat(value))
        .reduce((fieldAcc, childrenDocument) => {
          const propertiesMapping = fieldMapping.get('properties', Map());
          const propertiesTermCount = fieldTermCalc(propertiesMapping, childrenDocument)
            .mapKeys(childrenField => `${field}.${childrenField}`);

          return propertiesTermCount.reduce((newFieldAcc, termCount, _field) => (
            newFieldAcc.update(_field, Map(), oldTermCount => (
              termCount.reduce((termAcc, count, term) => (
                termAcc.update(term, 0, oldCount => oldCount + count)
              ), oldTermCount)
            ))
          ), fieldAcc);
        }, docTermsAcc);
    }

    if (typeof value !== 'object') {
      const fields = fieldMapping.get('fields', Map());
      const analyzerName = fieldMapping.get('analyzer', 'standard');

      const terms = analysis(value, analyzerName);

      const fieldTermCount = docTermsAcc.update(field, Map(), oldTerms => (
        terms.reduce((termsAcc, count, term) => (
          termsAcc.update(term, 0, oldCount => oldCount + count)
        ), oldTerms)
      ));

      if (fields.isEmpty()) {
        return fieldTermCount;
      }

      return fieldTermCalc(fields, document, field)
        .mapKeys(key => `${field}.${key}`)
        .reduce((newFieldAcc, termCount, _field) => (
          newFieldAcc.update(_field, Map(), oldTermCount => (
            termCount.reduce((termAcc, count, term) => (
              termAcc.update(term, 0, oldCount => oldCount + count)
            ), oldTermCount)
          ))
        ), fieldTermCount);
    }

    return docTermsAcc;
  }, Map())
);

class ElasticLike {
  constructor(config = {}) {
    const { mapping = {} } = config;
    const _mapping = initMapping(mapping);
    this.mapping = _mapping;

    this.documentIndex = Map();
    this.tfidf = new TermFrequency();
  }

  add(docId, document = {}) {
    try {
      const { mapping, documentIndex } = this;

      if (!docId) { return false; }

      this.documentIndex = documentIndex.set(docId, document);

      fieldTermCalc(mapping, document).forEach((terms, field) => {
        this.tfidf.add(docId, field, terms);
      });

      return true;
    } catch (err) {
      return false;
    }
  }

  delete(docId) {
    if (!docId) { return false; }

    this.documentIndex = this.documentIndex.delete(docId);
    this.tfidf.delete(docId);

    return true;
  }

  update(docId, document = {}) {
    if (!docId) { return false; }

    this.delete(docId);

    return this.add(docId, document);
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
    const { match, bool, nested } = clause;

    if (match) {
      return this.calcIdsByMatchClause(match, docIdsMustAppear);
    }

    // TODO:
    if (nested) {
      return [];
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
    const { mapping } = this;
    const analyzerName = mapping.getIn([field, 'search_analyzer'], 'standard');
    const terms = analysis(query, analyzerName);

    return terms.reduce((acc, count, term) => {
      const ids = this.tfidf.getIdsByTerm(field, term, count);

      return Set.isSet(acc) ? acc.intersect(ids) : ids;
    }, docIdsMustAppear);
  }

  calculate(clause = {}, docIdsMustAppear) {
    const { match, nested, bool } = clause;

    if (match) {
      return this.calculateScore(match, docIdsMustAppear);
    }

    // TODO:
    if (nested) {
      return Map();
    }

    const { must, should } = bool;

    const docScoreIndex = must.reduce((accDocScore, _clause) => {
      const docScore = this.calculate(_clause, docIdsMustAppear);

      return docScore.reduce((accScore, score, docId) => (
        accScore.update(docId, 0, currentScore => currentScore + score)
      ), accDocScore || Map());
    }, null);

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
    const { mapping } = this;
    const analyzerName = mapping.getIn([field, 'search_analyzer'], 'standard');
    const terms = analysis(query, analyzerName);

    const avgdl = this.tfidf.getAvgdl(field);
    const docFieldCount = this.tfidf.getFieldCount(field);

    const docIds = terms.reduce((acc, count, term) => {
      const ids = this.tfidf.getIdsByTerm(field, term, count);

      return Set.isSet(acc) ? acc.intersect(ids) : ids;
    }, docIdsMustAppear);

    return docIds.reduce((accScore, docId) => {
      const dl = this.tfidf.getDl(docId, field);

      const score = terms.reduce((sumScore, _, term) => {
        const freq = this.tfidf.getFreq(docId, field, term);
        const docFieldFreq = this.tfidf.getFieldFreq(field, term);
        const idf = Math.log(1 + (docFieldCount - docFieldFreq + 0.5) / (docFieldFreq + 0.5));

        return sumScore + bm25Scoring({ idf, freq, dl, avgdl });
      }, 0);

      return accScore.set(docId, score * boost);
    }, Map());
  }
}

module.exports = ElasticLike;
