/**
 * Created by ngnhat on Sat May 25 2019
 */
const { Map, Set } = require('immutable');
const Frequency = require('./frequency');
const Analysis = require('./analysis');
const buildClause = require('./query');
const initMapping = require('./mapping');
const bm25Ranking = require('./ranking/bm25');

class ElasticLike {
  #mapping;

  #analysis;

  #documentIndex = Map();

  #tfidf = new Frequency();

  constructor(config = {}) {
    const { mapping = {}, analysis = {} } = config;

    this.#mapping = initMapping(mapping);
    this.#analysis = new Analysis(analysis);
  }

  add = (docId, document = {}) => {
    try {
      if (!docId) { return false; }

      this.#documentIndex = this.#documentIndex.set(docId, document);
      const docTerms = this.#analysis.calcDocTerms(this.#mapping, document);

      docTerms.forEach((termsIndex, field) => {
        this.#tfidf.add(docId, field, termsIndex);
      });

      return true;
    } catch (err) {
      return false;
    }
  }

  delete = (docId) => {
    try {
      if (!docId) {
        return false;
      }

      this.#tfidf.delete(docId);
      this.#documentIndex = this.#documentIndex.delete(docId);

      return true;
    } catch {
      return false;
    }
  }

  update = (docId, document = {}) => {
    if (!docId) {
      return false;
    }

    this.delete(docId);

    return this.add(docId, document);
  }

  /**
   * the same as elasticsearch query with the following options:
   * query = multiple_match
   * type = most_fields
   * operator = and
   */
  search = (_clause = {}) => {
    const clause = buildClause(_clause);

    try {
      const docIds = this.#calcIds(clause);
      const docScoreIndex = this.#calculate(clause, docIds);

      return docScoreIndex
        .sort((a, b) => b - a)
        .reduce((acc, score, docId) => ([
          ...acc,
          { score, source: this.#documentIndex.get(docId) },
        ]), []);
    } catch {
      return [];
    }
  }

  #getSearchAnalyzerName = (field) => {
    const fields = field.split('.');
    const fieldsLength = fields.length;

    const pathMapping = fields.reduce((acc, name, index) => {
      if (index === fieldsLength - 1) {
        return [...acc, name];
      }

      return this.#mapping.getIn([...acc, name]).has('fields')
        ? [...acc, name, 'fields']
        : [...acc, name, 'properties'];
    }, []);

    return this.#mapping.getIn([...pathMapping, 'search_analyzer'], 'standard');
  }

  #calcIdsByMatchClause = (matchClause = {}, docIdsMustAppear) => {
    const { query, field } = matchClause;
    const analyzerName = this.#getSearchAnalyzerName(field);
    const terms = this.#analysis.getCountedTerms(analyzerName, query);

