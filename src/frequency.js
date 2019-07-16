/**
 * Created by ngnhat on Sat May 25 2019
 */
const { List, Map, Set } = require('immutable');

class Frequency {
  #docIdTermsIndex = Map();

  #termDocIdsIndex = Map();

  #fieldCountIndex = Map();

  #fieldLengthIndex = Map();

  add(id, field, termsIndex) {
    const isNested = List.isList(termsIndex);
    const listTerms = isNested ? termsIndex : List([termsIndex]);

    listTerms.forEach((nestedTerm, index) => {
      const termsLength = nestedTerm.reduce((length, count) => length + count, 0);

      this.#docIdTermsIndex = this.#docIdTermsIndex
        .updateIn([field, id, 'terms'], Map(), tokens => (
          nestedTerm.reduce((acc, count, token) => {
            if (isNested) {
              return acc
                .updateIn([token, 'count'], 0, totalCount => totalCount + count)
                .updateIn([token, 'indexs'], Set(), indexs => indexs.add(index));
            }

            return acc
              .updateIn([token, 'count'], 0, totalCount => totalCount + count);
          }, tokens)
        ))
        .updateIn([field, id, 'termsLength'], 0, oldLength => oldLength + termsLength);

      this.#fieldLengthIndex = this.#fieldLengthIndex
        .update(field, 0, length => length + termsLength);
      this.#fieldCountIndex = this.#fieldCountIndex
        .update(field, 0, count => count + (termsLength ? 1 : 0));

      this.#termDocIdsIndex = this.#termDocIdsIndex.update(field, Map(), tokenDocIds => (
        nestedTerm.reduce((acc, _, _term) => (
          acc.update(_term, Set(), listIds => listIds.add(id))
        ), tokenDocIds)
      ));
    });
  }

  delete(id) {
    if (!id) { return false; }

    this.#docIdTermsIndex = this.#docIdTermsIndex.map((docIdTokens, field) => {
      const tokens = docIdTokens.getIn([id, 'terms'], []);
      const termsLength = docIdTokens.getIn([id, 'termsLength'], 0);

      this.#termDocIdsIndex = tokens.reduce((acc, _, token) => {
        const newAcc = acc.deleteIn([field, token, id]);
        const currentTokenDocIds = newAcc.getIn([field, token]);

        if (!currentTokenDocIds.count()) {
          return newAcc.deleteIn([field, token]);
        }

        return newAcc;
      }, this.#termDocIdsIndex);

      this.#fieldCountIndex = this.#fieldCountIndex
        .update(field, 0, value => Math.max(value - 1, 0));

      this.#fieldLengthIndex = this.#fieldLengthIndex
        .update(field, 0, value => Math.max(value - termsLength, 0));

      return docIdTokens.delete(id);
    });

    return true;
  }

  getFieldCount(field) {
    return this.#fieldCountIndex.get(field, 0);
  }

  getAvgdl(field) {
    const docFieldCount = this.#fieldCountIndex.get(field, 0);
    const docFieldLength = this.#fieldLengthIndex.get(field, 0);

    return docFieldLength / Math.max(docFieldCount, 1);
  }

  getIdsByTerm(field, term, count = 0) {
    return this.#termDocIdsIndex
      .getIn([field, term], Set())
      .filter(docId => count <= this.#docIdTermsIndex.getIn([field, docId, 'terms', term, 'count'], 0));
  }

  getNestedIdsByTerm(field, term, count = 0) {
    return this.#termDocIdsIndex
      .getIn([field, term], Set())
      .filter(docId => count <= this.#docIdTermsIndex.getIn([field, docId, 'terms', term, 'count'], 0))
      .reduce((acc, docId) => (
        acc.set(docId, this.#docIdTermsIndex.getIn([field, docId, 'terms', term, 'indexs'], Set()))
      ), Map());
  }

  getDl(id, field) {
    return this.#docIdTermsIndex.getIn([field, id, 'termsLength'], 0);
  }

  getNestedDl(id, field) {
    return this.#docIdTermsIndex.getIn([field, id, 'termsLength'], 0) / this.#docIdTermsIndex.getIn([field, id, 'terms'], Map()).count();
  }

  getFreq(id, field, term) {
    return this.#docIdTermsIndex.getIn([field, id, 'terms', term, 'count'], 0);
  }

  getFieldFreq(field, term) {
    return this.#termDocIdsIndex.getIn([field, term], Set()).count();
  }
}

module.exports = Frequency;
