/**
 * Created by ngnhat on Sat May 25 2019
 */
const { List, Map, Set } = require('immutable');
const bm25Ranking = require('./ranking/bm25');
const { initMapping, analysis } = require('./src/mapping');
const buildClause = require('./src/query');

class TermFrequency {
  constructor() {
    this.docIdTermsIndex = Map();
    this.termDocIdsIndex = Map();
    this.fieldCountIndex = Map();
    this.fieldLengthIndex = Map();
  }

  add(id, field, termsIndex) {
    const isNested = List.isList(termsIndex);
    const listTerms = isNested ? termsIndex : List([termsIndex]);

    listTerms.forEach((nestedTerm, index) => {
      const termsLength = nestedTerm.reduce((length, count) => length + count, 0);

      this.docIdTermsIndex = this.docIdTermsIndex
        .updateIn([field, id, 'terms'], Map(), tokens => (
          nestedTerm.reduce((acc, count, token) => {
            const newAcc = acc.updateIn([token, 'count'], 0, totalCount => totalCount + count);

            if (isNested) {
              return newAcc.updateIn([token, 'indexs'], Set(), indexs => indexs.add(index));
            }

            return newAcc;
          }, tokens)
        ))
        .updateIn([field, id, 'termsLength'], 0, oldLength => oldLength + termsLength);

      this.fieldLengthIndex = this.fieldLengthIndex
        .update(field, 0, length => length + termsLength);
      this.fieldCountIndex = this.fieldCountIndex
        .update(field, 0, count => count + (termsLength ? 1 : 0));

      this.termDocIdsIndex = this.termDocIdsIndex.update(field, Map(), tokenDocIds => (
        nestedTerm.reduce((acc, _, _term) => (
          acc.update(_term, Set(), listIds => listIds.add(id))
        ), tokenDocIds)
      ));
    });
  }

  delete(id) {
    if (!id) { return false; }

    let { termDocIdsIndex, fieldLengthIndex, fieldCountIndex } = this;

    this.docIdTermsIndex = this.docIdTermsIndex.map((docIdTokens, field) => {
      const tokens = docIdTokens.getIn([id, 'terms'], []);
      const termsLength = docIdTokens.getIn([id, 'termsLength'], 0);

      termDocIdsIndex = tokens.reduce((acc, _, token) => {
        const newAcc = acc.deleteIn([field, token, id]);
        const currentTokenDocIds = newAcc.getIn([field, token]);

        if (!currentTokenDocIds.count()) {
          return newAcc.deleteIn([field, token]);
        }

        return newAcc;
      }, termDocIdsIndex);

      fieldCountIndex = fieldCountIndex.update(field, 0, value => Math.max(value - 1, 0));
      fieldLengthIndex = fieldLengthIndex.update(field, 0, value => (
        Math.max(value - termsLength, 0)
      ));

      return docIdTokens.delete(id);
    });

    this.termDocIdsIndex = termDocIdsIndex;
    this.fieldCountIndex = fieldCountIndex;
    this.fieldLengthIndex = fieldLengthIndex;

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
    return this.termDocIdsIndex
      .getIn([field, term], Set())
      .filter(docId => count <= this.docIdTermsIndex.getIn([field, docId, 'terms', term, 'count'], 0));
  }

  getNestedIdsByTerm(field, term, count = 0) {
    return this.termDocIdsIndex
      .getIn([field, term], Set())
      .filter(docId => count <= this.docIdTermsIndex.getIn([field, docId, 'terms', term, 'count'], 0))
      .reduce((acc, docId) => (
        acc.set(docId, this.docIdTermsIndex.getIn([field, docId, 'terms', term, 'indexs'], Set()))
      ), Map());
  }

  getDl(id, field) {
    return this.docIdTermsIndex.getIn([field, id, 'termsLength'], 0);
  }

  getNestedDl(id, field) {
    return this.docIdTermsIndex.getIn([field, id, 'termsLength'], 0) / this.docIdTermsIndex.getIn([field, id, 'terms'], Map()).count();
  }

  getFreq(id, field, term) {
    return this.docIdTermsIndex.getIn([field, id, 'terms', term, 'count'], 0);
  }

  getFieldFreq(field, term) {
    return this.termDocIdsIndex.getIn([field, term], Set()).count();
  }
}

