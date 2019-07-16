/**
 * Created by ngnhat on Mon July 15 2019
 */
const Store = require('../../src');

const store = new Store({
  analysis: {
    tokenizer: {
      ngram_tokenizer: {
        min_gram: 3,
        max_gram: 10,
        type: 'ngram',
        token_chars: ['letter', 'digit', 'whitespace'],
      },
    },
    analyzer: {
      ngram_analyzer: {
        tokenizer: 'ngram_tokenizer',
      },
    },
  },
  mapping: {
    name: { type: 'text', analyzer: 'ngram_analyzer' },
  },
});

store.add(1, { id: 1, name: 'aaabbbccc' });
store.add(2, { id: 2, name: 'ddd eee fff' });

describe('analysis', () => {
  it('normal analysis', () => {
    expect(store.search({
      match: { query: 'bbc', field: 'name' },
    })).toEqual([{
      score: 0.7624618986159398,
      source: {
        id: 1,
        name: 'aaabbbccc',
      },
    }]);
  });
});
