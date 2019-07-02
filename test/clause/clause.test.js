const Store = require('../../index');

const store = new Store({
  docKey: 'id',
  mapping: {
    code: { type: 'text', analyzer: 'standard' },
    name: { type: 'text', analyzer: 'standard' },
  },
});

store.add({ id: 1, code: 'code 001', name: 'aaa bbb ccc' });
store.add({ id: 2, code: 'code 002', name: 'ddd eee fff' });

describe('clauses', () => {
  it('simple match clause', () => {
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

  it('simple bool clause: must', () => {
    expect(store.search({
      bool: {
        must: [
          { match: { query: '001', field: 'code' } },
          { match: { query: 'code', field: 'code' } },
        ],
      },
    })).toEqual([{
      score: 0.8754687373538999,
      source: {
        code: 'code 001',
        id: 1,
        name: 'aaa bbb ccc',
      },
    }]);
  });

  it('simple bool clause: must and should', () => {
    expect(store.search({
      bool: {
        must: [
          { match: { query: 'code', field: 'code' } },
        ],
        should: [
          { match: { query: 'aaa ccc', field: 'name' } },
        ],
      },
    })).toEqual([{
      score: 1.5686159179138452,
      source: {
        code: 'code 001',
        id: 1,
        name: 'aaa bbb ccc',
      },
    }]);
  });
});