const fieldTermCalc = (mapping, document, originalField) => (
  mapping.reduce((docTermsAcc, fieldMapping, field) => {
    const { [originalField || field]: value = '' } = document;
    const properties = fieldMapping.get('properties', Map());

    if (!properties.isEmpty() && value instanceof Object) {
      const childrenDocuments = List([].concat(value));
      const propertiesMapping = fieldMapping.get('properties', Map());
      const type = fieldMapping.get('type');

      if (type === 'nested') {
        return childrenDocuments.reduce((newFieldAcc, childrenDocument) => {
          const nestedTerm = fieldTermCalc(propertiesMapping, childrenDocument);

          return propertiesMapping.reduce((acc, _, childrenField) => (
            acc.update(`${field}.${childrenField}`, List(), list => (
              list.push(nestedTerm.get(childrenField, Map()))
            ))
          ), newFieldAcc);
        }, docTermsAcc);
      }

      return childrenDocuments.reduce((newFieldAcc, childrenDocument) => (
        fieldTermCalc(propertiesMapping, childrenDocument)
          .mapKeys(childrenField => `${field}.${childrenField}`)
          .reduce((fieldAcc, termCount, childrenField) => (
            fieldAcc.update(childrenField, Map(), oldTermCount => (
              termCount.reduce((termAcc, count, term) => (
                termAcc.update(term, 0, oldCount => oldCount + count)
              ), oldTermCount)
            ))
          ), newFieldAcc)
      ), docTermsAcc);
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
        .reduce((fieldAcc, termCount, childrenField) => (
          fieldAcc.update(childrenField, Map(), oldTermCount => (
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

    this.documentIndex = Map();
    this.tfidf = new TermFrequency();
    this.mapping = initMapping(mapping);
  }

  getSearchAnalyzerName(field) {
    const { mapping } = this;

    const fields = field.split('.');
    const fieldsLength = fields.length;

    const pathMapping = fields.reduce((acc, name, index) => {
      if (index === fieldsLength - 1) {
        return [...acc, name];
      }

      return mapping.getIn([...acc, name]).has('fields')
        ? [...acc, name, 'fields']
        : [...acc, name, 'properties'];
    }, []);

    return mapping.getIn([...pathMapping, 'search_analyzer'], 'standard');
  }

  add(docId, document = {}) {
    try {
      const { mapping, documentIndex } = this;

      if (!docId) { return false; }

      this.documentIndex = documentIndex.set(docId, document);

      fieldTermCalc(mapping, document).forEach((termsIndex, field) => {
        this.tfidf.add(docId, field, termsIndex);
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
    const { match, bool, nested, functionScore } = clause;

    if (match) {
      return this.calcIdsByMatchClause(match, docIdsMustAppear);
    }

    if (nested) {
      const nestedIds = this.calcNestedIds(nested.query)
        .reduce((acc, _, key) => acc.add(key), Set());

      return Set.isSet(docIdsMustAppear) ? docIdsMustAppear.intersect(nestedIds) : nestedIds;
    }

    if (bool) {
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

    if (functionScore) {
      return this.calcIds(functionScore.query);
    }

    return Set();
  }

  calcNestedIds(clause = {}, docIdsMustAppear) {
    const { match, bool } = clause;

    if (match) {
      return this.calcIdsByNestedClause(match, docIdsMustAppear);
    }

    const { must, should } = bool;

    const mustIds = must.reduce((accIds, _clause) => (
      this.calcNestedIds(_clause, accIds)
    ), docIdsMustAppear);

    if (mustIds) {
      return mustIds;
    }

    return should.reduce((accNestedIds, _clause) => {
      const nestedIds = this.calcNestedIds(_clause, docIdsMustAppear);

      return nestedIds.reduce((acc, indexs, docId) => (
        acc.update(docId, Set(), currentIndexs => currentIndexs.union(indexs))
      ), accNestedIds);
    }, Map());
  }

  calcIdsByNestedClause(matchClause = {}, docIdsMustAppear) {
    const { query, field } = matchClause;
    const analyzerName = this.getSearchAnalyzerName(field);
    const terms = analysis(query, analyzerName);

    return terms.reduce((docIdsAcc, count, term) => {
      const nestedIds = this.tfidf.getNestedIdsByTerm(field, term, count);

      if (!Map.isMap(docIdsAcc)) {
        return nestedIds;
      }

      return nestedIds
        .reduce((nestedIdsAcc, value, key) => (
          nestedIdsAcc.update(key, Set(), currentVal => currentVal.intersect(value))
        ), docIdsAcc)
        .filter(value => !value.isEmpty());
    }, docIdsMustAppear);
  }

  calcIdsByMatchClause(matchClause = {}, docIdsMustAppear) {
    const { query, field } = matchClause;
    const analyzerName = this.getSearchAnalyzerName(field);
    const terms = analysis(query, analyzerName);

    return terms.reduce((acc, count, term) => {
      const ids = this.tfidf.getIdsByTerm(field, term, count);

      return Set.isSet(acc) ? acc.intersect(ids) : ids;
    }, docIdsMustAppear);
  }

  calculate(clause = {}, docIdsMustAppear, isNested = false) {
    const { match, nested, bool, functionScore } = clause;

    if (match) {
      if (isNested) {
        return this.calculateNestedScore(match, docIdsMustAppear);
      }

      return this.calculateScore(match, docIdsMustAppear);
    }

    if (nested) {
      return this.calculate(nested.query, docIdsMustAppear, true);
    }

    if (functionScore) {
      const { query: functionScoreQuery, scriptScore } = functionScore;
      const scores = this.calculate(functionScoreQuery, docIdsMustAppear, isNested);
      // TODO: something went wrong
      return scores.map(scriptScore);
    }

    const { must, should } = bool;

    const docScoreIndex = must.reduce((accDocScore, _clause) => {
      const docScore = this.calculate(_clause, docIdsMustAppear, isNested);

      return docScore.reduce((accScore, score, docId) => (
        accScore.update(docId, 0, currentScore => currentScore + score)
      ), accDocScore || Map());
    }, null);

    return should.reduce((accDocScore, _clause) => {
      const docScore = this.calculate(_clause, docIdsMustAppear, isNested);

      return docScore.reduce((accScore, score, docId) => (
        accScore.update(docId, 0, currentScore => currentScore + score)
      ), accDocScore);
    }, docScoreIndex || Map());
  }

  calculateScore(matchClause = {}, docIdsMustAppear) {
    const { query, field, boost } = matchClause;
    const analyzerName = this.getSearchAnalyzerName(field);
    const terms = analysis(query, analyzerName);

    const avgdl = this.tfidf.getAvgdl(field);
    const docFieldCount = this.tfidf.getFieldCount(field);

    const docIds = terms.reduce((acc, count, term) => {
      const ids = this.tfidf.getIdsByTerm(field, term, count);

      return Set.isSet(acc) ? acc.intersect(ids) : ids;
    }, docIdsMustAppear);

    return docIds.reduce((docsWithScore, docId) => {
      const dl = this.tfidf.getDl(docId, field);

      const score = terms.reduce((sumScore, _, term) => {
        const freq = this.tfidf.getFreq(docId, field, term);
        const docFieldFreq = this.tfidf.getFieldFreq(field, term);
        const idf = Math.log(1 + (docFieldCount - docFieldFreq + 0.5) / (docFieldFreq + 0.5));

        return sumScore + bm25Ranking({ idf, freq, dl, avgdl });
      }, 0);

      return docsWithScore.set(docId, score * boost);
    }, Map());
  }

  calculateNestedScore(matchClause = {}, docIdsMustAppear) {
    const { query, field, boost } = matchClause;
    const analyzerName = this.getSearchAnalyzerName(field);
    const terms = analysis(query, analyzerName);

    const avgdl = this.tfidf.getAvgdl(field);
    const docFieldCount = this.tfidf.getFieldCount(field);

    const nestedDocIds = (
      terms.reduce((nestedDocIdsAcc, count, term) => {
        const nestedIds = this.tfidf.getNestedIdsByTerm(field, term, count);

        if (!Map.isMap(nestedDocIdsAcc)) {
          return nestedIds;
        }

        return nestedIds
          .reduce((nestedIdsAcc, value, key) => (
            nestedIdsAcc.update(key, Set(), currentVal => currentVal.intersect(value))
          ), nestedDocIdsAcc)
          .filter(value => !value.isEmpty());
      }, null) || Map()
    ).reduce((acc, _, docId) => acc.add(docId), Set());

    const _docIds = nestedDocIds.reduce((acc, _, docId) => acc.add(docId), Set());
    const docIds = docIdsMustAppear ? docIdsMustAppear.intersect(_docIds) : _docIds;

    return docIds.reduce((docsWithScore, docId) => {
      const dl = this.tfidf.getNestedDl(docId, field);

      const score = terms.reduce((sumScore, _, term) => {
        const freq = this.tfidf.getFreq(docId, field, term);
        const docFieldFreq = this.tfidf.getFieldFreq(field, term);
        const idf = Math.log(1 + (docFieldCount - docFieldFreq + 0.5) / (docFieldFreq + 0.5));

        return sumScore + bm25Ranking({ idf, freq, dl, avgdl });
      }, 0);

      return docsWithScore.set(docId, score * boost);
    }, Map());
  }
}

module.exports = ElasticLike;
