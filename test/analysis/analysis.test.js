/**
 * Created by ngnhat on Mon July 15 2019
 */
const Store = require('../../index');

const store = new Store({
  analysis: {
    tokenizer: {
      edge_ngram_tokenizer: {
        min_gram: 3,
        max_gram: 10,
        type: 'edge_ngram',
        token_chars: ['letter', 'digit', 'whitespace'],
      },
    },
    analyzer: {
      edge_ngram_analyzer: {
        tokenizer: 'edge_ngram_tokenizer',
      },
    },
  },
  mapping: {
    code: { type: 'text', analyzer: 'standard' },
    name: { type: 'text', analyzer: 'standard' },
  },
});

store.add(1, { id: 1, name: 'aaabbbccc' });
store.add(2, { id: 2, name: 'ddd eee fff' });

describe('analysis', () => {
  it('normal analysis', () => {
    expect(store.search({
      match: { query: 'bbc', field: 'name' },
    })).toEqual([{
      score: 1,
      source: {
        id: 1,
        name: 'aaa bbb ccc',
      },
    }]);
  });
});