    return terms.reduce((acc, count, term) => {
      const ids = this.#tfidf.getIdsByTerm(field, term, count);

      return Set.isSet(acc) ? acc.intersect(ids) : ids;
    }, docIdsMustAppear) || Set();
  }

  #calcIdsByNestedClause = (matchClause = {}, nestedDocIdsMustAppear) => {
    const { query, field } = matchClause;
    const analyzerName = this.#getSearchAnalyzerName(field);
    const terms = this.#analysis.getCountedTerms(analyzerName, query);

    return terms.reduce((docIdsAcc, count, term) => {
      const nestedIds = this.#tfidf.getNestedIdsByTerm(field, term, count);

      if (!Map.isMap(docIdsAcc)) {
        return nestedIds;
      }

      return nestedIds
        .reduce((nestedIdsAcc, value, key) => (
          nestedIdsAcc.update(key, Set(), currentVal => currentVal.intersect(value))
        ), docIdsAcc)
        .filter(value => !value.isEmpty());
    }, nestedDocIdsMustAppear) || Map();
  }

  #calcNestedIds = (clause = {}, nestedDocIdsMustAppear) => {
    const { match, bool } = clause;

    if (match) {
      return this.#calcIdsByNestedClause(match, nestedDocIdsMustAppear);
    }

    const { must, should } = bool;

    const mustIds = must.reduce((accIds, _clause) => (
      this.#calcNestedIds(_clause, accIds)
    ), nestedDocIdsMustAppear);

    if (mustIds) {
      return mustIds;
    }

    return should.reduce((accNestedIds, _clause) => {
      const nestedIds = this.#calcNestedIds(_clause, nestedDocIdsMustAppear);

      return nestedIds.reduce((acc, indexs, docId) => (
        acc.update(docId, Set(), currentIndexs => currentIndexs.union(indexs))
      ), accNestedIds);
    }, Map());
  }

  #calcIds = (clause = {}, docIdsMustAppear) => {
    const { match, bool, nested, functionScore } = clause;

    if (match) {
      return this.#calcIdsByMatchClause(match, docIdsMustAppear);
    }

    if (nested) {
      const nestedIds = this.#calcNestedIds(nested.query)
        .reduce((acc, _, key) => acc.add(key), Set());

      return Set.isSet(docIdsMustAppear) ? docIdsMustAppear.intersect(nestedIds) : nestedIds;
    }

    if (bool) {
      const { must, should } = bool;

      const mustIds = must.reduce((accIds, _clause) => (
        this.#calcIds(_clause, accIds)
      ), docIdsMustAppear);

      if (mustIds) {
        return mustIds;
      }

      return should.reduce((accIds, _clause) => (
        accIds.concat(this.#calcIds(_clause, docIdsMustAppear))
      ), Set());
    }

    if (functionScore) {
      return this.#calcIds(functionScore.query);
    }

    return Set();
  }

  #calculateScore = (matchClause = {}, docIdsMustAppear) => {
    const { query, field, boost } = matchClause;
    const avgdl = this.#tfidf.getAvgdl(field);
    const docFieldCount = this.#tfidf.getFieldCount(field);
    const analyzerName = this.#getSearchAnalyzerName(field);
    const terms = this.#analysis.getCountedTerms(analyzerName, query);
    const docIds = this.#calcIdsByMatchClause(matchClause, docIdsMustAppear);

    return docIds.reduce((docsWithScore, docId) => {
      const dl = this.#tfidf.getDl(docId, field);

      const score = terms.reduce((sumScore, _, term) => {
        const freq = this.#tfidf.getFreq(docId, field, term);
        const docFieldFreq = this.#tfidf.getFieldFreq(field, term);
        const idf = Math.log(1 + (docFieldCount - docFieldFreq + 0.5) / (docFieldFreq + 0.5));

        return sumScore + bm25Ranking({ idf, freq, dl, avgdl });
      }, 0);

      return docsWithScore.set(docId, score * boost);
    }, Map());
  }

  #calculateNestedScore = (matchClause = {}, docIdsMustAppear) => {
    const { query, field, boost } = matchClause;
    const avgdl = this.#tfidf.getAvgdl(field);
    const docFieldCount = this.#tfidf.getFieldCount(field);
    const analyzerName = this.#getSearchAnalyzerName(field);
    const terms = this.#analysis.getCountedTerms(analyzerName, query);

    const _docIds = this.#calcIdsByNestedClause(matchClause)
      .reduce((acc, _, docId) => acc.add(docId), Set());
    const docIds = docIdsMustAppear ? docIdsMustAppear.intersect(_docIds) : _docIds;

    return docIds.reduce((docsWithScore, docId) => {
      const dl = this.#tfidf.getNestedDl(docId, field);

      const score = terms.reduce((sumScore, _, term) => {
        const freq = this.#tfidf.getFreq(docId, field, term);
        const docFieldFreq = this.#tfidf.getFieldFreq(field, term);
        const idf = Math.log(1 + (docFieldCount - docFieldFreq + 0.5) / (docFieldFreq + 0.5));

        return sumScore + bm25Ranking({ idf, freq, dl, avgdl });
      }, 0);

      return docsWithScore.set(docId, score * boost);
    }, Map());
  }

  #calculate = (clause = {}, docIdsMustAppear, isNested = false) => {
    const { match, nested, bool, functionScore } = clause;

    if (match) {
      if (isNested) {
        return this.#calculateNestedScore(match, docIdsMustAppear);
      }

      return this.#calculateScore(match, docIdsMustAppear);
    }

    if (nested) {
      return this.#calculate(nested.query, docIdsMustAppear, true);
    }

    if (functionScore) {
      const { query: functionScoreQuery, scriptScore } = functionScore;
      const scores = this.#calculate(functionScoreQuery, docIdsMustAppear, isNested);

      return scores.map(scriptScore);
    }

    const { must, should } = bool;

    const docScoreIndex = must.reduce((accDocScore, _clause) => {
      const docScore = this.#calculate(_clause, docIdsMustAppear, isNested);

      return docScore.reduce((accScore, score, docId) => (
        accScore.update(docId, 0, currentScore => currentScore + score)
      ), accDocScore || Map());
    }, null);

    return should.reduce((accDocScore, _clause) => {
      const docScore = this.#calculate(_clause, docIdsMustAppear, isNested);

      return docScore.reduce((accScore, score, docId) => (
        accScore.update(docId, 0, currentScore => currentScore + score)
      ), accDocScore);
    }, docScoreIndex || Map());
  }
}

module.exports = ElasticLike;
