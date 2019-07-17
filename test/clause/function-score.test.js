/**
 * Created by ngnhat on Thu July 11 2019
 */
const Store = require('../../src');

const store = new Store({
  mapping: {
    code: { type: 'text', analyzer: 'standard' },
    name: { type: 'text', analyzer: 'standard' },
  },
});

store.add(1, { id: 1, code: 'code 001', name: 'aaa bbb ccc' });
store.add(2, { id: 2, code: 'code 002', name: 'ddd eee fff' });

describe('function score', () => {
  it('without function', () => {
    expect(store.search({
      match: { query: 'code 001', field: 'code' },
    })).toEqual([{
      score: 0.8754687373538999,
      source: {
        code: 'code 001',
        id: 1,
        name: 'aaa bbb ccc',
      },
    }]);
  });

  it('with function', () => {
    expect(store.search({
      functionScore: {
        query: {
          match: { query: 'code 001', field: 'code' },
        },
        scriptScore: score => (2 - 1 / (score + 1)),
      },
    })).toEqual([{
      score: 1.4667999630796829,
      source: {
        code: 'code 001',
        id: 1,
        name: 'aaa bbb ccc',
      },
    }]);
  });
});
